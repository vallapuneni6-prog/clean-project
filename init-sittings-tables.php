<?php
/**
 * Initialize sittings package tables
 * Run this once to create necessary tables
 * Access: http://localhost/clean-project/init-sittings-tables.php
 */

require_once 'api/config/database.php';
require_once 'api/helpers/functions.php';

try {
    $pdo = getDBConnection();
    echo "Database connection: OK<br><br>";
    
    // Create sittings_packages table
    $sql1 = "CREATE TABLE IF NOT EXISTS `sittings_packages` (
      `id` varchar(50) NOT NULL,
      `name` varchar(100) NOT NULL,
      `paid_sittings` int(11) NOT NULL,
      `free_sittings` int(11) NOT NULL,
      `service_ids` json DEFAULT NULL,
      `service_id` varchar(50) DEFAULT NULL,
      `service_name` varchar(100) DEFAULT NULL,
      `outlet_id` varchar(50) DEFAULT NULL,
      `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
      `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `idx_outlet_id` (`outlet_id`),
      KEY `idx_service_id` (`service_id`),
      CONSTRAINT `sittings_packages_ibfk_1` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
      CONSTRAINT `sittings_packages_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql1);
    echo "✓ sittings_packages table created/verified<br>";
    
    // Create customer_sittings_packages table
    $sql2 = "CREATE TABLE IF NOT EXISTS `customer_sittings_packages` (
      `id` varchar(50) NOT NULL,
      `customer_name` varchar(100) NOT NULL,
      `customer_mobile` varchar(15) NOT NULL,
      `sittings_package_id` varchar(50) NOT NULL,
      `service_id` varchar(50) DEFAULT NULL,
      `service_name` varchar(100) DEFAULT NULL,
      `service_value` decimal(10,2) DEFAULT NULL,
      `outlet_id` varchar(50) NOT NULL,
      `assigned_date` date NOT NULL,
      `total_sittings` int(11) NOT NULL,
      `used_sittings` int(11) DEFAULT 0,
      `initial_staff_id` varchar(50) DEFAULT NULL,
      `initial_staff_name` varchar(100) DEFAULT NULL,
      `initial_sitting_date` date DEFAULT NULL,
      `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
      `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `idx_outlet_id` (`outlet_id`),
      KEY `idx_assigned_date` (`assigned_date`),
      KEY `idx_customer_mobile` (`customer_mobile`),
      KEY `idx_service_id` (`service_id`),
      KEY `idx_sittings_package_id` (`sittings_package_id`),
      CONSTRAINT `customer_sittings_packages_ibfk_1` FOREIGN KEY (`sittings_package_id`) REFERENCES `sittings_packages` (`id`),
      CONSTRAINT `customer_sittings_packages_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
      CONSTRAINT `customer_sittings_packages_ibfk_3` FOREIGN KEY (`initial_staff_id`) REFERENCES `staff` (`id`),
      CONSTRAINT `customer_sittings_packages_ibfk_4` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql2);
    echo "✓ customer_sittings_packages table created/verified<br>";
    
    // Create sitting_redemptions table
    $sql3 = "CREATE TABLE IF NOT EXISTS `sitting_redemptions` (
      `id` varchar(50) NOT NULL,
      `customer_package_id` varchar(50) NOT NULL,
      `staff_id` varchar(50) DEFAULT NULL,
      `staff_name` varchar(100) DEFAULT NULL,
      `redemption_date` date NOT NULL,
      `invoice_data` longtext DEFAULT NULL,
      `outlet_id` varchar(50) DEFAULT NULL,
      `customer_name` varchar(100) DEFAULT NULL,
      `customer_mobile` varchar(15) DEFAULT NULL,
      `service_name` varchar(100) DEFAULT NULL,
      `service_value` decimal(10,2) DEFAULT NULL,
      `package_name` varchar(100) DEFAULT NULL,
      `total_sittings` int(11) DEFAULT NULL,
      `used_sittings` int(11) DEFAULT 1,
      `remaining_sittings` int(11) DEFAULT NULL,
      `assigned_date` date DEFAULT NULL,
      `initial_staff_name` varchar(100) DEFAULT NULL,
      `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `idx_customer_package_id` (`customer_package_id`),
      KEY `idx_staff_id` (`staff_id`),
      KEY `idx_redemption_date` (`redemption_date`),
      KEY `idx_outlet_id` (`outlet_id`),
      CONSTRAINT `sitting_redemptions_ibfk_1` FOREIGN KEY (`customer_package_id`) REFERENCES `customer_sittings_packages` (`id`) ON DELETE CASCADE,
      CONSTRAINT `sitting_redemptions_ibfk_2` FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`),
      CONSTRAINT `sitting_redemptions_ibfk_3` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql3);
    echo "✓ sitting_redemptions table created/verified<br>";
    
    echo "<br><strong>All sittings package tables initialized successfully!</strong>";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "<br>";
    echo "Trace: " . $e->getTraceAsString();
}
?>
