<?php
require __DIR__ . '/config/koneksi.php';

// Nilai bawaan jika database belum siap
$pengaturan = ['nama_aplikasi' => 'MaduraMart', 'slogan' => '', 'durasi_loading' => 4000];
$statusDb = 'gagal'; // ok | kosong | tabel | gagal

$db = koneksi();
if ($db) {
    try {
        $hasil = $db->query('SELECT nama_aplikasi, slogan, durasi_loading FROM pengaturan ORDER BY id LIMIT 1');
        $baris = $hasil->fetch_assoc();
        if ($baris) {
            $pengaturan = $baris;
            $statusDb = 'ok';
        } else {
            $statusDb = 'kosong';
        }
    } catch (mysqli_sql_exception $e) {
        $statusDb = 'tabel';
    }
    $db->close();
}

$durasi = max(2000, min(15000, (int) $pengaturan['durasi_loading']));
$dataAwal = ['status' => $statusDb, 'durasi' => $durasi];
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= htmlspecialchars($pengaturan['nama_aplikasi']) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/loading.css">
</head>
<body>
  <main class="mesin">
    <div class="celah" aria-hidden="true"></div>
    <div class="jalur">
      <section class="struk">
        <h1><?= htmlspecialchars($pengaturan['nama_aplikasi']) ?></h1>
        <?php if (!empty($pengaturan['slogan'])): ?>
          <p class="slogan"><?= htmlspecialchars($pengaturan['slogan']) ?></p>
        <?php endif; ?>

        <ul id="baris" class="baris"></ul>

        <div class="progres" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="progres">
          <div class="batang"><i id="isi"></i></div>
          <span id="persen">0%</span>
        </div>

        <p id="status" class="status" aria-live="polite">Memuat aplikasi...</p>
        <button id="ulang" class="ulang" type="button" hidden>Coba lagi</button>
      </section>
    </div>
  </main>

  <script id="data-awal" type="application/json"><?= json_encode($dataAwal, JSON_HEX_TAG | JSON_HEX_AMP) ?></script>
  <script src="assets/js/loading.js"></script>
</body>
</html>