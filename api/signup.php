<?php
// Set CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
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
    $name = trim($input['name'] ?? '');
    $email = strtolower(trim($input['email'] ?? ''));
    $phone = trim($input['phone'] ?? '');
    $password = $input['password'] ?? '';
    $zone = trim($input['zone'] ?? '');
    
    if (!$name || !$email || !$phone || !$password || !$zone) {
        json_out(['error' => 'Missing fields'], 400);
    }
    
    // Direct database connection
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=zonevault;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
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
    
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        json_out(['error' => 'User already exists'], 409);
    }
    
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $isAdmin = ($email === 'admin@zonevault.local') ? 1 : 0;
    $stmt = $pdo->prepare('INSERT INTO users (name, email, phone, password_hash, zone, is_admin) VALUES (?,?,?,?,?,?)');
    $stmt->execute([$name, $email, $phone, $hash, $zone, $isAdmin]);
    json_out(['success' => true]);
    
} catch (Exception $e) {
    json_out(['error' => 'Server error: ' . $e->getMessage()], 500);
}

