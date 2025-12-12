<?php
// Direct MySQL connection using procedural approach

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "salon_management";

// Create connection using MySQLi procedural approach
$conn = mysqli_connect($servername, $username, $password, $dbname);

// Check connection
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

echo "Connected successfully\n";

// Create sitting_redemptions table
$sql = "CREATE TABLE IF NOT EXISTS sitting_redemptions (
    id VARCHAR(50) PRIMARY KEY,
    customer_package_id VARCHAR(50) NOT NULL,
    staff_id VARCHAR(50),
    staff_name VARCHAR(100),
    redemption_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_package_id) REFERENCES customer_sittings_packages(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    INDEX idx_customer_package_id (customer_package_id),
    INDEX idx_staff_id (staff_id),
    INDEX idx_redemption_date (redemption_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

if (mysqli_query($conn, $sql)) {
    echo "Table sitting_redemptions created successfully\n";
} else {
    echo "Error creating table: " . mysqli_error($conn) . "\n";
}

// Add additional columns for invoice data
$alterSql = "ALTER TABLE sitting_redemptions 
ADD COLUMN IF NOT EXISTS invoice_data LONGTEXT,
ADD COLUMN IF NOT EXISTS outlet_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS customer_mobile VARCHAR(15),
ADD COLUMN IF NOT EXISTS service_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS service_value DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS package_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS total_sittings INT,
ADD COLUMN IF NOT EXISTS used_sittings INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS remaining_sittings INT,
ADD COLUMN IF NOT EXISTS assigned_date DATE,
ADD COLUMN IF NOT EXISTS initial_staff_name VARCHAR(100)";

if (mysqli_query($conn, $alterSql)) {
    echo "Additional columns added successfully\n";
} else {
    echo "Error adding columns: " . mysqli_error($conn) . "\n";
}

// Add foreign key constraint
$fkSql = "ALTER TABLE sitting_redemptions 
ADD CONSTRAINT IF NOT EXISTS fk_sitting_redemptions_outlet 
FOREIGN KEY (outlet_id) REFERENCES outlets(id)";

// This might fail if the constraint already exists, so we won't check for errors

// Add indexes
$indexSql = "ALTER TABLE sitting_redemptions 
ADD INDEX IF NOT EXISTS idx_outlet_id (outlet_id),
ADD INDEX IF NOT EXISTS idx_customer_name (customer_name),
ADD INDEX IF NOT EXISTS idx_customer_mobile (customer_mobile),
ADD INDEX IF NOT EXISTS idx_service_name (service_name),
ADD INDEX IF NOT EXISTS idx_package_name (package_name)";

if (mysqli_query($conn, $indexSql)) {
    echo "Indexes added successfully\n";
} else {
    echo "Error adding indexes: " . mysqli_error($conn) . "\n";
}

mysqli_close($conn);
echo "Process completed\n";
?>