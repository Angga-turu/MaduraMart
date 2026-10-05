(function () {
  var form = document.getElementById('form');
  var inputNama = document.getElementById('username');
  var inputSandi = document.getElementById('sandi');
  var galat = document.getElementById('galat');
  var tombol = document.getElementById('tombol');

  var tombolMata = document.getElementById('lihat');

  // Tombol mata: tampilkan atau sembunyikan kata sandi
  tombolMata.addEventListener('click', function () {
    var terlihat = inputSandi.type === 'text';
    inputSandi.type = terlihat ? 'password' : 'text';
    tombolMata.classList.toggle('tampil', !terlihat);
    tombolMata.setAttribute('aria-pressed', String(!terlihat));
    tombolMata.setAttribute('aria-label', terlihat ? 'Tampilkan kata sandi' : 'Sembunyikan kata sandi');
    inputSandi.focus();
  });

  function tampilGalat(teks) {
    galat.textContent = teks;
    galat.hidden = !teks;
  }

  // Pengguna yang masih punya sesi langsung diarahkan ke dashboard
  MaduraDB.siapkan().then(function () {
    return MaduraDB.sesiAktif();
  }).then(function (sesi) {
    if (sesi) window.location.replace('dashboard.html');
  }).catch(function (e) { console.error(e); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    tampilGalat('');

    if (!inputNama.value.trim() || !inputSandi.value) {
      tampilGalat('Isi nama pengguna dan kata sandi.');
      return;
    }

    tombol.disabled = true;
    MaduraDB.siapkan().then(function () {
      return MaduraDB.masuk(inputNama.value, inputSandi.value);
    }).then(function (berhasil) {
      if (berhasil) {
        window.location.replace('dashboard.html');
      } else {
        tampilGalat('Nama pengguna atau kata sandi salah.');
        inputSandi.value = '';
        inputSandi.focus();
        tombol.disabled = false;
      }
    }).catch(function (err) {
      console.error(err);
      tampilGalat('Database di browser tidak bisa dibuka. Matikan mode privat, lalu muat ulang.');
      tombol.disabled = false;
    });
  });
})();
