<?php
// Pengaturan koneksi database (default XAMPP: user root, tanpa password)
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'kasir_db');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Mengembalikan objek koneksi, atau null jika gagal terhubung
function koneksi(): ?mysqli
{
    try {
        $db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        $db->set_charset('utf8mb4');
        return $db;
    } catch (mysqli_sql_exception $e) {
        return null;
    }
}
