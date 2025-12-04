<?php
// Helper functions

function generateId($prefix = '') {
    return $prefix . uniqid() . bin2hex(random_bytes(4));
}

function sendJSON($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

function sendError($message, $statusCode = 400) {
    http_response_code($statusCode);
    echo json_encode(['error' => $message]);
    exit();
}

function getRequestData() {
    $input = file_get_contents('php://input');
    
    // Handle empty input
    if (empty($input)) {
        return [];
    }
    
    $data = json_decode($input, true);
    
    // Validate JSON
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendError('Invalid JSON format: ' . json_last_error_msg(), 400);
    }
    
    return $data;
}

function validateRequired($data, $fields) {
    foreach ($fields as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            sendError("Field '$field' is required", 400);
        }
    }
}

// New sanitization functions
function sanitizeString($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function validatePhoneNumber($phone) {
    // Remove all non-digit characters
    $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
    
    // Check if it's a valid Indian mobile number (10 digits, starting with 6-9)
    if (preg_match('/^[6-9][0-9]{9}$/', $cleanPhone)) {
        return $cleanPhone;
    }
    
    return false;
}

function validateDate($date, $format = 'Y-m-d') {
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

// WhatsApp message sending function
function sendWhatsAppMessage($partnerPhone, $voucherData) {
    // Configuration - In a production environment, these would be stored in environment variables
    $whatsappConfig = [
        'provider' => 'twilio', // or 'meta', '360dialog', etc.
        'account_sid' => 'YOUR_TWILIO_ACCOUNT_SID',
        'auth_token' => 'YOUR_TWILIO_AUTH_TOKEN',
        'from_number' => 'YOUR_TWILIO_WHATSAPP_NUMBER',
        'api_url' => 'https://api.twilio.com/2010-04-01/Accounts/'
    ];
    
    // Format the phone number for WhatsApp (add country code)
    $formattedPhone = formatWhatsAppNumber($partnerPhone);
    
    // Create message content
    $message = createVoucherMessage($voucherData);
    
    // Log the attempt
    error_log("Attempting to send WhatsApp message to: " . $formattedPhone);
    error_log("Message content: " . $message);
    
    // Send message based on provider
    switch ($whatsappConfig['provider']) {
        case 'twilio':
            return sendViaTwilio($whatsappConfig, $formattedPhone, $message);
        case 'meta':
            return sendViaMeta($whatsappConfig, $formattedPhone, $message);
        default:
            // Fallback to logging only
            error_log("WHATSAPP MESSAGE TO: " . $formattedPhone);
            error_log("VOUCHER DETAILS: " . json_encode($voucherData));
            error_log("MESSAGE CONTENT: " . $message);
            // Return success for demo purposes
            return true;
    }
}

// Format phone number for WhatsApp API
function formatWhatsAppNumber($phone) {
    // Assuming Indian numbers, add country code
    if (substr($phone, 0, 1) === '0') {
        $phone = substr($phone, 1);
    }
    
    // Add country code if not present
    if (substr($phone, 0, 2) !== '91') {
        $phone = '91' . $phone;
    }
    
    return 'whatsapp:+' . $phone;
}

// Create voucher message content
function createVoucherMessage($voucherData) {
    $message = "🛍️ *New Voucher Issued!*\n\n";
    $message .= "📄 *Voucher ID:* " . $voucherData['id'] . "\n";
    $message .= "👤 *Recipient:* " . $voucherData['recipient_name'] . "\n";
    $message .= "📱 *Mobile:* " . $voucherData['recipient_mobile'] . "\n";
    $message .= "📅 *Expiry Date:* " . date('d-m-Y', strtotime($voucherData['expiry_date'])) . "\n";
    $message .= "🎁 *Discount:* " . $voucherData['discount_percentage'] . "%\n";
    $message .= "🏷️ *Type:* " . $voucherData['type'] . "\n";
    $message .= "🧾 *Bill No:* " . $voucherData['bill_no'] . "\n\n";
    $message .= "Thank you for your partnership! 😊";
    
    return $message;
}

// Send via Twilio WhatsApp API
function sendViaTwilio($config, $to, $message) {
    // In a real implementation, you would use the Twilio SDK or make HTTP requests
    // This is a placeholder showing the structure
    
    $url = $config['api_url'] . $config['account_sid'] . '/Messages.json';
    
    $data = [
        'From' => $config['from_number'],
        'To' => $to,
        'Body' => $message
    ];
    
    // Log what would be sent
    error_log("Twilio API URL: " . $url);
    error_log("Twilio Data: " . json_encode($data));
    
    // In a real implementation:
    /*
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    curl_setopt($ch, CURLOPT_USERPWD, $config['account_sid'] . ':' . $config['auth_token']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode >= 200 && $httpCode < 300) {
        return true;
    } else {
        error_log("Twilio API Error: " . $response);
        return false;
    }
    */
    
    // For demo purposes, return success
    return true;
}

// Send via Meta WhatsApp Business API
function sendViaMeta($config, $to, $message) {
    // Placeholder for Meta API implementation
    error_log("Meta API - To: " . $to);
    error_log("Meta API - Message: " . $message);
    
    // In a real implementation, you would make HTTP requests to Meta's API
    // Return success for demo purposes
    return true;
}