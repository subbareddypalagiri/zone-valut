<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=zonevault;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $input = json_decode(file_get_contents("php://input"), true);
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $address = trim($input['address'] ?? '');
    $lat = $input['lat'] ?? '';
    $lng = $input['lng'] ?? '';
    $icon = $input['icon'] ?? '';
    $alerts = $input['alerts'] ?? '';

    if (!$name || !$lat || !$lng) {
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS zones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        description TEXT,
        address TEXT,
        lat DOUBLE,
        lng DOUBLE,
        icon VARCHAR(50),
        alerts TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $stmt = $pdo->prepare("INSERT INTO zones (name, description, address, lat, lng, icon, alerts)
                           VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$name, $description, $address, $lat, $lng, $icon, $alerts]);

    echo json_encode(['success' => true, 'message' => 'Zone added successfully!']);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
