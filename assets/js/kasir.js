(function () {
  var $ = function (id) { return document.getElementById(id); };
  var produk = [], peta = {}, keranjang = {}, kategori = 'Semua', cari = '', sesi = null;

  function rupiah(n) { return 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0); }
  function el(tag, teks, kelas) {
    var e = document.createElement(tag);
    if (teks !== undefined) e.textContent = teks;
    if (kelas) e.className = kelas;
    return e;
  }
  function tombol(teks, kelas, aksi, label) {
    var b = el('button', teks, kelas);
    b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', aksi);
    return b;
  }

  function ids() { return Object.keys(keranjang); }
  function total() { return ids().reduce(function (a, id) { return a + peta[id].harga * keranjang[id]; }, 0); }
  function jumlahItem() { return ids().reduce(function (a, id) { return a + keranjang[id]; }, 0); }

  // ---------- Data ----------
  function muat() {
    return MaduraDB.semua('produk').then(function (data) {
      produk = data.sort(function (a, b) { return a.nama.localeCompare(b.nama); });
      peta = {};
      produk.forEach(function (p) { peta[p.id] = p; });
      ids().forEach(function (id) {
        if (!peta[id]) { delete keranjang[id]; return; }
        if (keranjang[id] > peta[id].stok) keranjang[id] = peta[id].stok;
        if (keranjang[id] <= 0) delete keranjang[id];
      });
      gambarKategori(); gambarProduk(); gambarKeranjang();
    });
  }

  // ---------- Katalog ----------
  function gambarKategori() {
    var daftar = ['Semua'];
    produk.forEach(function (p) { if (p.kategori && daftar.indexOf(p.kategori) === -1) daftar.push(p.kategori); });
    if (daftar.indexOf(kategori) === -1) kategori = 'Semua';
    var wadah = $('kategori');
    wadah.textContent = '';
    daftar.forEach(function (k) {
      var b = tombol(k, 'chip-kat' + (k === kategori ? ' aktif' : ''), function () { kategori = k; gambarKategori(); gambarProduk(); });
      wadah.appendChild(b);
    });
  }

  function gambarProduk() {
    var wadah = $('produk');
    wadah.textContent = '';
    var tampil = produk.filter(function (p) {
      return (kategori === 'Semua' || p.kategori === kategori) && p.nama.toLowerCase().indexOf(cari) !== -1;
    });
    $('kosong-produk').textContent = produk.length ? 'Produk tidak ditemukan.' : 'Belum ada produk.';
    $('kosong-produk').hidden = tampil.length > 0;
    tampil.forEach(function (p) {
      var sisa = p.stok - (keranjang[p.id] || 0);
      var b = tombol(undefined, 'kartu-produk', function () { ubah(p.id, 1); });
      b.disabled = sisa <= 0;
      b.appendChild(el('span', p.nama, 'nama'));
      b.appendChild(el('span', rupiah(p.harga), 'harga'));
      b.appendChild(el('span', p.stok <= 0 ? 'Habis' : 'Stok ' + sisa, 'stok' + (p.stok <= 5 ? ' tipis' : '')));
      wadah.appendChild(b);
    });
  }

  // ---------- Keranjang ----------
  function ubah(id, delta) {
    var p = peta[id], q = (keranjang[id] || 0) + delta;
    if (q <= 0) delete keranjang[id];
    else if (q > p.stok) { Shell.toast('Stok ' + p.nama + ' hanya ' + p.stok + '.'); return; }
    else keranjang[id] = q;
    gambarProduk(); gambarKeranjang();
  }

  function gambarKeranjang() {
    var ul = $('item');
    ul.textContent = '';
    ids().forEach(function (id) {
      var p = peta[id], q = keranjang[id];
      var li = el('li');
      var info = el('div', undefined, 'info');
      info.appendChild(el('strong', p.nama));
      info.appendChild(el('span', rupiah(p.harga) + ' x ' + q));
      var atur = el('div', undefined, 'atur');
      atur.appendChild(tombol('-', 'qty', function () { ubah(id, -1); }, 'Kurangi ' + p.nama));
      atur.appendChild(el('b', String(q)));
      atur.appendChild(tombol('+', 'qty', function () { ubah(id, 1); }, 'Tambah ' + p.nama));
      li.appendChild(info); li.appendChild(atur);
      li.appendChild(el('b', rupiah(p.harga * q), 'sub'));
      ul.appendChild(li);
    });
    var ada = ids().length > 0;
    $('kosong-keranjang').hidden = ada;
    $('kosongkan').hidden = !ada;
    $('total').textContent = rupiah(total());
    $('jumlah').textContent = jumlahItem() + ' item';
    $('bayar-tombol').disabled = !ada;
    $('bawah-info').textContent = jumlahItem() + ' item';
    $('bawah-total').textContent = rupiah(total());
    $('bawah-bayar').disabled = !ada;
  }

  // ---------- Pembayaran ----------
  function hitung() {
    var t = total(), u = Number($('uang').value) || 0, selisih = u - t;
    $('kembali-label').textContent = selisih >= 0 ? 'Kembalian' : 'Kurang';
    $('kembali').textContent = rupiah(Math.abs(selisih));
    $('kembali').className = selisih >= 0 ? 'ok' : 'kurang';
    $('selesai').disabled = !(u > 0 && u >= t);
  }

  function bukaBayar() {
    if (!ids().length) return;
    $('b-total').textContent = rupiah(total());
    $('uang').value = '';
    hitung();
    $('dlg-bayar').showModal();
    $('uang').focus();
  }

  function selesaikan() {
    $('selesai').disabled = true;
    MaduraDB.catatTransaksi({
      item: ids().map(function (id) { return { id: Number(id), jumlah: keranjang[id] }; }),
      bayar: Number($('uang').value),
      kasir: sesi.username
    }).then(function (rec) {
      $('dlg-bayar').close();
      keranjang = {};
      return muat().then(function () { tampilStruk(rec); });
    }).catch(function (galat) {
      Shell.toast(galat.message || 'Transaksi gagal disimpan.');
      $('selesai').disabled = false;
      return muat();
    });
  }

  function baris(kiri, kanan, kelas) {
    var li = el('li', undefined, kelas);
    li.appendChild(el('span', kiri));
    li.appendChild(el('span', undefined, 'garis'));
    li.appendChild(el('span', kanan));
    return li;
  }

  function tampilStruk(rec) {
    $('s-tanggal').textContent = new Date(rec.waktu).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    $('s-no').textContent = 'No. ' + rec.id + ' | Kasir: ' + rec.kasir;
    var ul = $('s-item');
    ul.textContent = '';
    rec.item.forEach(function (it) {
      ul.appendChild(baris(it.nama, rupiah(it.subtotal)));
      ul.appendChild(el('li', it.jumlah + ' x ' + rupiah(it.harga), 'rinci'));
    });
    var jum = $('s-jumlah');
    jum.textContent = '';
    jum.appendChild(baris('Total', rupiah(rec.total), 'tebal'));
    jum.appendChild(baris('Tunai', rupiah(rec.bayar)));
    jum.appendChild(baris('Kembali', rupiah(rec.kembali)));
    $('dlg-struk').showModal();
  }

  function cetakStruk() {
    document.body.classList.add('cetak-struk');
    window.addEventListener('afterprint', function lepas() {
      document.body.classList.remove('cetak-struk');
      window.removeEventListener('afterprint', lepas);
    });
    window.print();
  }

  // ---------- Pasang tombol ----------
  $('cari').addEventListener('input', function () { cari = this.value.trim().toLowerCase(); gambarProduk(); });
  $('kosongkan').addEventListener('click', function () { keranjang = {}; gambarProduk(); gambarKeranjang(); });
  $('bayar-tombol').addEventListener('click', bukaBayar);
  $('bawah-bayar').addEventListener('click', bukaBayar);
  $('uang').addEventListener('input', hitung);
  $('selesai').addEventListener('click', selesaikan);
  $('batal').addEventListener('click', function () { $('dlg-bayar').close(); });
  $('tutup-struk').addEventListener('click', function () { $('dlg-struk').close(); });
  $('cetak').addEventListener('click', cetakStruk);
  Array.prototype.forEach.call(document.querySelectorAll('[data-uang]'), function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-uang');
      $('uang').value = v === 'pas' ? total() : v;
      hitung();
    });
  });

  Shell.mulai('kasir').then(function (s) {
    if (!s) return;
    sesi = s;
    return muat();
  }).catch(function (galat) {
    console.error(galat);
    Shell.toast('Data produk belum bisa dimuat. Coba muat ulang halaman.');
  });
})();
