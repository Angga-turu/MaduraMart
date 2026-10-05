(function () {
  var isi = document.getElementById('isi');
  var progres = document.getElementById('progres');
  var judul = document.getElementById('nama');

  var durasi = 4000; // milidetik, dibaca dari database
  var awal = null;

  function frame(waktu) {
    if (awal === null) awal = waktu;
    var p = Math.min((waktu - awal) / durasi, 1);

    isi.style.transform = 'scaleX(' + p + ')';
    progres.setAttribute('aria-valuenow', Math.round(p * 100));

    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      // Sudah login: langsung ke dashboard. Belum: ke halaman login.
      var tujuan = function (ada) { window.location.replace(ada ? 'dashboard.html' : 'login.html'); };
      if (typeof MaduraDB === 'undefined') { tujuan(false); return; }
      MaduraDB.sesiAktif().then(function (sesi) { tujuan(!!sesi); }, function () { tujuan(false); });
    }
  }

  // Buka database lebih dulu, lalu jalankan animasi dengan pengaturan dari sana
  var siap = (typeof MaduraDB !== 'undefined')
    ? MaduraDB.siapkan()
    : Promise.reject(new Error('db.js tidak termuat'));

  siap.then(function (p) {
    judul.textContent = p.nama_aplikasi;
    document.title = p.nama_aplikasi;
    durasi = Math.max(2000, Math.min(15000, Number(p.durasi_loading) || 4000));
  }).catch(function (galat) {
    console.error('Database browser tidak bisa dibuka:', galat);
  }).then(function () {
    requestAnimationFrame(frame);
  });
})();
