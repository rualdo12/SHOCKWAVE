<?php
// Minimal Yoco charge proxy for shared hosting / FTP deploys.
// Keep your secret key out of the frontend. Set YOCO_SECRET_KEY in your hosting env
// (or in a PHP include outside public_html) and do NOT hardcode it here.

header('Content-Type: application/json');

// Basic CORS allowance (adjust origin as needed)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}
header('Access-Control-Allow-Origin: *');

// Allow only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? '';
$amount = isset($input['amountInCents']) ? (int)$input['amountInCents'] : 0;
$currency = $input['currency'] ?? 'ZAR';
$description = $input['description'] ?? 'GoToGuys Order';

if (!$token || !$amount) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing token or amount']);
    exit;
}

// Load secret key from environment/config
// Preferred: environment variable
$secret = getenv('YOCO_SECRET_KEY');
// Fallback: include yoco.php where you can manually set $YOCO_SECRET_KEY (kept outside frontend)
if (!$secret) {
    $yocoConfigPath = __DIR__ . '/yoco.php';
    if (file_exists($yocoConfigPath)) {
        include $yocoConfigPath;
        if (isset($YOCO_SECRET_KEY) && $YOCO_SECRET_KEY) {
            $secret = $YOCO_SECRET_KEY;
        }
    }
}
if (!$secret) {
    http_response_code(500);
    echo json_encode(['error' => 'Server missing YOCO_SECRET_KEY']);
    exit;
}

$payload = json_encode([
    'token' => $token,
    'amountInCents' => $amount,
    'currency' => $currency,
    'description' => $description,
]);

$ch = curl_init('https://online.yoco.com/v1/charges'); // Update if Yoco’s endpoint differs
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-Auth-Secret-Key: ' . $secret,
    ],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
]);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($status >= 200 && $status < 300) {
    echo $response;
} else {
    http_response_code(400);
    echo $response ?: json_encode(['error' => 'Yoco charge failed']);
}
