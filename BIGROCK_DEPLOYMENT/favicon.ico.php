<?php
// Serve a blank favicon to prevent 500 errors
header('Content-Type: image/x-icon');
header('Content-Length: 0');
http_response_code(204); // No content
exit();
?>