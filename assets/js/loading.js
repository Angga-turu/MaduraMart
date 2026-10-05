(function () {
  var daftar = document.getElementById('baris');
  var isi = document.getElementById('isi');
  var persen = document.getElementById('persen');
  var progres = document.getElementById('progres');
  var status = document.getElementById('status');
  var ulang = document.getElementById('ulang');
  var judul = document.getElementById('nama');
  var slogan = document.getElementById('slogan');

  var data = { ok: true, durasi: 4000 };

  // Setiap langkah muncul saat progres mencapai nilai "mulai" (0 sampai 1)
  var langkah = [
    { mulai: 0, teks: 'Membuka database' },
    { mulai: 0.3, teks: 'Membaca pengaturan aplikasi' },
    { mulai: 0.6, teks: 'Menyiapkan tampilan' }
  ];

  var awal = null;
  var tampil = 0;
  var berhenti = false;
  var barisAktif = null;

  function tambahBaris(teks) {
    var li = document.createElement('li');
    li.innerHTML = '<span class="teks"></span><span class="nilai">...</span>';
    li.querySelector('.teks').textContent = teks;
    daftar.appendChild(li);
    return li;
  }

  function tandai(li, ok) {
    var nilai = li.querySelector('.nilai');
    nilai.textContent = ok ? 'selesai' : 'gagal';
    nilai.className = 'nilai ' + (ok ? 'ok' : 'gagal');
  }

  function setProgres(p) {
    var angka = Math.round(p * 100);
    isi.style.transform = 'scaleX(' + p + ')';
    persen.textContent = angka + '%';
    progres.setAttribute('aria-valuenow', angka);
  }

  function gagal() {
    berhenti = true;
    tandai(barisAktif, false);
    status.textContent = 'Database di browser tidak bisa dibuka. Matikan mode privat, lalu muat ulang.';
    status.className = 'status galat';
    ulang.hidden = false;
  }

  function frame(waktu) {
    if (berhenti) return;
    if (awal === null) awal = waktu;
    var p = Math.min((waktu - awal) / data.durasi, 1);

    while (tampil < langkah.length && p >= langkah[tampil].mulai) {
      if (barisAktif) {
        // Langkah 1 (membuka database) dinilai saat langkah 2 akan dimulai
        if (tampil === 1 && !data.ok) { gagal(); return; }
        tandai(barisAktif, true);
      }
      barisAktif = tambahBaris(langkah[tampil].teks);
      tampil++;
    }

    setProgres(p);

    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      tandai(barisAktif, true);
      status.textContent = 'Siap digunakan';
      status.className = 'status siap';
      // Nanti, setelah halaman login dibuat:
      // window.location.href = 'login.html';
    }
  }

  ulang.addEventListener('click', function () { window.location.reload(); });

  // Buka database lebih dulu, lalu jalankan animasi dengan pengaturan dari sana
  MaduraDB.siapkan().then(function (p) {
    judul.textContent = p.nama_aplikasi;
    document.title = p.nama_aplikasi;
    if (p.slogan) { slogan.textContent = p.slogan; slogan.hidden = false; }
    data.durasi = Math.max(2000, Math.min(15000, Number(p.durasi_loading) || 4000));
  }).catch(function () {
    data.ok = false;
  }).then(function () {
    requestAnimationFrame(frame);
  });
})();
