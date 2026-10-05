CREATE DATABASE IF NOT EXISTS kasir_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE kasir_db;

-- Pengaturan umum aplikasi (dibaca oleh tampilan loading)
CREATE TABLE IF NOT EXISTS pengaturan (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nama_aplikasi  VARCHAR(100) NOT NULL,
  slogan         VARCHAR(150) DEFAULT NULL,
  durasi_loading INT UNSIGNED NOT NULL DEFAULT 4000 COMMENT 'dalam milidetik',
  dibuat_pada    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  diubah_pada    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Data awal (hanya diisi jika tabel masih kosong)
INSERT INTO pengaturan (nama_aplikasi, slogan, durasi_loading)
SELECT 'MaduraMart', 'Catat penjualan dengan rapi', 4000
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM pengaturan);
