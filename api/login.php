<?php
// Set CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Simple error handling function
function json_out($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $email = strtolower(trim($input['email'] ?? ''));
    $password = $input['password'] ?? '';
    
    if (!$email || !$password) {
        json_out(['error' => 'Missing credentials'], 400);
    }
    
    // Check for admin login first
    if ($email === 'admin@zonevault.local' && $password === 'admin123') {
        $token = base64_encode(random_bytes(24));
        json_out(['success' => true, 'user' => [
            'name' => 'Admin User',
            'email' => 'admin@zonevault.local',
            'phone' => '0000000000',
            'zone' => 'admin',
            'is_admin' => true
        ], 'token' => $token]);
    }
    
    // Direct database connection
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=zonevault;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    // Create users table if it doesn't exist
    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        phone VARCHAR(32) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        zone VARCHAR(64) NOT NULL,
        is_admin TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    
    $stmt = $pdo->prepare('SELECT id, name, email, phone, password_hash, zone, is_admin FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_out(['error' => 'Invalid credentials'], 401);
    }
    
    $token = base64_encode(random_bytes(24));
    json_out(['success' => true, 'user' => [
        'name' => $user['name'],
        'email' => $user['email'],
        'phone' => $user['phone'],
        'zone' => $user['zone'],
        'is_admin' => (bool)$user['is_admin']
    ], 'token' => $token]);
    
} catch (Exception $e) {
    json_out(['error' => 'Server error: ' . $e->getMessage()], 500);
}

