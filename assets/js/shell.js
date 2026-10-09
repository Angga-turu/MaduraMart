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
  function mulai(namaHalaman, hanyaAdmin) {
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
      var admin = sesi.peran === 'admin';
      semua('[data-admin]', function (b) { b.hidden = !admin; });
      var label = document.querySelector('.profil-teks span');
      if (label) label.textContent = admin ? 'Administrator' : 'Kasir';
      if (hanyaAdmin && !admin) { window.location.replace('dashboard.html'); return null; }
      pasangProfil(sesi);
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

  // ---------- Profil pengguna: foto dan nama tampilan ----------
  var sesiProfil = null, fotoBaru, setelahSimpan = null, terpasang = false;

  function terapkanProfil(s) {
    var nama = s.nama_tampilan || s.username;
    $('pengguna').textContent = nama;
    var av = $('avatar');
    av.classList.toggle('berfoto', !!s.foto);
    av.style.backgroundImage = s.foto ? 'url("' + s.foto + '")' : '';
    av.textContent = s.foto ? '' : nama.charAt(0).toUpperCase();
  }

  // Memotong gambar jadi persegi 256 px lalu mengubahnya ke JPEG kecil
  function perkecil(file) {
    return new Promise(function (selesai, gagal) {
      if (!/^image\//.test(file.type)) { gagal(new Error('Pilih file gambar (JPG, PNG, atau WebP).')); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var sisi = Math.min(img.naturalWidth, img.naturalHeight), ukuran = 256;
        var c = document.createElement('canvas');
        c.width = c.height = ukuran;
        var g = c.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, ukuran, ukuran);
        g.drawImage(img, (img.naturalWidth - sisi) / 2, (img.naturalHeight - sisi) / 2, sisi, sisi, 0, 0, ukuran, ukuran);
        URL.revokeObjectURL(url);
        selesai(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); gagal(new Error('Gambar tidak bisa dibaca. Coba file JPG atau PNG lain.')); };
      img.src = url;
    });
  }

  function galatProfil(teks) { $('pf-galat').textContent = teks || ''; $('pf-galat').hidden = !teks; }

  function pratinjau() {
    var foto = fotoBaru === undefined ? sesiProfil.foto : fotoBaru;
    var av = $('pf-avatar');
    av.style.backgroundImage = foto ? 'url("' + foto + '")' : '';
    av.textContent = foto ? '' : ($('pf-nama').value.trim() || sesiProfil.username).charAt(0).toUpperCase();
    $('pf-hapus-foto').hidden = !foto;
  }

  function bukaProfil() {
    fotoBaru = undefined;
    $('pf-nama').value = sesiProfil.nama_tampilan || '';
    $('pf-nama').placeholder = sesiProfil.username;
    $('pf-username').textContent = sesiProfil.username;
    $('pf-peran').textContent = sesiProfil.peran === 'admin' ? 'Administrator' : 'Kasir';
    galatProfil('');
    pratinjau();
    laci(false);
    $('dlg-profil').showModal();
  }

  function pasangProfil(sesi, sesudahSimpan) {
    sesiProfil = sesi;
    if (sesudahSimpan) setelahSimpan = sesudahSimpan;
    terapkanProfil(sesi);
    if (terpasang) return;
    terpasang = true;

    var dlg = document.createElement('dialog');
    dlg.id = 'dlg-profil';
    dlg.className = 'pf-dlg';
    dlg.setAttribute('aria-labelledby', 'pf-judul');
    dlg.innerHTML =
      '<form class="pf-isi" id="pf-form" novalidate>' +
        '<h2 id="pf-judul">Profil saya</h2>' +
        '<div class="pf-foto"><div class="pf-avatar" id="pf-avatar" aria-hidden="true"></div>' +
          '<div class="pf-aksi-foto">' +
            '<button type="button" class="pf-tombol" id="pf-ubah">Ubah foto</button>' +
            '<button type="button" class="pf-tombol pf-teks" id="pf-hapus-foto">Hapus foto</button>' +
            '<input type="file" id="pf-berkas" accept="image/*" hidden>' +
          '</div></div>' +
        '<p class="pf-bantu">Foto dipotong persegi, dikecilkan, dan disimpan di browser ini.</p>' +
        '<label for="pf-nama">Nama tampilan</label>' +
        '<input type="text" id="pf-nama" maxlength="30" autocomplete="off">' +
        '<dl class="pf-info"><dt>Nama pengguna</dt><dd id="pf-username"></dd><dt>Peran</dt><dd id="pf-peran"></dd></dl>' +
        '<p class="pf-galat" id="pf-galat" role="alert" hidden></p>' +
        '<div class="pf-aksi"><button type="button" class="pf-tombol" id="pf-batal">Batal</button>' +
        '<button type="submit" class="pf-tombol pf-gelap">Simpan</button></div>' +
      '</form>';
    document.body.appendChild(dlg);

    $('pf-ubah').addEventListener('click', function () { $('pf-berkas').click(); });
    $('pf-hapus-foto').addEventListener('click', function () { fotoBaru = ''; pratinjau(); });
    $('pf-nama').addEventListener('input', pratinjau);
    $('pf-batal').addEventListener('click', function () { dlg.close(); });
    $('pf-berkas').addEventListener('change', function () {
      var file = this.files[0];
      this.value = '';
      if (!file) return;
      galatProfil('');
      perkecil(file).then(function (data) { fotoBaru = data; pratinjau(); })
        .catch(function (g) { galatProfil(g.message); });
    });
    $('pf-form').addEventListener('submit', function (e) {
      e.preventDefault();
      galatProfil('');
      var data = { nama_tampilan: $('pf-nama').value };
      if (fotoBaru !== undefined) data.foto = fotoBaru;
      MaduraDB.simpanProfil(sesiProfil.username, data).then(function () {
        sesiProfil.nama_tampilan = $('pf-nama').value.trim();
        if (fotoBaru !== undefined) sesiProfil.foto = fotoBaru || '';
        terapkanProfil(sesiProfil);
        dlg.close();
        toast('Profil disimpan.');
        if (setelahSimpan) setelahSimpan(sesiProfil);
      }).catch(function (g) { galatProfil(g.message || 'Profil gagal disimpan.'); });
    });

    // Bagian profil di sidebar bisa diklik atau ditekan dengan keyboard
    var area = document.querySelector('.profil');
    if (area) {
      area.setAttribute('role', 'button');
      area.setAttribute('tabindex', '0');
      area.setAttribute('title', 'Ubah profil');
      area.addEventListener('click', bukaProfil);
      area.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bukaProfil(); }
      });
    }
  }

  return { mulai: mulai, toast: toast, profil: pasangProfil };
})();
