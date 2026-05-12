<?php
// Database configuration with Railway support
if (!empty($_ENV['DATABASE_URL'])) {
    // Parse Railway's DATABASE_URL format: mysql://user:password@host:port/database
    $url = parse_url($_ENV['DATABASE_URL']);
    return [
        'host' => $url['host'],
        'port' => $url['port'] ?? 3306,
        'db' => ltrim($url['path'], '/'),
        'user' => $url['user'],
        'pass' => $url['pass'] ?? '',
        'charset' => 'utf8mb4'
    ];
}

// Fallback to local development settings
return [
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'port' => getenv('DB_PORT') ?: 3306,
    'db' => getenv('DB_NAME') ?: 'zonevault',
    'user' => getenv('DB_USER') ?: 'root',
    'pass' => getenv('DB_PASS') ?: '',
    'charset' => 'utf8mb4'
];

