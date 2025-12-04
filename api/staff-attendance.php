<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Start session FIRST
session_start();

require_once __DIR__ . '/helpers/functions.php';
require_once __DIR__ . '/config/database.php';

// CORS headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://127.0.0.1:5173');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get database connection
$pdo = getDBConnection();

// Check authentication
$userOutletId = null;
$userId = null;

if (!empty($_SESSION['user_id'])) {
    // Session authenticated
    $userId = $_SESSION['user_id'];
    $userOutletId = $_SESSION['outlet_id'] ?? null;
    error_log('[ATTENDANCE] Session auth - User: ' . $userId . ', Outlet: ' . $userOutletId);
} else {
    // Try JWT token
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$authHeader && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
    
    if (!$authHeader) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized: Missing authentication token']);
        exit();
    }
    
    if (!preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized: Invalid token format']);
        exit();
    }
    
    error_log('[ATTENDANCE] Token auth - Token: ' . substr($matches[1], 0, 20) . '...');
}

if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized: Unable to determine user']);
    exit();
}

$action = $_GET['action'] ?? (getRequestData()['action'] ?? null);
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'POST') {
        $data = getRequestData();
        $action = $data['action'] ?? 'record';

        if ($action === 'record') {
            recordAttendance($pdo, $data, $userOutletId);
        } else {
            sendError('Invalid action', 400);
        }
    } elseif ($method === 'GET') {
        if ($action === 'list') {
            getAttendanceRecords($pdo, $_GET['date'] ?? null, $_GET['staffId'] ?? null, $userOutletId);
        } elseif ($action === 'history') {
            getAttendanceHistory($pdo, $_GET['staffId'] ?? null, $_GET['startDate'] ?? null, $_GET['endDate'] ?? null, $userOutletId);
        } else {
            sendError('Invalid action', 400);
        }
    } else {
        sendError('Method not allowed', 405);
    }
} catch (PDOException $e) {
    error_log('Staff Attendance Database Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit();
} catch (Exception $e) {
    error_log('Staff Attendance Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit();
}

function recordAttendance($pdo, $data, $userOutletId) {
    if (!isset($data['records'])) {
        throw new Exception('No attendance records provided');
    }

    $records = $data['records'];
    if (!is_array($records) || empty($records)) {
        throw new Exception('Attendance records must be a non-empty array');
    }

    try {
        $pdo->beginTransaction();

        foreach ($records as $record) {
            if (!isset($record['staffId']) || !isset($record['date']) || !isset($record['status'])) {
                throw new Exception('Missing required fields in attendance record');
            }

            $staffId = $record['staffId'];
            $date = $record['date'];
            $status = $record['status'];
            $otHours = isset($record['otHours']) ? (float)$record['otHours'] : 0;

            // Validate status
            $validStatuses = ['Present', 'Week Off', 'Leave'];
            if (!in_array($status, $validStatuses)) {
                throw new Exception('Invalid status: ' . $status);
            }

            // Validate date format
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Invalid date format');
            }

            // Verify staff exists and is active
            $stmt = $pdo->prepare('
                SELECT id, name, outlet_id, active FROM staff WHERE id = ? LIMIT 1
            ');
            $stmt->execute([$staffId]);
            $staff = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$staff) {
                throw new Exception('Staff member not found: ' . $staffId);
            }

            if (!$staff['active']) {
                throw new Exception('Staff member is inactive: ' . $staff['name']);
            }

            // Check outlet match - REQUIRED for security
            if ($userOutletId && $staff['outlet_id'] && $staff['outlet_id'] !== $userOutletId) {
                throw new Exception('Unauthorized: Staff belongs to different outlet');
            }
            
            // If staff has no outlet assigned, assign user's outlet
            if (!$staff['outlet_id'] && $userOutletId) {
                $updateStmt = $pdo->prepare('UPDATE staff SET outlet_id = ? WHERE id = ?');
                $updateStmt->execute([$userOutletId, $staffId]);
            }

            // Generate unique ID for new records
            $recordId = uniqid('att_') . bin2hex(random_bytes(4));

            // Check if attendance already exists for this date
            $stmt = $pdo->prepare('
                SELECT id FROM staff_attendance 
                WHERE staff_id = ? AND attendance_date = ? LIMIT 1
            ');
            $stmt->execute([$staffId, $date]);
            $existing = $stmt->fetch();

            if ($existing) {
                // Update existing record
                $stmt = $pdo->prepare('
                    UPDATE staff_attendance 
                    SET status = ?, ot_hours = ?, updated_at = NOW() 
                    WHERE staff_id = ? AND attendance_date = ?
                ');
                $stmt->execute([$status, $otHours, $staffId, $date]);
            } else {
                // Insert new record
                $stmt = $pdo->prepare('
                    INSERT INTO staff_attendance (
                        id, staff_id, attendance_date, status, ot_hours, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                ');
                $stmt->execute([$recordId, $staffId, $date, $status, $otHours]);
            }
        }

        $pdo->commit();
        sendJSON([
            'success' => true,
            'message' => 'Attendance recorded successfully',
            'count' => count($records)
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function getAttendanceRecords($pdo, $date = null, $staffId = null, $userOutletId) {
    $query = 'SELECT 
        sa.id, 
        sa.staff_id, 
        sa.attendance_date, 
        sa.status, 
        COALESCE(sa.ot_hours, 0) as ot_hours,
        s.name as staff_name,
        s.phone
    FROM staff_attendance sa
    JOIN staff s ON sa.staff_id = s.id
    WHERE 1=1';

    $params = [];

    if ($date) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            throw new Exception('Invalid date format');
        }
        $query .= ' AND sa.attendance_date = ?';
        $params[] = $date;
    }

    if ($staffId) {
        $query .= ' AND sa.staff_id = ?';
        $params[] = $staffId;
    }

    if ($userOutletId) {
        $query .= ' AND s.outlet_id = ?';
        $params[] = $userOutletId;
    }

    $query .= ' ORDER BY sa.attendance_date DESC, s.name ASC';

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendJSON($records);
}

function getAttendanceHistory($pdo, $staffId = null, $startDate = null, $endDate = null, $userOutletId) {
    if (!$staffId) {
        throw new Exception('Staff ID is required');
    }

    // Verify staff exists
    $stmt = $pdo->prepare('
        SELECT id, name, outlet_id FROM staff WHERE id = ? LIMIT 1
    ');
    $stmt->execute([$staffId]);
    $staff = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$staff) {
        throw new Exception('Staff member not found');
    }

    if ($userOutletId && $staff['outlet_id'] !== $userOutletId) {
        throw new Exception('Unauthorized: Staff belongs to different outlet');
    }

    $query = 'SELECT 
        attendance_date, 
        status, 
        COALESCE(ot_hours, 0) as ot_hours,
        created_at, 
        updated_at
    FROM staff_attendance 
    WHERE staff_id = ?';

    $params = [$staffId];

    if ($startDate) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
            throw new Exception('Invalid start date format');
        }
        $query .= ' AND attendance_date >= ?';
        $params[] = $startDate;
    }

    if ($endDate) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
            throw new Exception('Invalid end date format');
        }
        $query .= ' AND attendance_date <= ?';
        $params[] = $endDate;
    }

    $query .= ' ORDER BY attendance_date DESC';

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calculate summary
    $summary = [
        'staff_id' => $staffId,
        'staff_name' => $staff['name'],
        'total_records' => count($records),
        'present_count' => 0,
        'week_off_count' => 0,
        'leave_count' => 0
    ];

    foreach ($records as $record) {
        if ($record['status'] === 'Present') {
            $summary['present_count']++;
        } elseif ($record['status'] === 'Week Off') {
            $summary['week_off_count']++;
        } elseif ($record['status'] === 'Leave') {
            $summary['leave_count']++;
        }
    }

    sendJSON([
        'summary' => $summary,
        'records' => $records
    ]);
}
