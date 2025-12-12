<?php
// Script to manually apply migrations
// This bypasses the need for PDO MySQL driver by using mysqli

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "salon_management";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "Connected successfully\n";

// Read and execute migration 006
$migration006 = file_get_contents('migrations/006_create_sitting_redemptions_table.sql');
if ($conn->multi_query($migration006)) {
    echo "Migration 006 applied successfully\n";
} else {
    echo "Error applying migration 006: " . $conn->error . "\n";
}

// Close connection to clear multi-query results
$conn->close();

// Reopen connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Read and execute migration 007
$migration007 = file_get_contents('migrations/007_add_invoice_data_to_sitting_redemptions.sql');
if ($conn->multi_query($migration007)) {
    echo "Migration 007 applied successfully\n";
} else {
    echo "Error applying migration 007: " . $conn->error . "\n";
}

$conn->close();
echo "Migration process completed\n";
?>