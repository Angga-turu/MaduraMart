// Database MaduraMart di browser (IndexedDB).
// Semua data aplikasi disimpan lewat file ini, jadi kalau nanti ingin pindah
// ke database online (misalnya Supabase), cukup ganti isi file ini.
var MaduraDB = (function () {
  var NAMA_DB = 'maduramart_db';
  var VERSI = 2;
  var GARAM = 'maduramart-v1';
  var koneksi = null;

  var DATA_AWAL = {
    id: 1,
    nama_aplikasi: 'MaduraMart',
    slogan: 'Catat penjualan dengan rapi',
    durasi_loading: 4000 // milidetik
  };

  // Sandi disimpan sebagai hash (SHA-256), bukan teks asli
  var ADMIN_AWAL = {
    username: 'admin',
    sandi_hash: 'e66129f67ab0ad2d39db53e33c362d08b8e5c2f7de0e5febf5ade7ffdfdafb26',
    peran: 'admin'
  };

  function buka() {
    return new Promise(function (selesai, gagal) {
      if (!window.indexedDB) { gagal(new Error('IndexedDB tidak didukung')); return; }
      var req = indexedDB.open(NAMA_DB, VERSI);
      req.onupgradeneeded = function () {
        var db = req.result;
        // Tabel (object store) dibuat di sini; tabel baru ditambah per fitur
        if (!db.objectStoreNames.contains('pengaturan')) db.createObjectStore('pengaturan', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('pengguna')) db.createObjectStore('pengguna', { keyPath: 'username' });
        if (!db.objectStoreNames.contains('sesi')) db.createObjectStore('sesi', { keyPath: 'id' });
      };
      req.onsuccess = function () {
        // Lepaskan koneksi jika tab lain butuh memperbarui database
        req.result.onversionchange = function () { req.result.close(); };
        selesai(req.result);
      };
      req.onerror = function () { gagal(req.error); };
      req.onblocked = function () { gagal(new Error('Database diblokir tab lain, tutup tab MaduraMart yang lain')); };
    });
  }

  function jalankan(tabel, mode, aksi, hasilDariReq) {
    return new Promise(function (selesai, gagal) {
      var tx = koneksi.transaction(tabel, mode);
      var req = aksi(tx.objectStore(tabel));
      tx.oncomplete = function () { selesai(hasilDariReq ? req.result : undefined); };
      tx.onerror = function () { gagal(tx.error); };
    });
  }

  function ambil(tabel, kunci) { return jalankan(tabel, 'readonly', function (s) { return s.get(kunci); }, true); }
  function simpan(tabel, data) { return jalankan(tabel, 'readwrite', function (s) { return s.put(data); }).then(function () { return data; }); }
  function hapus(tabel, kunci) { return jalankan(tabel, 'readwrite', function (s) { return s.delete(kunci); }); }

  function hash(username, sandi) {
    var bytes = new TextEncoder().encode(GARAM + sandi);
    return crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  // Membuka database dan mengisi data awal (pengaturan + akun admin) jika masih kosong
  function siapkan() {
    return buka().then(function (db) {
      koneksi = db;
      return ambil('pengaturan', 1);
    }).then(function (data) {
      return data || simpan('pengaturan', DATA_AWAL);
    }).then(function (pengaturan) {
      return ambil('pengguna', ADMIN_AWAL.username).then(function (admin) {
        return admin || simpan('pengguna', ADMIN_AWAL);
      }).then(function () { return pengaturan; });
    });
  }

  // Login: cocokkan nama pengguna dan sandi, lalu simpan sesi di database
  function masuk(username, sandi) {
    username = String(username || '').trim().toLowerCase();
    return Promise.all([ambil('pengguna', username), hash(username, sandi)]).then(function (h) {
      if (!h[0] || h[0].sandi_hash !== h[1]) return false;
      return simpan('sesi', { id: 1, username: username, masuk_pada: new Date().toISOString() })
        .then(function () { return true; });
    });
  }

  // Mengembalikan data sesi jika pengguna masih login, atau null
  function sesiAktif() {
    return ambil('sesi', 1).then(function (sesi) {
      if (!sesi) return null;
      return ambil('pengguna', sesi.username).then(function (u) { return u ? sesi : null; });
    });
  }

  function keluar() { return hapus('sesi', 1); }

  return { siapkan: siapkan, masuk: masuk, sesiAktif: sesiAktif, keluar: keluar };
})();
