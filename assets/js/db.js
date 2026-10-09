// Database MaduraMart di browser (IndexedDB).
// Semua data aplikasi disimpan lewat file ini, jadi kalau nanti ingin pindah
// ke database online (misalnya Supabase), cukup ganti isi file ini.
var MaduraDB = (function () {
  var NAMA_DB = 'maduramart_db';
  var VERSI = 3;
  var GARAM = 'maduramart-v1';
  var koneksi = null;

  var DATA_AWAL = {
    id: 1,
    nama_aplikasi: 'MaduraMart',
    slogan: 'Catat penjualan dengan rapi',
    durasi_loading: 4000 // milidetik
  };

  // Produk contoh, diisi satu kali agar halaman Kasir bisa dicoba.
  // Setelah halaman Produk dibuat, produk ini bisa diubah atau dihapus.
  var PRODUK_CONTOH = [
    { nama: 'Beras 5 kg', kategori: 'Sembako', harga: 68000, stok: 20 },
    { nama: 'Minyak Goreng 1 L', kategori: 'Sembako', harga: 18000, stok: 25 },
    { nama: 'Gula Pasir 1 kg', kategori: 'Sembako', harga: 17000, stok: 30 },
    { nama: 'Telur Ayam 1 kg', kategori: 'Sembako', harga: 28000, stok: 15 },
    { nama: 'Mie Instan', kategori: 'Makanan', harga: 3500, stok: 100 },
    { nama: 'Kopi Sachet', kategori: 'Minuman', harga: 2000, stok: 80 },
    { nama: 'Teh Botol', kategori: 'Minuman', harga: 6000, stok: 40 },
    { nama: 'Air Mineral 600 ml', kategori: 'Minuman', harga: 3500, stok: 60 },
    { nama: 'Sabun Mandi', kategori: 'Kebutuhan Rumah', harga: 4500, stok: 35 },
    { nama: 'Deterjen 800 g', kategori: 'Kebutuhan Rumah', harga: 17000, stok: 4 }
  ];

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
        if (!db.objectStoreNames.contains('produk')) db.createObjectStore('produk', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('transaksi')) db.createObjectStore('transaksi', { keyPath: 'id', autoIncrement: true });
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
  function semua(tabel) { return jalankan(tabel, 'readonly', function (s) { return s.getAll(); }, true); }
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
      }).then(function () { return isiContoh(pengaturan); });
    });
  }

  // Mengisi produk contoh sekali saja, dan hanya jika tabel produk masih kosong
  function isiContoh(pengaturan) {
    if (pengaturan.contoh_diisi) return Promise.resolve(pengaturan);
    return new Promise(function (selesai, gagal) {
      var tx = koneksi.transaction(['produk', 'pengaturan'], 'readwrite');
      var tabel = tx.objectStore('produk');
      var hitung = tabel.count();
      hitung.onsuccess = function () {
        if (hitung.result === 0) PRODUK_CONTOH.forEach(function (p) { tabel.add(p); });
        pengaturan.contoh_diisi = true;
        tx.objectStore('pengaturan').put(pengaturan);
      };
      tx.oncomplete = function () { selesai(pengaturan); };
      tx.onerror = function () { gagal(tx.error); };
    });
  }

  var TABEL_DATA = ['pengaturan', 'pengguna', 'produk', 'transaksi'];

  function pengaturan() { return ambil('pengaturan', 1); }

  function simpanPengaturan(data) {
    return ambil('pengaturan', 1).then(function (p) {
      return simpan('pengaturan', Object.assign({}, p, data, { id: 1 }));
    });
  }

  function cekSandi(sandi) {
    if (String(sandi || '').length < 6) throw new Error('Kata sandi minimal 6 karakter.');
  }

  // Daftar pengguna tanpa hash sandi
  function daftarPengguna() {
    return semua('pengguna').then(function (l) {
      return l.map(function (u) { return { username: u.username, peran: u.peran || 'kasir', dibuat_pada: u.dibuat_pada || null }; });
    });
  }

  function tambahPengguna(username, sandi, peran) {
    return Promise.resolve().then(function () {
      username = String(username || '').trim().toLowerCase();
      if (!/^[a-z0-9_]{3,20}$/.test(username)) throw new Error('Nama pengguna 3 sampai 20 karakter: huruf kecil, angka, atau garis bawah.');
      cekSandi(sandi);
      if (peran !== 'admin' && peran !== 'kasir') throw new Error('Peran tidak valid.');
      return ambil('pengguna', username);
    }).then(function (ada) {
      if (ada) throw new Error('Nama pengguna sudah dipakai.');
      return hash(username, sandi);
    }).then(function (h) {
      return simpan('pengguna', { username: username, sandi_hash: h, peran: peran, dibuat_pada: new Date().toISOString() });
    });
  }

  function aturSandi(username, sandiBaru) {
    return Promise.resolve().then(function () {
      cekSandi(sandiBaru);
      return Promise.all([ambil('pengguna', username), hash(username, sandiBaru)]);
    }).then(function (r) {
      if (!r[0]) throw new Error('Pengguna tidak ditemukan.');
      r[0].sandi_hash = r[1];
      return simpan('pengguna', r[0]);
    });
  }

  function gantiSandi(username, lama, baru) {
    return Promise.all([ambil('pengguna', username), hash(username, lama)]).then(function (r) {
      if (!r[0] || r[0].sandi_hash !== r[1]) throw new Error('Kata sandi lama salah.');
      return aturSandi(username, baru);
    });
  }

  function hapusPengguna(username) {
    return semua('pengguna').then(function (l) {
      var u = l.filter(function (x) { return x.username === username; })[0];
      if (!u) return;
      var jumlahAdmin = l.filter(function (x) { return x.peran === 'admin'; }).length;
      if (u.peran === 'admin' && jumlahAdmin <= 1) throw new Error('Admin terakhir tidak bisa dihapus.');
      return hapus('pengguna', username);
    });
  }

  function kosongkan(tabel) {
    return new Promise(function (selesai, gagal) {
      var tx = koneksi.transaction(tabel, 'readwrite');
      tabel.forEach(function (t) { tx.objectStore(t).clear(); });
      tx.oncomplete = function () { selesai(); };
      tx.onerror = function () { gagal(tx.error); };
    });
  }
  function hapusTransaksi() { return kosongkan(['transaksi']); }
  // Mengosongkan semuanya; saat aplikasi dibuka lagi, data awal diisi ulang otomatis
  function resetSemua() { return kosongkan(['pengaturan', 'pengguna', 'produk', 'transaksi', 'sesi']); }

  function ekspor() {
    return Promise.all(TABEL_DATA.map(semua)).then(function (h) {
      var o = { aplikasi: 'MaduraMart', versi: 1, dibuat: new Date().toISOString(), data: {} };
      TABEL_DATA.forEach(function (t, i) { o.data[t] = h[i]; });
      return o;
    });
  }

  function impor(o) {
    return Promise.resolve().then(function () {
      if (!o || o.aplikasi !== 'MaduraMart' || !o.data) throw new Error('File ini bukan cadangan MaduraMart.');
      TABEL_DATA.forEach(function (t) { if (!Array.isArray(o.data[t])) throw new Error('Isi cadangan tidak lengkap.'); });
      if (!o.data.pengguna.some(function (u) { return u.peran === 'admin' && u.username && u.sandi_hash; })) throw new Error('Cadangan tidak berisi akun admin.');
      return new Promise(function (selesai, gagal) {
        var tx = koneksi.transaction(TABEL_DATA, 'readwrite');
        TABEL_DATA.forEach(function (t) {
          var tabel = tx.objectStore(t);
          tabel.clear();
          o.data[t].forEach(function (r) { tabel.put(r); });
        });
        tx.oncomplete = function () { selesai(); };
        tx.onabort = tx.onerror = function () { gagal(tx.error || new Error('Cadangan gagal dipulihkan.')); };
      });
    });
  }

  // Menambah produk baru (tanpa id) atau mengubah produk (dengan id)
  function simpanProduk(produk) {
    return new Promise(function (selesai, gagal) {
      if (!String(produk.nama || '').trim()) { gagal(new Error('Nama produk wajib diisi')); return; }
      if (!(produk.harga >= 0) || !(produk.stok >= 0)) { gagal(new Error('Harga dan stok tidak boleh negatif')); return; }
      var tx = koneksi.transaction('produk', 'readwrite');
      var req = tx.objectStore('produk').put(produk);
      tx.oncomplete = function () { produk.id = req.result; selesai(produk); };
      tx.onerror = function () { gagal(tx.error); };
    });
  }

  function hapusProduk(id) { return hapus('produk', id); }

  // Mencatat transaksi dan mengurangi stok dalam satu transaksi database
  // (jika satu langkah gagal, semuanya dibatalkan). Total dihitung dari harga di database.
  function catatTransaksi(data) {
    return new Promise(function (selesai, gagal) {
      if (!data.item.length) { gagal(new Error('Keranjang kosong')); return; }
      var tx = koneksi.transaction(['produk', 'transaksi'], 'readwrite');
      var tProduk = tx.objectStore('produk');
      var galat = null, rec = null, baris = [], tersisa = data.item.length;
      function batal(pesan) { if (!galat) galat = new Error(pesan); tx.abort(); }

      data.item.forEach(function (it) {
        var r = tProduk.get(it.id);
        r.onsuccess = function () {
          var p = r.result;
          if (!p) { batal('Produk tidak ditemukan'); return; }
          if (Number(p.stok) < it.jumlah) { batal('Stok ' + p.nama + ' tidak cukup'); return; }
          p.stok = Number(p.stok) - it.jumlah;
          tProduk.put(p);
          baris.push({ id: p.id, nama: p.nama, harga: p.harga, jumlah: it.jumlah, subtotal: p.harga * it.jumlah });
          if (--tersisa === 0) {
            var total = baris.reduce(function (a, b) { return a + b.subtotal; }, 0);
            if (!(data.bayar >= total)) { batal('Uang yang diterima kurang'); return; }
            rec = { waktu: new Date().toISOString(), kasir: data.kasir, item: baris, total: total, bayar: data.bayar, kembali: data.bayar - total };
            var tambah = tx.objectStore('transaksi').add(rec);
            tambah.onsuccess = function () { rec.id = tambah.result; };
          }
        };
      });
      tx.oncomplete = function () { selesai(rec); };
      tx.onabort = function () { gagal(galat || tx.error || new Error('Transaksi dibatalkan')); };
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
      return ambil('pengguna', sesi.username).then(function (u) {
        return u ? Object.assign({}, sesi, { peran: u.peran || 'kasir' }) : null;
      });
    });
  }

  function keluar() { return hapus('sesi', 1); }

  return { siapkan: siapkan, masuk: masuk, sesiAktif: sesiAktif, keluar: keluar, semua: semua, catatTransaksi: catatTransaksi, simpanProduk: simpanProduk, hapusProduk: hapusProduk,
    pengaturan: pengaturan, simpanPengaturan: simpanPengaturan, daftarPengguna: daftarPengguna, tambahPengguna: tambahPengguna,
    aturSandi: aturSandi, gantiSandi: gantiSandi, hapusPengguna: hapusPengguna, hapusTransaksi: hapusTransaksi,
    resetSemua: resetSemua, ekspor: ekspor, impor: impor };
})();
