(function () {
  var $ = function (id) { return document.getElementById(id); };
  var STOK_MENIPIS = 5; // produk dengan stok sampai angka ini dihitung menipis

  function rupiah(n) { return 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0); }

  function hariIni(iso) {
    var d = new Date(iso), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }

  function tampilkan(transaksi, produk) {
    var hariIniList = transaksi.filter(function (t) { return hariIni(t.waktu); });
    var total = hariIniList.reduce(function (a, t) { return a + (Number(t.total) || 0); }, 0);

    $('penjualan').textContent = rupiah(total);
    $('jumlah-transaksi').textContent = hariIniList.length;
    $('jumlah-produk').textContent = produk.length;
    $('stok-menipis').textContent = produk.filter(function (p) { return Number(p.stok) <= STOK_MENIPIS; }).length;

    var terakhir = transaksi.slice().sort(function (a, b) {
      return new Date(b.waktu) - new Date(a.waktu);
    }).slice(0, 5);

    var daftar = $('daftar');
    terakhir.forEach(function (t) {
      var li = document.createElement('li');
      var kiri = document.createElement('span');
      var garis = document.createElement('span');
      var kanan = document.createElement('span');
      kiri.textContent = 'Transaksi ' + t.id + ' (' + new Date(t.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ')';
      garis.className = 'garis';
      kanan.className = 'nilai';
      kanan.textContent = rupiah(t.total);
      li.appendChild(kiri); li.appendChild(garis); li.appendChild(kanan);
      daftar.appendChild(li);
    });
    $('kosong').hidden = terakhir.length > 0;
  }

  MaduraDB.siapkan().then(function () {
    return MaduraDB.sesiAktif();
  }).then(function (sesi) {
    // Halaman hanya bisa dibuka jika sudah login
    if (!sesi) { window.location.replace('login.html'); return; }

    $('pengguna').textContent = sesi.username;
    $('sapaan').textContent = sesi.username;
    $('tanggal').textContent = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    $('konten').hidden = false;

    return Promise.all([MaduraDB.semua('transaksi'), MaduraDB.semua('produk')]).then(function (h) {
      tampilkan(h[0], h[1]);
    });
  }).catch(function (galat) {
    console.error(galat);
    window.location.replace('login.html');
  });

  $('keluar').addEventListener('click', function () {
    MaduraDB.keluar().then(function () { window.location.replace('login.html'); });
  });
})();
