(function () {
  var $ = function (id) { return document.getElementById(id); };
  var STOK_MENIPIS = 5; // produk dengan stok sampai angka ini dihitung menipis

  function rupiah(n) { return 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0); }
  function sama(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function el(tag, teks, kelas) {
    var e = document.createElement(tag);
    if (teks !== undefined) e.textContent = teks;
    if (kelas) e.className = kelas;
    return e;
  }

  // ---------- Notifikasi kecil ----------
  var waktuToast;
  function toast(teks) {
    var t = $('toast');
    t.textContent = teks;
    t.classList.add('tampil');
    clearTimeout(waktuToast);
    waktuToast = setTimeout(function () { t.classList.remove('tampil'); }, 2400);
  }

  // ---------- Laci menu (layar kecil) ----------
  function laci(buka) {
    $('samping').classList.toggle('buka', buka);
    $('tirai').classList.toggle('buka', buka);
  }
  $('buka').addEventListener('click', function () { laci(true); });
  $('tirai').addEventListener('click', function () { laci(false); });

  // Menu yang halamannya belum dibuat
  Array.prototype.forEach.call(document.querySelectorAll('[data-segera]'), function (b) {
    b.addEventListener('click', function () {
      laci(false);
      toast('Halaman ' + b.getAttribute('data-segera') + ' belum tersedia.');
    });
  });

  // Menu yang menuju halaman lain
  Array.prototype.forEach.call(document.querySelectorAll('[data-ke]'), function (b) {
    b.addEventListener('click', function () { window.location.href = b.getAttribute('data-ke'); });
  });

  // ---------- Tanggal dan jam ----------
  function jam() {
    var n = new Date();
    $('tanggal').textContent = n.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('jam').textContent = n.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function sapa(nama) {
    var h = new Date().getHours();
    var waktu = h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam';
    return 'Selamat ' + waktu + ', ' + nama;
  }

  // ---------- Isi dashboard dari database ----------
  function tampilkan(transaksi, produk) {
    var sekarang = new Date();
    var hariIni = transaksi.filter(function (t) { return sama(new Date(t.waktu), sekarang); });
    var menipis = produk.filter(function (p) { return Number(p.stok) <= STOK_MENIPIS; });

    $('penjualan').textContent = rupiah(hariIni.reduce(function (a, t) { return a + (Number(t.total) || 0); }, 0));
    $('jumlah-transaksi').textContent = hariIni.length;
    $('jumlah-produk').textContent = produk.length;
    $('stok-menipis').textContent = menipis.length;

    // Grafik 7 hari
    var hari = [], i;
    for (i = 6; i >= 0; i--) {
      var d = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate() - i);
      var jumlah = transaksi.reduce(function (a, t) {
        return sama(new Date(t.waktu), d) ? a + (Number(t.total) || 0) : a;
      }, 0);
      hari.push({ tgl: d, total: jumlah });
    }
    var maks = Math.max.apply(null, hari.map(function (h) { return h.total; }));
    var totalMinggu = hari.reduce(function (a, h) { return a + h.total; }, 0);
    $('total-minggu').textContent = rupiah(totalMinggu);
    $('catatan-grafik').hidden = totalMinggu > 0;
    hari.forEach(function (h, idx) {
      var kolom = el('div', undefined, 'kolom');
      var batang = el('div', undefined, 'batang' + (idx === 6 ? ' hari-ini' : ''));
      batang.style.height = (maks > 0 ? Math.max(h.total / maks * 100, 2) : 2) + '%';
      batang.title = h.tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) + ': ' + rupiah(h.total);
      kolom.appendChild(batang);
      kolom.appendChild(el('span', h.tgl.toLocaleDateString('id-ID', { weekday: 'short' }), 'hari'));
      $('grafik').appendChild(kolom);
    });

    // Stok menipis
    menipis.slice(0, 6).forEach(function (p) {
      var li = el('li');
      li.appendChild(el('span', p.nama));
      li.appendChild(el('span', 'Sisa ' + p.stok, 'lencana'));
      $('daftar-stok').appendChild(li);
    });
    $('kosong-stok').textContent = produk.length ? 'Semua stok aman.' : 'Belum ada produk. Tambahkan produk dari menu Produk.';
    $('kosong-stok').hidden = menipis.length > 0;

    // Transaksi terakhir
    var terakhir = transaksi.slice().sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); }).slice(0, 5);
    terakhir.forEach(function (t) {
      var tr = el('tr');
      tr.appendChild(el('td', '#' + t.id));
      tr.appendChild(el('td', new Date(t.waktu).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })));
      tr.appendChild(el('td', rupiah(t.total), 'kanan'));
      $('isi-tabel').appendChild(tr);
    });
    $('tabel').hidden = terakhir.length === 0;
    $('kosong').hidden = terakhir.length > 0;
  }

  function gagalMuat(pesan) {
    var p = el('p', pesan);
    p.style.cssText = 'margin:0;padding:24px;font-weight:600';
    document.body.appendChild(p);
  }

  MaduraDB.siapkan().then(function () {
    return MaduraDB.sesiAktif();
  }).then(function (sesi) {
    // Hanya jika memang belum login, pengguna dikirim ke halaman login
    if (!sesi) { window.location.replace('login.html?dari=dashboard'); return; }

    $('pengguna').textContent = sesi.username;
    $('avatar').textContent = sesi.username.charAt(0).toUpperCase();
    var admin = sesi.peran === 'admin';
    Array.prototype.forEach.call(document.querySelectorAll('[data-admin]'), function (b) { b.hidden = !admin; });
    var label = document.querySelector('.profil-teks span');
    if (label) label.textContent = admin ? 'Administrator' : 'Kasir';
    $('sapaan').textContent = sapa(sesi.username);
    jam();
    setInterval(jam, 30000);
    $('app').hidden = false;

    return Promise.all([MaduraDB.semua('transaksi'), MaduraDB.semua('produk')]).then(function (h) {
      tampilkan(h[0], h[1]);
    }).catch(function (galat) {
      console.error(galat);
      toast('Data belum bisa dimuat. Coba muat ulang halaman.');
    });
  }, function (galat) {
    // Database tidak bisa dibuka: tampilkan pesan. Jangan kirim ke login (bisa berputar terus).
    console.error(galat);
    gagalMuat('Database tidak bisa dibuka. Tutup tab MaduraMart yang lain, lalu muat ulang halaman.');
  });

  $('keluar').addEventListener('click', function () {
    MaduraDB.keluar().then(function () { window.location.replace('login.html'); });
  });
})();
