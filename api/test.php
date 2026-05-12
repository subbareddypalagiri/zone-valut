<?php
// Simple test API to debug the 500 error
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

try {
    // Test database connection
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=zonevault;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Database connection successful',
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>
