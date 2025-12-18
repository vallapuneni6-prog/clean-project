<?php
// Handle favicon requests gracefully
header('Content-Type: image/x-icon');
header('Cache-Control: public, max-age=604800');

// Try to serve actual favicon
if (file_exists(__DIR__ . '/favicon.ico')) {
    readfile(__DIR__ . '/favicon.ico');
} else {
    // Minimal 1x1 transparent PNG favicon
    $ico = base64_decode('AAABAAEAEBAQAAEABACoBQAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==');
    echo $ico;
}
exit;
?>
