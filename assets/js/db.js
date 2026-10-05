// Database MaduraMart di browser (IndexedDB).
// Semua data aplikasi disimpan lewat file ini, jadi kalau nanti ingin pindah
// ke database online (misalnya Supabase), cukup ganti isi file ini.
var MaduraDB = (function () {
  var NAMA_DB = 'maduramart_db';
  var VERSI = 1;
  var koneksi = null;

  var DATA_AWAL = {
    id: 1,
    nama_aplikasi: 'MaduraMart',
    slogan: 'Catat penjualan dengan rapi',
    durasi_loading: 4000 // milidetik
  };

  function buka() {
    return new Promise(function (selesai, gagal) {
      if (!window.indexedDB) { gagal(new Error('IndexedDB tidak didukung')); return; }
      var req = indexedDB.open(NAMA_DB, VERSI);
      req.onupgradeneeded = function () {
        var db = req.result;
        // Tabel (object store) dibuat di sini; tabel baru ditambah per fitur
        if (!db.objectStoreNames.contains('pengaturan')) {
          db.createObjectStore('pengaturan', { keyPath: 'id' });
        }
      };
      req.onsuccess = function () { selesai(req.result); };
      req.onerror = function () { gagal(req.error); };
    });
  }

  function ambil(tabel, id) {
    return new Promise(function (selesai, gagal) {
      var req = koneksi.transaction(tabel, 'readonly').objectStore(tabel).get(id);
      req.onsuccess = function () { selesai(req.result); };
      req.onerror = function () { gagal(req.error); };
    });
  }

  function simpan(tabel, data) {
    return new Promise(function (selesai, gagal) {
      var tx = koneksi.transaction(tabel, 'readwrite');
      tx.objectStore(tabel).put(data);
      tx.oncomplete = function () { selesai(data); };
      tx.onerror = function () { gagal(tx.error); };
    });
  }

  // Membuka database dan mengisi data awal jika masih kosong
  function siapkan() {
    return buka().then(function (db) {
      koneksi = db;
      return ambil('pengaturan', 1);
    }).then(function (data) {
      return data || simpan('pengaturan', DATA_AWAL);
    });
  }

  return { siapkan: siapkan, ambil: ambil, simpan: simpan };
})();
