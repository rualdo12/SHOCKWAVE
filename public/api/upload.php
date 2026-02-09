<?php
// Hardened upload endpoint with early diagnostics. Keep this in place until uploads succeed.
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

try {
    // Basic CORS
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        exit;
    }
    header('Access-Control-Allow-Origin: *');

    // Determine upload dir
    $uploadDir = realpath(__DIR__ . '/../uploads');
    if (!$uploadDir) {
        $pathToCreate = __DIR__ . '/../uploads';
        @mkdir($pathToCreate, 0755, true);
        $uploadDir = realpath($pathToCreate);
    }

    // Local temp dir under uploads to avoid host temp issues
    $localTmp = __DIR__ . '/../uploads/tmp';
    if (!is_dir($localTmp)) {
        @mkdir($localTmp, 0755, true);
    }
    if (is_dir($localTmp) && is_writable($localTmp)) {
        ini_set('upload_tmp_dir', realpath($localTmp));
    }
    $tmpDir = ini_get('upload_tmp_dir') ?: sys_get_temp_dir();

    // No file? Return diagnostics.
    if (!isset($_FILES['file'])) {
        echo json_encode([
            'status' => 'no_file',
            'upload_dir' => $uploadDir,
            'upload_dir_writable' => $uploadDir && is_writable($uploadDir),
            'tmp_dir' => $tmpDir,
            'tmp_dir_writable' => is_writable($tmpDir),
        ]);
        exit;
    }

    // Validate upload
    $file = $_FILES['file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'upload_error', 'code' => $file['error']]);
        exit;
    }
    if ($file['size'] > 4 * 1024 * 1024) {
        http_response_code(400);
        echo json_encode(['error' => 'File too large (max 4MB)']);
        exit;
    }

    // Mime check
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    $allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($mime, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid file type']);
        exit;
    }

    if (!$uploadDir) {
        http_response_code(500);
        echo json_encode(['error' => 'Upload directory not available']);
        exit;
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeName = preg_replace('/[^a-zA-Z0-9-_\\.]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
    $filename = $safeName . '-' . time() . '.' . $ext;
    $target = $uploadDir . DIRECTORY_SEPARATOR . $filename;

    $tmpName = $file['tmp_name'];
    $targetDirWritable = is_writable($uploadDir);
    $tmpReadable = is_readable($tmpName);
    $tmpDir = dirname($tmpName);
    $tmpDirWritable = is_writable($tmpDir);

    if (!move_uploaded_file($tmpName, $target)) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Could not save file',
            'debug' => [
                'upload_dir' => $uploadDir,
                'target' => $target,
                'upload_dir_writable' => $targetDirWritable,
                'tmp_name' => $tmpName,
                'tmp_dir' => $tmpDir,
                'tmp_dir_writable' => $tmpDirWritable,
                'tmp_readable' => $tmpReadable,
            ],
        ]);
        exit;
    }

    // Success
    $publicUrl = '/uploads/' . $filename;
    echo json_encode(['url' => $publicUrl]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'exception', 'message' => $e->getMessage()]);
}
