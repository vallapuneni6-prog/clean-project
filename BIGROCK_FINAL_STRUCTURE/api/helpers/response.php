<?php
/**
 * Response helper functions
 */

function sendResponse($data, $statusCode = 200) {
    // Clear any buffered output
    if (ob_get_level()) {
        ob_clean();
    }
    
    // Set proper headers
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    
    // Send JSON response
    echo json_encode($data);
    
    // Stop execution
    exit;
}

function sendError($message, $statusCode = 400, $details = null) {
    $error = ['error' => $message];
    if ($details) {
        $error['details'] = $details;
    }
    sendResponse($error, $statusCode);
}

function sendSuccess($data = [], $statusCode = 200) {
    $response = is_array($data) ? $data : ['data' => $data];
    sendResponse($response, $statusCode);
}
?>
