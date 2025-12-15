<?php
// Enable output buffering to catch any stray output
ob_start();

// Set content type immediately - MUST be first
header('Content-Type: application/json; charset=utf-8');

// Start session before checking authorization
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    // Load dependencies
    require_once __DIR__ . '/config/database.php';
    require_once __DIR__ . '/helpers/auth.php';
    require_once __DIR__ . '/helpers/response.php';

    // Clear any buffered output
    ob_clean();

    $pdo = getDBConnection();
    $user = verifyAuthorization(true); // This will exit if not authorized

    if (!$user || !isset($user['user_id'])) {
        sendResponse(['error' => 'Unauthorized'], 401);
        exit;
    }

    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $outletId = $_GET['outletId'] ?? null;
        $month = $_GET['month'] ?? date('Y-m');

        if (!$outletId) {
            sendResponse(['error' => 'Outlet ID is required'], 400);
            exit;
        }

        try {
            // Verify outlet exists
            $stmt = $pdo->prepare("SELECT id, name FROM outlets WHERE id = ?");
            $stmt->execute([$outletId]);
            $outlet = $stmt->fetch();

            if (!$outlet) {
                sendResponse(['error' => 'Outlet not found'], 404);
                exit;
            }

            // Parse month to get date range
            $startDate = $month . '-01';
            $endDate = date('Y-m-t', strtotime($startDate));

            // Get total invoices for the month
            $stmt = $pdo->prepare("
                SELECT COALESCE(SUM(i.total_amount), 0) as total
                FROM invoices i
                WHERE i.outlet_id = ? AND DATE(i.invoice_date) BETWEEN ? AND ?
            ");
            $stmt->execute([$outletId, $startDate, $endDate]);
            $invoiceData = $stmt->fetch();
            $invoiceTotal = floatval($invoiceData['total'] ?? 0);

            // Get total packages for the month
            // Join with package_templates to get the original package value
            $stmt = $pdo->prepare("
                SELECT COALESCE(SUM(pt.package_value), 0) as total
                FROM customer_packages cp
                LEFT JOIN package_templates pt ON cp.package_template_id = pt.id
                WHERE cp.outlet_id = ? AND DATE(cp.assigned_date) BETWEEN ? AND ?
            ");
            $stmt->execute([$outletId, $startDate, $endDate]);
            $packageData = $stmt->fetch();
            $packageTotal = floatval($packageData['total'] ?? 0);

            $totalIncome = floatval($invoiceTotal) + floatval($packageTotal);

            // Get salaries and incentives from payroll
            $salaries = 0;
            $incentives = 0;
            
            try {
                // Get all active staff for the outlet
                $stmt = $pdo->prepare("
                    SELECT id, salary
                    FROM staff
                    WHERE active = 1 AND outlet_id = ?
                ");
                $stmt->execute([$outletId]);
                $staffList = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($staffList as $staff) {
                    $staffId = $staff['id'];
                    
                    // Get payroll adjustments for incentive
                    $stmt = $pdo->prepare("
                        SELECT 
                            COALESCE(SUM(CASE WHEN type = 'incentive' THEN amount ELSE 0 END), 0) as incentive
                        FROM staff_payroll_adjustments
                        WHERE staff_id = ? AND month = ?
                    ");
                    $stmt->execute([$staffId, $month]);
                    $adjResult = $stmt->fetch(PDO::FETCH_ASSOC);
                    $staffIncentive = floatval($adjResult['incentive'] ?? 0);
                    $incentives += $staffIncentive;
                    
                    // Calculate salary for this staff member
                    // Get pro-rata salary based on attendance and leaves
                    $daysInMonth = (int)date('t', strtotime($startDate));
                    
                    // Count attendance
                    $stmt = $pdo->prepare("
                        SELECT COUNT(*) as present_count
                        FROM staff_attendance
                        WHERE staff_id = ? AND attendance_date BETWEEN ? AND ? AND status IN ('Present', 'Week Off')
                    ");
                    $stmt->execute([$staffId, $startDate, $endDate]);
                    $attendanceResult = $stmt->fetch(PDO::FETCH_ASSOC);
                    $attendanceDays = intval($attendanceResult['present_count'] ?? 0);
                    
                    // Count leave days (weekend leaves count as 2)
                    $stmt = $pdo->prepare("
                        SELECT attendance_date, DAYNAME(attendance_date) as day_name
                        FROM staff_attendance
                        WHERE staff_id = ? AND attendance_date BETWEEN ? AND ? AND status = 'Leave'
                    ");
                    $stmt->execute([$staffId, $startDate, $endDate]);
                    $leaves = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    $leaveDays = 0;
                    foreach ($leaves as $leave) {
                        $dayName = $leave['day_name'];
                        if ($dayName === 'Saturday' || $dayName === 'Sunday') {
                            $leaveDays += 2;
                        } else {
                            $leaveDays += 1;
                        }
                    }
                    
                    // Calculate pro-rata salary
                    $baseSalary = floatval($staff['salary']);
                    $dailyRate = $baseSalary / $daysInMonth;
                    $proRataSalary = ($attendanceDays * $dailyRate) - ($leaveDays * $dailyRate);
                    
                    // Add extra days and subtract advance
                    $stmt = $pdo->prepare("
                        SELECT 
                            COALESCE(SUM(CASE WHEN type = 'extra_days' THEN amount ELSE 0 END), 0) as extra_days,
                            COALESCE(SUM(CASE WHEN type = 'advance' THEN amount ELSE 0 END), 0) as advance
                        FROM staff_payroll_adjustments
                        WHERE staff_id = ? AND month = ?
                    ");
                    $stmt->execute([$staffId, $month]);
                    $adjResult = $stmt->fetch(PDO::FETCH_ASSOC);
                    $extraDays = floatval($adjResult['extra_days'] ?? 0);
                    $advance = floatval($adjResult['advance'] ?? 0);
                    
                    // Get OT amount
                    $stmt = $pdo->prepare("
                        SELECT COALESCE(SUM(ot_hours), 0) as total_ot_hours
                        FROM staff_attendance
                        WHERE staff_id = ? AND attendance_date BETWEEN ? AND ?
                    ");
                    $stmt->execute([$staffId, $startDate, $endDate]);
                    $otResult = $stmt->fetch(PDO::FETCH_ASSOC);
                    $otHours = floatval($otResult['total_ot_hours'] ?? 0);
                    $otAmount = $otHours * 50; // ₹50 per hour
                    
                    // Add manual OT adjustment
                    $stmt = $pdo->prepare("
                        SELECT COALESCE(SUM(CASE WHEN type = 'ot' THEN amount ELSE 0 END), 0) as ot
                        FROM staff_payroll_adjustments
                        WHERE staff_id = ? AND month = ?
                    ");
                    $stmt->execute([$staffId, $month]);
                    $adjResult = $stmt->fetch(PDO::FETCH_ASSOC);
                    $otAdjustment = floatval($adjResult['ot'] ?? 0);
                    $totalOt = $otAmount + $otAdjustment;
                    
                    // Calculate final salary
                    $salaryToCredit = $proRataSalary + $staffIncentive + $totalOt + $extraDays - $advance;
                    $salaries += max(0, $salaryToCredit); // Only add positive amounts
                }
            } catch (Exception $e) {
                // If there's an error calculating payroll, just use 0
                $salaries = 0;
                $incentives = 0;
            }

            // Get outlet expenses from daily expenses for the month
             $outletExpenses = 0;
             try {
                 $stmt = $pdo->prepare("
                     SELECT COALESCE(SUM(expense_amount), 0) as total
                     FROM daily_expenses
                     WHERE outlet_id = ? AND expense_date BETWEEN ? AND ?
                 ");
                 $stmt->execute([$outletId, $startDate, $endDate]);
                 $outletExpensesData = $stmt->fetch();
                 $outletExpenses = floatval($outletExpensesData['total'] ?? 0);
             } catch (Exception $e) {
                 $outletExpenses = 0;
             }

            // Get or create P&L record
            $plRecord = null;
            try {
                $stmt = $pdo->prepare("
                    SELECT * FROM profit_loss
                    WHERE outlet_id = ? AND month = ?
                ");
                $stmt->execute([$outletId, $month]);
                $plRecord = $stmt->fetch(PDO::FETCH_ASSOC);
            } catch (Exception $e) {
                // Table doesn't exist yet, will create on insert
            }

            // Prepare response
            $response = [
                'month' => $month,
                'outletId' => $outletId,
                'outletName' => $outlet['name'],
                'totalIncome' => floatval($totalIncome),
                'rent' => floatval($plRecord ? ($plRecord['rent'] ?? 0) : 0),
                'royalty' => floatval($plRecord ? ($plRecord['royalty'] ?? 0) : 0),
                'salaries' => floatval($salaries),
                'incentives' => floatval($incentives),
                'gst' => floatval($plRecord ? ($plRecord['gst'] ?? 0) : 0),
                'powerBill' => floatval($plRecord ? ($plRecord['power_bill'] ?? 0) : 0),
                'productsBill' => floatval($plRecord ? ($plRecord['products_bill'] ?? 0) : 0),
                'mobileInternet' => floatval($plRecord ? ($plRecord['mobile_internet'] ?? 0) : 0),
                'laundry' => floatval($plRecord ? ($plRecord['laundry'] ?? 0) : 0),
                'marketing' => floatval($plRecord ? ($plRecord['marketing'] ?? 0) : 0),
                'others' => $plRecord ? ($plRecord['others'] ?? '') : '',
                'outletExpenses' => floatval($outletExpenses),
            ];

            sendResponse($response);
        } catch (Exception $e) {
            error_log('Profit & Loss GET error: ' . $e->getMessage());
            sendResponse(['error' => 'Failed to fetch P&L data'], 500);
        }
    } elseif ($method === 'POST') {
        // Update P&L record
        try {
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);

            if (!$data || !isset($data['outletId']) || !isset($data['month'])) {
                sendResponse(['error' => 'Outlet ID and month are required'], 400);
                exit;
            }

            $outletId = $data['outletId'];
            $month = $data['month'];

            // Create table if it doesn't exist
            $createTableSQL = "
            CREATE TABLE IF NOT EXISTS profit_loss (
                id INT AUTO_INCREMENT PRIMARY KEY,
                outlet_id VARCHAR(50) NOT NULL,
                month VARCHAR(7) NOT NULL,
                rent DECIMAL(12, 2) DEFAULT 0,
                royalty DECIMAL(12, 2) DEFAULT 0,
                gst DECIMAL(12, 2) DEFAULT 0,
                power_bill DECIMAL(12, 2) DEFAULT 0,
                products_bill DECIMAL(12, 2) DEFAULT 0,
                mobile_internet DECIMAL(12, 2) DEFAULT 0,
                laundry DECIMAL(12, 2) DEFAULT 0,
                marketing DECIMAL(12, 2) DEFAULT 0,
                others TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_outlet_month (outlet_id, month),
                FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
            )
            ";
            
            $pdo->exec($createTableSQL);

            // Check if record exists
            $stmt = $pdo->prepare("SELECT id FROM profit_loss WHERE outlet_id = ? AND month = ?");
            $stmt->execute([$outletId, $month]);
            $exists = $stmt->fetch();

            if ($exists) {
                // Update existing record
                $updates = [];
                $params = [];
                $fieldMap = [
                    'rent' => 'rent',
                    'royalty' => 'royalty',
                    'gst' => 'gst',
                    'powerBill' => 'power_bill',
                    'productsBill' => 'products_bill',
                    'mobileInternet' => 'mobile_internet',
                    'laundry' => 'laundry',
                    'marketing' => 'marketing',
                    'others' => 'others',
                ];

                foreach ($fieldMap as $key => $dbField) {
                    if (isset($data[$key])) {
                        $updates[] = "$dbField = ?";
                        $params[] = $data[$key];
                    }
                }

                if (empty($updates)) {
                    sendResponse(['error' => 'No fields to update'], 400);
                    exit;
                }

                $params[] = $outletId;
                $params[] = $month;

                $query = "UPDATE profit_loss SET " . implode(', ', $updates) . " WHERE outlet_id = ? AND month = ?";
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
            } else {
                // Insert new record
                $stmt = $pdo->prepare("
                    INSERT INTO profit_loss (outlet_id, month, rent, royalty, gst, power_bill, products_bill, mobile_internet, laundry, marketing, others)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");

                $stmt->execute([
                    $outletId,
                    $month,
                    $data['rent'] ?? 0,
                    $data['royalty'] ?? 0,
                    $data['gst'] ?? 0,
                    $data['powerBill'] ?? 0,
                    $data['productsBill'] ?? 0,
                    $data['mobileInternet'] ?? 0,
                    $data['laundry'] ?? 0,
                    $data['marketing'] ?? 0,
                    $data['others'] ?? '',
                ]);
            }

            sendResponse(['message' => 'P&L record updated successfully'], 200);
        } catch (Exception $e) {
            error_log('Profit & Loss POST error: ' . $e->getMessage());
            sendResponse(['error' => 'Failed to update P&L record'], 500);
        }
    } else {
        sendResponse(['error' => 'Method not allowed'], 405);
    }

} catch (Exception $e) {
    $errorMsg = $e->getMessage();
    
    error_log('Profit & Loss API Fatal Error: ' . $errorMsg);
    
    ob_clean();
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'error' => 'A fatal error occurred'
    ]);
}

ob_end_flush();
?>
