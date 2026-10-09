(function () {
  var $ = function (id) { return document.getElementById(id); };
  var semuaTrx = [], periode = '7', semuaRiwayat = false;
  var NAMA = { hari: 'Hari ini', '7': '7 hari terakhir', '30': '30 hari terakhir', bulan: 'Bulan ini', semua: 'Semua waktu' };
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function rupiah(n) { return 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0); }
  function el(tag, teks, kelas) {
    var e = document.createElement(tag);
    if (teks !== undefined) e.textContent = teks;
    if (kelas) e.className = kelas;
    return e;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tgl(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (n || 0)); }
  function waktuLokal(iso, panjang) {
    return new Date(iso).toLocaleString('id-ID', panjang
      ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // ---------- Periode ----------
  function rentang() {
    var hari = tgl(new Date()), akhir = tgl(hari, 1), mulai;
    if (periode === 'hari') mulai = hari;
    else if (periode === '7') mulai = tgl(hari, -6);
    else if (periode === '30') mulai = tgl(hari, -29);
    else if (periode === 'bulan') mulai = new Date(hari.getFullYear(), hari.getMonth(), 1);
    else mulai = new Date(0);
    return { mulai: mulai, akhir: akhir };
  }

  function terfilter() {
    var r = rentang();
    return semuaTrx.filter(function (t) { var w = new Date(t.waktu); return w >= r.mulai && w < r.akhir; });
  }

  // Potongan waktu untuk grafik: per jam (hari ini), per hari, atau per bulan (semua waktu yang panjang)
  function potongan(daftar) {
    var r = rentang(), b = [], i, d;
    if (periode === 'hari') {
      for (i = 0; i < 24; i++) {
        b.push({ teks: i % 6 === 0 ? pad(i) : '', judul: pad(i) + ':00', mulai: new Date(r.mulai.getFullYear(), r.mulai.getMonth(), r.mulai.getDate(), i), akhir: new Date(r.mulai.getFullYear(), r.mulai.getMonth(), r.mulai.getDate(), i + 1) });
      }
      return b;
    }
    var mulai = r.mulai;
    if (periode === 'semua') {
      if (!daftar.length) return [];
      mulai = tgl(new Date(Math.min.apply(null, daftar.map(function (t) { return +new Date(t.waktu); }))));
    }
    var span = Math.round((r.akhir - mulai) / 86400000);
    if (periode === 'semua' && span > 60) {
      for (d = new Date(mulai.getFullYear(), mulai.getMonth(), 1); d < r.akhir; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        b.push({ teks: BULAN[d.getMonth()], judul: BULAN[d.getMonth()] + ' ' + d.getFullYear(), mulai: d, akhir: new Date(d.getFullYear(), d.getMonth() + 1, 1) });
      }
      return b;
    }
    var langkah = Math.max(1, Math.ceil(span / 8));
    for (i = 0; i < span; i++) {
      d = tgl(mulai, i);
      b.push({
        teks: span <= 7 ? d.toLocaleDateString('id-ID', { weekday: 'short' }) : (i % langkah === 0 ? String(d.getDate()) : ''),
        judul: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }),
        mulai: d, akhir: tgl(d, 1)
      });
    }
    return b;
  }

  // ---------- Tampilan ----------
  function gambar() {
    var daftar = terfilter();
    var omzet = daftar.reduce(function (a, t) { return a + (Number(t.total) || 0); }, 0);
    var barang = daftar.reduce(function (a, t) { return a + t.item.reduce(function (x, i) { return x + i.jumlah; }, 0); }, 0);

    $('k-omzet').textContent = rupiah(omzet);
    $('k-transaksi').textContent = daftar.length;
    $('k-rata').textContent = rupiah(daftar.length ? Math.round(omzet / daftar.length) : 0);
    $('k-barang').textContent = barang;
    $('nama-periode').textContent = NAMA[periode];
    $('unduh').disabled = daftar.length === 0;

    // Grafik
    var bucket = potongan(daftar), grafik = $('grafik');
    grafik.textContent = '';
    grafik.className = 'grafik' + (bucket.length > 12 ? ' rapat' : '');
    var nilai = bucket.map(function (p) {
      return daftar.reduce(function (a, t) { var w = new Date(t.waktu); return w >= p.mulai && w < p.akhir ? a + (Number(t.total) || 0) : a; }, 0);
    });
    var maks = Math.max.apply(null, nilai.concat([0]));
    bucket.forEach(function (p, i) {
      var kolom = el('div', undefined, 'kolom');
      var batang = el('div', undefined, 'batang' + (i === bucket.length - 1 && periode !== 'semua' ? ' hari-ini' : ''));
      batang.style.height = (maks > 0 ? Math.max(nilai[i] / maks * 100, 2) : 2) + '%';
      batang.title = p.judul + ': ' + rupiah(nilai[i]);
      kolom.appendChild(batang);
      kolom.appendChild(el('span', p.teks, 'hari'));
      grafik.appendChild(kolom);
    });
    $('catatan-grafik').hidden = omzet > 0;

    // Produk terlaris
    var agregat = {};
    daftar.forEach(function (t) {
      t.item.forEach(function (i) {
        var a = agregat[i.nama] || (agregat[i.nama] = { nama: i.nama, jumlah: 0, omzet: 0 });
        a.jumlah += i.jumlah; a.omzet += i.subtotal;
      });
    });
    var urut = Object.keys(agregat).map(function (k) { return agregat[k]; })
      .sort(function (a, b) { return b.jumlah - a.jumlah || b.omzet - a.omzet; }).slice(0, 5);
    var ul = $('terlaris');
    ul.textContent = '';
    urut.forEach(function (a) {
      var li = el('li');
      var atas = el('div', undefined, 'baris-atas');
      atas.appendChild(el('strong', a.nama));
      atas.appendChild(el('span', a.jumlah + ' terjual', 'jml'));
      var jalur = el('div', undefined, 'jalur');
      var isi = el('i');
      isi.style.width = (a.jumlah / urut[0].jumlah * 100) + '%';
      jalur.appendChild(isi);
      li.appendChild(atas); li.appendChild(jalur); li.appendChild(el('span', rupiah(a.omzet), 'omzet'));
      ul.appendChild(li);
    });
    $('kosong-terlaris').hidden = urut.length > 0;

    // Riwayat transaksi
    var terbaru = daftar.slice().sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); });
    var tampil = semuaRiwayat ? terbaru : terbaru.slice(0, 15);
    var isiTabel = $('isi');
    isiTabel.textContent = '';
    tampil.forEach(function (t) {
      var tr = el('tr');
      tr.appendChild(el('td', '#' + t.id));
      tr.appendChild(el('td', waktuLokal(t.waktu)));
      tr.appendChild(el('td', t.kasir));
      tr.appendChild(el('td', String(t.item.reduce(function (x, i) { return x + i.jumlah; }, 0)), 'num'));
      tr.appendChild(el('td', rupiah(t.total), 'num'));
      var aksi = el('td');
      var b = el('button', 'Struk', 'teks-kecil');
      b.type = 'button';
      b.addEventListener('click', function () { tampilStruk(t); });
      aksi.appendChild(b);
      tr.appendChild(aksi);
      isiTabel.appendChild(tr);
    });
    $('tabel').hidden = tampil.length === 0;
    $('kosong').hidden = tampil.length > 0;
    $('jumlah-riwayat').textContent = daftar.length + ' transaksi';
    $('lainnya').hidden = terbaru.length <= 15;
    $('lainnya').textContent = semuaRiwayat ? 'Tampilkan lebih sedikit' : 'Tampilkan semua (' + terbaru.length + ')';
  }

  // ---------- Struk ----------
  function baris(kiri, kanan, kelas) {
    var li = el('li', undefined, kelas);
    li.appendChild(el('span', kiri)); li.appendChild(el('span', undefined, 'garis')); li.appendChild(el('span', kanan));
    return li;
  }

  function tampilStruk(t) {
    $('s-tanggal').textContent = waktuLokal(t.waktu, true);
    $('s-no').textContent = 'No. ' + t.id + ' | Kasir: ' + t.kasir;
    var ul = $('s-item');
    ul.textContent = '';
    t.item.forEach(function (i) {
      ul.appendChild(baris(i.nama, rupiah(i.subtotal)));
      ul.appendChild(el('li', i.jumlah + ' x ' + rupiah(i.harga), 'rinci'));
    });
    var jum = $('s-jumlah');
    jum.textContent = '';
    jum.appendChild(baris('Total', rupiah(t.total), 'tebal'));
    jum.appendChild(baris('Tunai', rupiah(t.bayar)));
    jum.appendChild(baris('Kembali', rupiah(t.kembali)));
    $('dlg-struk').showModal();
  }

  // ---------- Unduh CSV (pemisah titik koma agar rapi di Excel Indonesia) ----------
  function unduh() {
    var baru = terfilter().sort(function (a, b) { return new Date(a.waktu) - new Date(b.waktu); });
    var rows = [['No', 'Waktu', 'Kasir', 'Barang', 'Total', 'Tunai', 'Kembali']];
    baru.forEach(function (t) {
      rows.push([t.id, waktuLokal(t.waktu, true), t.kasir,
        t.item.map(function (i) { return i.nama + ' x' + i.jumlah; }).join(', '), t.total, t.bayar, t.kembali]);
    });
    var teks = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';');
    }).join('\r\n');
    var blob = new Blob(['\ufeff' + teks], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'laporan-maduramart-' + periode + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // ---------- Tombol ----------
  Array.prototype.forEach.call(document.querySelectorAll('[data-periode]'), function (b) {
    b.addEventListener('click', function () {
      periode = b.getAttribute('data-periode');
      semuaRiwayat = false;
      Array.prototype.forEach.call(document.querySelectorAll('[data-periode]'), function (x) { x.classList.toggle('aktif', x === b); });
      gambar();
    });
  });
  $('lainnya').addEventListener('click', function () { semuaRiwayat = !semuaRiwayat; gambar(); });
  $('unduh').addEventListener('click', unduh);
  $('cetak-lap').addEventListener('click', function () { window.print(); });
  $('cetak').addEventListener('click', function () { window.print(); });
  $('tutup-struk').addEventListener('click', function () { $('dlg-struk').close(); });

  Shell.mulai('laporan').then(function (s) {
    if (!s) return;
    return MaduraDB.semua('transaksi').then(function (d) { semuaTrx = d; gambar(); });
  }).catch(function (g) {
    console.error(g);
    Shell.toast('Data laporan belum bisa dimuat. Coba muat ulang halaman.');
  });
})();
