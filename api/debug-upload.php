<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "<pre>";
echo "upload_tmp_dir: " . (ini_get('upload_tmp_dir') ?: '[default]') . PHP_EOL;
echo "temp dir writable? ";
$tmp = ini_get('upload_tmp_dir') ?: sys_get_temp_dir();
echo (is_writable($tmp) ? "yes ($tmp)" : "no ($tmp)") . PHP_EOL;

echo "uploads dir: " . realpath(__DIR__ . '/../uploads') . PHP_EOL;
echo "uploads dir writable? ";
$up = __DIR__ . '/../uploads';
echo (is_writable($up) ? "yes" : "no") . PHP_EOL;

echo "files: ";
print_r($_FILES);
