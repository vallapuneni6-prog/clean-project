<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

session_start();
require_once __DIR__ . '/helpers/functions.php';
require_once __DIR__ . '/config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://127.0.0.1:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$pdo = getDBConnection();

// Check authentication
$userId = null;
if (!empty($_SESSION['user_id'])) {
    $userId = $_SESSION['user_id'];
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? (getRequestData()['action'] ?? null);
$month = $_GET['month'] ?? null;
$outletId = $_GET['outletId'] ?? null;

try {
    if ($method === 'GET') {
        if (!$month) {
            throw new Exception('Month parameter required');
        }
        
        if (!$outletId) {
            throw new Exception('Outlet parameter required');
        }
        
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            throw new Exception('Invalid month format');
        }
        
        getPayrollData($pdo, $month, $outletId);
    } elseif ($method === 'POST') {
        $data = getRequestData();
        $action = $data['action'] ?? null;
        
        if ($action === 'update') {
            updatePayroll($pdo, $data);
        } else {
            throw new Exception('Invalid action');
        }
    } else {
        throw new Exception('Method not allowed');
    }
} catch (Exception $e) {
    error_log('Payroll Error: ' . $e->getMessage());
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
    exit();
}

function getPayrollData($pdo, $month, $outletId) {
    // Parse month
    list($year, $monthNum) = explode('-', $month);
    $startDate = "$year-$monthNum-01";
    $endDate = date('Y-m-t', strtotime($startDate));
    $daysInMonth = (int)date('t', strtotime($startDate)); // Get actual number of days in month
    
    // Calculate days worked till current date (or end of month if current month)
    $today = new DateTime();
    $endOfMonth = new DateTime($endDate);
    $currentMonth = $year . '-' . $monthNum;
    $todayMonth = $today->format('Y-m');
    
    if ($currentMonth === $todayMonth) {
        // Current month - calculate till today
        $calculationEndDate = min($today, $endOfMonth);
        $daysWorkedTillDate = (int)$calculationEndDate->format('d');
    } else {
        // Past month - use full month
        $daysWorkedTillDate = $daysInMonth;
    }
    
    // Get all active staff for the outlet
    $stmt = $pdo->prepare('
        SELECT id, name, phone, salary
        FROM staff
        WHERE active = 1 AND outlet_id = ?
        ORDER BY name ASC
    ');
    $stmt->execute([$outletId]);
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $payrollData = [];
    
    foreach ($staff as $person) {
        $staffId = $person['id'];
        
        // Count attendance (Present + Week Off, excluding Leave)
        $stmt = $pdo->prepare('
            SELECT 
                COUNT(*) as present_count
            FROM staff_attendance
            WHERE staff_id = ? 
            AND attendance_date BETWEEN ? AND ?
            AND status IN ("Present", "Week Off")
        ');
        $stmt->execute([$staffId, $startDate, $endDate]);
        $attendance = $stmt->fetch(PDO::FETCH_ASSOC)['present_count'];
        
        // Calculate leave days (counting weekend leaves as 2 days)
        $stmt = $pdo->prepare('
            SELECT 
                attendance_date,
                DAYNAME(attendance_date) as day_name
            FROM staff_attendance
            WHERE staff_id = ? 
            AND attendance_date BETWEEN ? AND ?
            AND status = "Leave"
        ');
        $stmt->execute([$staffId, $startDate, $endDate]);
        $leaves = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $totalLeaveDays = 0;
        foreach ($leaves as $leave) {
            $dayName = $leave['day_name'];
            // Count Saturday and Sunday leaves as 2 days each
            if ($dayName === 'Saturday' || $dayName === 'Sunday') {
                $totalLeaveDays += 2;
            } else {
                $totalLeaveDays += 1;
            }
        }
        
        // Calculate OT from attendance records (₹50 per hour)
        $stmt = $pdo->prepare('
            SELECT 
                COALESCE(SUM(ot_hours), 0) as total_ot_hours
            FROM staff_attendance
            WHERE staff_id = ? 
            AND attendance_date BETWEEN ? AND ?
        ');
        $stmt->execute([$staffId, $startDate, $endDate]);
        $otResult = $stmt->fetch(PDO::FETCH_ASSOC);
        $totalOtHours = (float)$otResult['total_ot_hours'] ?? 0;
        $otFromAttendance = $totalOtHours * 50; // ₹50 per hour
        
        // Get payroll adjustments
        $stmt = $pdo->prepare('
            SELECT 
                COALESCE(SUM(CASE WHEN type = "extra_days" THEN amount ELSE 0 END), 0) as extra_days,
                COALESCE(SUM(CASE WHEN type = "ot" THEN amount ELSE 0 END), 0) as ot,
                COALESCE(SUM(CASE WHEN type = "incentive" THEN amount ELSE 0 END), 0) as incentive,
                COALESCE(SUM(CASE WHEN type = "advance" THEN amount ELSE 0 END), 0) as advance
            FROM staff_payroll_adjustments
            WHERE staff_id = ? 
            AND month = ?
        ');
        $stmt->execute([$staffId, $month]);
        $adjustments = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $extraDays = (float)$adjustments['extra_days'] ?? 0;
        $otAdjustment = (float)$adjustments['ot'] ?? 0; // Manual OT adjustment
        $ot = $otFromAttendance + $otAdjustment; // Combined OT (from attendance + manual adjustments)
        $incentive = (float)$adjustments['incentive'] ?? 0;
        $advance = (float)$adjustments['advance'] ?? 0;
        
        // Calculate salary to credit
        $salary = (float)$person['salary'];
        $dailyRate = $salary / $daysInMonth; // Daily rate based on actual days in month
        $proRataSalary = $dailyRate * $daysWorkedTillDate; // Salary calculated till current date
        $leaveDeduction = $totalLeaveDays * $dailyRate; // Deduct based on leave days (counting weekend as 2)
        $salaryToCredit = $proRataSalary + $incentive + $ot + $extraDays - $advance - $leaveDeduction;
        
        $payrollData[] = [
            'staffId' => $staffId,
            'staffName' => $person['name'],
            'phone' => $person['phone'] ?? '',
            'salary' => $salary,
            'attendance' => (int)$attendance,
            'leaves' => $totalLeaveDays,
            'extraDays' => $extraDays,
            'otHours' => $totalOtHours,
            'ot' => $ot,
            'incentive' => $incentive,
            'advance' => $advance,
            'leaveDeduction' => $leaveDeduction,
            'salaryToCredit' => $salaryToCredit
        ];
    }
    
    sendJSON($payrollData);
}

function updatePayroll($pdo, $data) {
    if (!isset($data['month']) || !isset($data['staffId']) || !isset($data['extraDays']) || !isset($data['incentive']) || !isset($data['advance'])) {
        throw new Exception('Missing required fields');
    }
    
    $month = $data['month'];
    $staffId = $data['staffId'];
    $extraDays = (float)$data['extraDays'];
    $incentive = (float)$data['incentive'];
    $advance = (float)$data['advance'];
    
    // Validate month format
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
        throw new Exception('Invalid month format');
    }
    
    try {
        $pdo->beginTransaction();
        
        // Delete existing adjustments for this staff/month (except OT - OT is calculated from attendance)
        $stmt = $pdo->prepare('DELETE FROM staff_payroll_adjustments WHERE staff_id = ? AND month = ? AND type != "ot"');
        $stmt->execute([$staffId, $month]);
        
        // Insert new adjustments (OT is now calculated from attendance, not manually entered)
        $adjustments = [
            ['type' => 'extra_days', 'amount' => $extraDays],
            ['type' => 'incentive', 'amount' => $incentive],
            ['type' => 'advance', 'amount' => $advance]
        ];
        
        $stmt = $pdo->prepare('
            INSERT INTO staff_payroll_adjustments (id, staff_id, month, type, amount, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ');
        
        foreach ($adjustments as $adj) {
            if ($adj['amount'] != 0) {
                $id = uniqid('adj_') . bin2hex(random_bytes(4));
                $stmt->execute([$id, $staffId, $month, $adj['type'], $adj['amount']]);
            }
        }
        
        $pdo->commit();
        
        sendJSON([
            'success' => true,
            'message' => 'Payroll updated successfully'
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}
