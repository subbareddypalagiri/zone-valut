<?php
/**
 * ZoneVault - Router for Railway Deployment
 * 
 * This script routes requests to the appropriate files and handles the PHP built-in server
 * on Railway. It ensures proper binding to 0.0.0.0 and uses the PORT environment variable.
 */

// Get configuration from environment
$port = (int)($_ENV['PORT'] ?? $_SERVER['SERVER_PORT'] ?? 8080);
$host = $_ENV['RAILWAY_PUBLIC_DOMAIN'] ?? '0.0.0.0';

// Log server startup (visible in Railway logs)
if (php_sapi_name() === 'cli-server') {
    $uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
    
    // Serve static files directly
    if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
        return false; // Let the PHP server serve the static file
    }
    
    // Log requests for debugging
    error_log(sprintf('[%s] %s %s', date('Y-m-d H:i:s'), $_SERVER['REQUEST_METHOD'], $uri));
}

// Route API requests to api directory
$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (strpos($request_uri, '/api/') === 0) {
    // API request - route to api files
    $api_file = __DIR__ . $request_uri;
    
    if (file_exists($api_file) && is_file($api_file)) {
        require $api_file;
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'API endpoint not found']);
        exit;
    }
}

// All other requests go to index.html (SPA)
require __DIR__ . '/index.html';
