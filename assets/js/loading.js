(function () {
  var data = JSON.parse(document.getElementById('data-awal').textContent);
  var daftar = document.getElementById('baris');
  var isi = document.getElementById('isi');
  var persen = document.getElementById('persen');
  var progres = document.getElementById('progres');
  var status = document.getElementById('status');
  var ulang = document.getElementById('ulang');

  var pesanGalat = {
    gagal: 'Tidak bisa terhubung ke database. Pastikan MySQL sudah menyala.',
    tabel: 'Tabel pengaturan belum ada. Impor file database/kasir_db.sql dulu.',
    kosong: 'Tabel pengaturan masih kosong. Impor ulang file database/kasir_db.sql.'
  };

  // Setiap langkah muncul saat progres mencapai nilai "mulai" (0 sampai 1)
  var langkah = [
    { mulai: 0, teks: 'Menghubungkan ke database' },
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
    status.textContent = pesanGalat[data.status] || pesanGalat.gagal;
    status.className = 'status galat';
    ulang.hidden = false;
  }

  function frame(waktu) {
    if (berhenti) return;
    if (awal === null) awal = waktu;
    var p = Math.min((waktu - awal) / data.durasi, 1);

    while (tampil < langkah.length && p >= langkah[tampil].mulai) {
      if (barisAktif) {
        // Langkah 1 (koneksi database) dinilai saat langkah 2 akan dimulai
        if (tampil === 1 && data.status !== 'ok') { gagal(); return; }
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
      // window.location.href = 'login.php';
    }
  }

  ulang.addEventListener('click', function () { window.location.reload(); });

  requestAnimationFrame(frame);
})();
