// Bagian bersama semua halaman aplikasi: sesi, menu samping, notifikasi, jam, keluar.
var Shell = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var waktuToast;

  function toast(teks) {
    var t = $('toast');
    t.textContent = teks;
    t.classList.add('tampil');
    clearTimeout(waktuToast);
    waktuToast = setTimeout(function () { t.classList.remove('tampil'); }, 2600);
  }

  function laci(buka) {
    $('samping').classList.toggle('buka', buka);
    $('tirai').classList.toggle('buka', buka);
  }

  function jam() {
    var n = new Date();
    $('tanggal').textContent = n.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('jam').textContent = n.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function semua(selektor, fungsi) {
    Array.prototype.forEach.call(document.querySelectorAll(selektor), fungsi);
  }

  // Memeriksa login. Mengembalikan data sesi, atau null jika pengguna dikirim ke halaman login.
  function mulai(namaHalaman) {
    $('buka').addEventListener('click', function () { laci(true); });
    $('tirai').addEventListener('click', function () { laci(false); });
    semua('[data-segera]', function (b) {
      b.addEventListener('click', function () { laci(false); toast('Halaman ' + b.getAttribute('data-segera') + ' belum tersedia.'); });
    });
    semua('[data-ke]', function (b) {
      b.addEventListener('click', function () { window.location.href = b.getAttribute('data-ke'); });
    });
    $('keluar').addEventListener('click', function () {
      MaduraDB.keluar().then(function () { window.location.replace('login.html'); });
    });

    return MaduraDB.siapkan().then(function () {
      return MaduraDB.sesiAktif();
    }).then(function (sesi) {
      if (!sesi) { window.location.replace('login.html?dari=' + namaHalaman); return null; }
      $('pengguna').textContent = sesi.username;
      $('avatar').textContent = sesi.username.charAt(0).toUpperCase();
      jam();
      setInterval(jam, 30000);
      $('app').hidden = false;
      return sesi;
    }, function (galat) {
      // Database tidak bisa dibuka: tampilkan pesan, jangan lempar ke login (bisa berputar terus)
      console.error(galat);
      var p = document.createElement('p');
      p.textContent = 'Database tidak bisa dibuka. Tutup tab MaduraMart yang lain, lalu muat ulang halaman.';
      p.style.cssText = 'margin:0;padding:24px;font-weight:600';
      document.body.appendChild(p);
      return null;
    });
  }

  return { mulai: mulai, toast: toast };
})();
