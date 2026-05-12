<?php
function get_pdo(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfg = require __DIR__ . '/config.php';
    $port = isset($cfg['port']) ? ';port=' . $cfg['port'] : '';
    $dsn = "mysql:host={$cfg['host']}{$port};dbname={$cfg['db']};charset={$cfg['charset']}";
    $opt = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], $opt);
    return $pdo;
}

function json_out($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    echo json_encode($data);
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    json_out(['ok' => true]);
    exit;
}

