(function () {
  var $ = function (id) { return document.getElementById(id); };
  var STOK_MENIPIS = 5;
  var data = [], cari = '', kategori = 'Semua', diubah = null, dihapus = null;

  function rupiah(n) { return 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0); }
  function el(tag, teks, kelas) {
    var e = document.createElement(tag);
    if (teks !== undefined) e.textContent = teks;
    if (kelas) e.className = kelas;
    return e;
  }
  function ikonTombol(ikon, label, kelas, aksi) {
    var b = el('button', undefined, 'ikon-tombol' + (kelas ? ' ' + kelas : ''));
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.innerHTML = '<svg class="ikon" width="18" height="18"><use href="#i-' + ikon + '"/></svg>';
    b.addEventListener('click', aksi);
    return b;
  }

  function muat() {
    return MaduraDB.semua('produk').then(function (d) {
      data = d.sort(function (a, b) { return a.nama.localeCompare(b.nama); });
      daftarKategori();
      gambar();
    });
  }

  function daftarKategori() {
    var semuaKat = [];
    data.forEach(function (p) { if (p.kategori && semuaKat.indexOf(p.kategori) === -1) semuaKat.push(p.kategori); });
    semuaKat.sort();
    if (kategori !== 'Semua' && semuaKat.indexOf(kategori) === -1) kategori = 'Semua';

    var pilih = $('saring');
    pilih.textContent = '';
    ['Semua'].concat(semuaKat).forEach(function (k) {
      var o = el('option', k === 'Semua' ? 'Semua kategori' : k);
      o.value = k;
      pilih.appendChild(o);
    });
    pilih.value = kategori;

    var dl = $('saran-kategori');
    dl.textContent = '';
    semuaKat.forEach(function (k) { var o = el('option'); o.value = k; dl.appendChild(o); });
  }

  function gambar() {
    var tampil = data.filter(function (p) {
      return (kategori === 'Semua' || p.kategori === kategori) && p.nama.toLowerCase().indexOf(cari) !== -1;
    });
    var menipis = data.filter(function (p) { return Number(p.stok) <= STOK_MENIPIS; }).length;
    $('ringkas').textContent = data.length + ' produk, ' + menipis + ' stok menipis';

    var isi = $('isi');
    isi.textContent = '';
    tampil.forEach(function (p) {
      var tr = el('tr');
      var tdNama = el('td'); tdNama.appendChild(el('strong', p.nama));
      var tdKat = el('td'); tdKat.appendChild(el('span', p.kategori || 'Lainnya', 'lencana-kat'));
      var tdStok = el('td', String(p.stok), 'angka');
      if (Number(p.stok) <= 0) tdStok.appendChild(el('span', 'Habis', 'status-stok tipis'));
      else if (Number(p.stok) <= STOK_MENIPIS) tdStok.appendChild(el('span', 'Menipis', 'status-stok tipis'));
      var tdAksi = el('td', undefined, 'aksi-sel');
      tdAksi.appendChild(ikonTombol('edit', 'Ubah ' + p.nama, '', function () { bukaForm(p); }));
      tdAksi.appendChild(ikonTombol('hapus', 'Hapus ' + p.nama, 'bahaya', function () { bukaHapus(p); }));
      tr.appendChild(tdNama); tr.appendChild(tdKat); tr.appendChild(el('td', rupiah(p.harga), 'angka')); tr.appendChild(tdStok); tr.appendChild(tdAksi);
      isi.appendChild(tr);
    });
    $('tabel').hidden = tampil.length === 0;
    $('kosong').textContent = data.length ? 'Produk tidak ditemukan.' : 'Belum ada produk. Klik "Tambah produk" untuk mulai.';
    $('kosong').hidden = tampil.length > 0;
  }

  // ---------- Form tambah / ubah ----------
  function bukaForm(p) {
    diubah = p || null;
    $('judul-form').textContent = p ? 'Ubah produk' : 'Tambah produk';
    $('f-nama').value = p ? p.nama : '';
    $('f-kategori').value = p ? (p.kategori || '') : '';
    $('f-harga').value = p ? p.harga : '';
    $('f-stok').value = p ? p.stok : '';
    $('galat-form').hidden = true;
    $('dlg-form').showModal();
    $('f-nama').focus();
  }

  function galat(teks) { $('galat-form').textContent = teks; $('galat-form').hidden = false; }

  function simpan(e) {
    e.preventDefault();
    var nama = $('f-nama').value.trim();
    var harga = Number($('f-harga').value), stok = Number($('f-stok').value);
    if (!nama) { galat('Nama produk wajib diisi.'); return; }
    if ($('f-harga').value === '' || !(harga >= 0) || Math.floor(harga) !== harga) { galat('Harga harus berupa angka bulat 0 atau lebih.'); return; }
    if ($('f-stok').value === '' || !(stok >= 0) || Math.floor(stok) !== stok) { galat('Stok harus berupa angka bulat 0 atau lebih.'); return; }
    var kembar = data.some(function (p) { return p.nama.toLowerCase() === nama.toLowerCase() && (!diubah || p.id !== diubah.id); });
    if (kembar) { galat('Produk dengan nama itu sudah ada.'); return; }

    var obj = { nama: nama, kategori: $('f-kategori').value.trim() || 'Lainnya', harga: harga, stok: stok };
    if (diubah) obj.id = diubah.id;
    $('simpan').disabled = true;
    MaduraDB.simpanProduk(obj).then(function () {
      $('dlg-form').close();
      Shell.toast(diubah ? 'Produk diperbarui.' : 'Produk ditambahkan.');
      return muat();
    }).catch(function (g) {
      galat(g.message || 'Produk gagal disimpan.');
    }).then(function () { $('simpan').disabled = false; });
  }

  // ---------- Hapus ----------
  function bukaHapus(p) {
    dihapus = p;
    $('nama-hapus').textContent = p.nama;
    $('dlg-hapus').showModal();
  }

  function konfirmasiHapus() {
    MaduraDB.hapusProduk(dihapus.id).then(function () {
      $('dlg-hapus').close();
      Shell.toast('Produk dihapus.');
      return muat();
    }).catch(function () { Shell.toast('Produk gagal dihapus.'); });
  }

  $('cari').addEventListener('input', function () { cari = this.value.trim().toLowerCase(); gambar(); });
  $('saring').addEventListener('change', function () { kategori = this.value; gambar(); });
  $('tambah').addEventListener('click', function () { bukaForm(null); });
  $('form').addEventListener('submit', simpan);
  $('batal-form').addEventListener('click', function () { $('dlg-form').close(); });
  $('batal-hapus').addEventListener('click', function () { $('dlg-hapus').close(); });
  $('ya-hapus').addEventListener('click', konfirmasiHapus);

  Shell.mulai('produk').then(function (s) {
    if (s) return muat();
  }).catch(function (g) {
    console.error(g);
    Shell.toast('Data produk belum bisa dimuat. Coba muat ulang halaman.');
  });
})();
