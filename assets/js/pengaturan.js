(function () {
  var $ = function (id) { return document.getElementById(id); };
  var sesi = null, aksiBahaya = null, kataBahaya = '';

  function el(tag, teks, kelas) {
    var e = document.createElement(tag);
    if (teks !== undefined) e.textContent = teks;
    if (kelas) e.className = kelas;
    return e;
  }
  function pesan(id, teks) { $(id).textContent = teks || ''; $(id).hidden = !teks; }
  function galatDari(g) { return (g && g.message) || 'Terjadi kesalahan. Coba lagi.'; }

  // ---------- Tab ----------
  Array.prototype.forEach.call(document.querySelectorAll('[data-panel]'), function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-panel]'), function (x) {
        x.classList.toggle('aktif', x === b);
        $('p-' + x.getAttribute('data-panel')).hidden = x !== b;
      });
    });
  });

  // ---------- Profil toko ----------
  function muatProfil() {
    return MaduraDB.pengaturan().then(function (p) {
      p = p || {};
      $('t-nama').value = p.nama_aplikasi || '';
      $('t-alamat').value = p.alamat || '';
      $('t-telepon').value = p.telepon || '';
      $('t-pesan').value = p.pesan_struk || '';
    });
  }

  $('f-profil').addEventListener('submit', function (e) {
    e.preventDefault();
    pesan('g-profil', '');
    var nama = $('t-nama').value.trim();
    if (!nama) { pesan('g-profil', 'Nama toko wajib diisi.'); return; }
    MaduraDB.simpanPengaturan({
      nama_aplikasi: nama,
      alamat: $('t-alamat').value.trim(),
      telepon: $('t-telepon').value.trim(),
      pesan_struk: $('t-pesan').value.trim()
    }).then(function () {
      document.title = 'Pengaturan - ' + nama;
      Shell.toast('Profil toko disimpan.');
    }).catch(function (g) { pesan('g-profil', galatDari(g)); });
  });

  // ---------- Ganti kata sandi ----------
  $('f-sandi').addEventListener('submit', function (e) {
    e.preventDefault();
    pesan('g-sandi', '');
    var lama = $('s-lama').value, baru = $('s-baru').value, ulang = $('s-ulang').value;
    if (!lama) { pesan('g-sandi', 'Isi kata sandi lama.'); return; }
    if (baru.length < 6) { pesan('g-sandi', 'Kata sandi baru minimal 6 karakter.'); return; }
    if (baru !== ulang) { pesan('g-sandi', 'Pengulangan kata sandi tidak sama.'); return; }
    if (baru === lama) { pesan('g-sandi', 'Kata sandi baru harus berbeda dari yang lama.'); return; }
    MaduraDB.gantiSandi(sesi.username, lama, baru).then(function () {
      $('f-sandi').reset();
      Shell.toast('Kata sandi berhasil diganti.');
    }).catch(function (g) { pesan('g-sandi', galatDari(g)); });
  });

  // ---------- Dialog konfirmasi bahaya (harus mengetik kata tertentu) ----------
  function bukaBahaya(o) {
    aksiBahaya = o.aksi;
    kataBahaya = o.kata;
    $('b-judul').textContent = o.judul;
    $('b-teks').textContent = o.teks;
    $('b-kata').textContent = o.kata;
    $('b-ketik').value = '';
    $('b-ya').textContent = o.tombol;
    $('b-ya').disabled = true;
    pesan('g-bahaya', '');
    $('dlg-bahaya').showModal();
    $('b-ketik').focus();
  }
  $('b-ketik').addEventListener('input', function () { $('b-ya').disabled = this.value.trim() !== kataBahaya; });
  $('b-batal').addEventListener('click', function () { $('dlg-bahaya').close(); });
  $('b-ya').addEventListener('click', function () {
    $('b-ya').disabled = true;
    Promise.resolve().then(aksiBahaya).then(function () {
      $('dlg-bahaya').close();
    }).catch(function (g) {
      pesan('g-bahaya', galatDari(g));
      $('b-ya').disabled = false;
    });
  });

  // ---------- Data: cadangan, pulihkan, reset ----------
  $('unduh-cadangan').addEventListener('click', function () {
    MaduraDB.ekspor().then(function (o) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' }));
      a.download = 'cadangan-maduramart-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      Shell.toast('Cadangan diunduh.');
    }).catch(function (g) { Shell.toast(galatDari(g)); });
  });

  $('pilih-cadangan').addEventListener('click', function () { $('berkas').click(); });
  $('berkas').addEventListener('change', function () {
    var file = this.files[0];
    this.value = '';
    if (!file) return;
    var pembaca = new FileReader();
    pembaca.onload = function () {
      var data;
      try { data = JSON.parse(pembaca.result); } catch (e) { Shell.toast('File tidak bisa dibaca. Pilih file cadangan .json.'); return; }
      bukaBahaya({
        judul: 'Pulihkan dari cadangan?',
        teks: 'Semua data sekarang (produk, transaksi, dan pengaturan toko) akan diganti dengan isi file "' + file.name + '". Akunmu tidak berubah.',
        kata: 'PULIHKAN',
        tombol: 'Pulihkan data',
        aksi: function () {
          return MaduraDB.impor(data).then(function () {
            window.location.replace('dashboard.html');
          });
        }
      });
    };
    pembaca.readAsText(file);
  });

  $('hapus-transaksi').addEventListener('click', function () {
    bukaBahaya({
      judul: 'Hapus semua riwayat transaksi?',
      teks: 'Semua transaksi dan angka laporan akan hilang. Produk dan stok tidak berubah. Sebaiknya unduh cadangan dulu.',
      kata: 'HAPUS',
      tombol: 'Hapus riwayat',
      aksi: function () { return MaduraDB.hapusTransaksi().then(function () { Shell.toast('Riwayat transaksi dihapus.'); }); }
    });
  });

  $('reset-semua').addEventListener('click', function () {
    bukaBahaya({
      judul: 'Kembalikan ke data awal?',
      teks: 'Semua produk, transaksi, dan pengaturan toko dihapus, lalu diganti data awal (produk contoh). Akunmu tidak dihapus, tetapi kamu akan keluar dan perlu masuk lagi. Tindakan ini tidak bisa dibatalkan.',
      kata: 'RESET',
      tombol: 'Reset semua data',
      aksi: function () { return MaduraDB.resetSemua().then(function () { window.location.replace('index.html'); }); }
    });
  });

  Shell.mulai('pengaturan', true).then(function (s) {
    if (!s) return;
    sesi = s;
    return muatProfil();
  }).catch(function (g) {
    console.error(g);
    Shell.toast((g && g.message) || 'Data pengaturan belum bisa dimuat. Coba muat ulang halaman.');
  });
})();
