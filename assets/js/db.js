
var MaduraDB = (function () {
  var firebaseConfig = {
    apiKey: "AIzaSyCjOZ8fLFH5rWcGKxK9BAcAGcalF2qOrYY",
    authDomain: "maduramart-e1ad4.firebaseapp.com",
    projectId: "maduramart-e1ad4",
    storageBucket: "maduramart-e1ad4.firebasestorage.app",
    messagingSenderId: "375240501240",
    appId: "1:375240501240:web:d8b06bb0e982a9a068d80d"
  };

  var DATA_AWAL = {
    id: 1,
    nama_aplikasi: 'MaduraMart',
    slogan: 'Catat penjualan dengan rapi',
    durasi_loading: 4000 // milidetik
  };

  // Produk contoh, diisi satu kali untuk akun baru agar halaman Kasir bisa langsung dicoba.
  var PRODUK_CONTOH = [
    { nama: 'Beras 5 kg', kategori: 'Sembako', harga: 68000, stok: 20 },
    { nama: 'Minyak Goreng 1 L', kategori: 'Sembako', harga: 18000, stok: 25 },
    { nama: 'Gula Pasir 1 kg', kategori: 'Sembako', harga: 17000, stok: 30 },
    { nama: 'Telur Ayam 1 kg', kategori: 'Sembako', harga: 28000, stok: 15 },
    { nama: 'Mie Instan', kategori: 'Makanan', harga: 3500, stok: 100 },
    { nama: 'Kopi Sachet', kategori: 'Minuman', harga: 2000, stok: 80 },
    { nama: 'Teh Botol', kategori: 'Minuman', harga: 6000, stok: 40 },
    { nama: 'Air Mineral 600 ml', kategori: 'Minuman', harga: 3500, stok: 60 },
    { nama: 'Sabun Mandi', kategori: 'Kebutuhan Rumah', harga: 4500, stok: 35 },
    { nama: 'Deterjen 800 g', kategori: 'Kebutuhan Rumah', harga: 17000, stok: 4 }
  ];

  var auth = null, fs = null, authSiap = null;
  var cache = { uid: null, pengaturan: null, profil: null };

  // ---------- Firebase dan pesan galat ----------
  function mulaiFirebase() {
    if (auth) return;
    if (typeof firebase === 'undefined') throw new Error('Firebase tidak termuat. Periksa koneksi internet, lalu muat ulang halaman.');
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    fs = firebase.firestore();
    authSiap = new Promise(function (selesai) {
      var pertama = true;
      function dapat(u) {
        if (!u || (cache.uid && cache.uid !== u.uid)) cache = { uid: null, pengaturan: null, profil: null };
        if (pertama) { pertama = false; selesai(u || null); }
      }
      auth.onAuthStateChanged(dapat, function () { dapat(null); });
    });
  }

  var PESAN = {
    'auth/email-already-in-use': 'Email sudah terdaftar. Silakan masuk.',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/weak-password': 'Kata sandi minimal 6 karakter.',
    'auth/network-request-failed': 'Tidak ada koneksi internet. Coba lagi.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.',
    'auth/operation-not-allowed': 'Login Email/Kata sandi belum diaktifkan di Firebase Authentication.',
    'auth/user-disabled': 'Akun ini dinonaktifkan.',
    'auth/missing-email': 'Isi email dulu.',
    'auth/requires-recent-login': 'Demi keamanan, keluar lalu masuk lagi, kemudian coba kembali.',
    'permission-denied': 'Akses data ditolak. Periksa aturan keamanan Firestore di konsol Firebase.',
    'unavailable': 'Tidak bisa terhubung ke server. Periksa koneksi internet, lalu coba lagi.',
    'not-found': 'Database Firestore belum dibuat di konsol Firebase.'
  };

  function terjemah(e) {
    if (!e) return new Error('Terjadi kesalahan. Coba lagi.');
    if (e.code && PESAN[e.code]) return new Error(PESAN[e.code]);
    if (e.code) { console.error(e); return new Error('Terjadi kesalahan (' + e.code + '). Coba lagi.'); }
    return e;
  }
  function lemparTerjemah(e) { throw terjemah(e); }

  function siap() {
    return Promise.resolve().then(function () { mulaiFirebase(); return authSiap; });
  }

  // Pengguna yang sedang masuk, atau galat jika belum masuk
  function butuhPengguna() {
    return siap().then(function () {
      var u = auth.currentUser;
      if (!u) throw new Error('Kamu belum masuk. Silakan masuk lagi.');
      return u;
    });
  }

  function milik(u) { return fs.collection('users').doc(u.uid); }
  function koleksi(u, nama) { return milik(u).collection(nama); }
  function penghitung(u) { return koleksi(u, 'meta').doc('penghitung'); }
  function dokPengaturan(u) { return koleksi(u, 'pengaturan').doc('utama'); }
  function namaPendek(u) { return String(u.email || 'pengguna').split('@')[0]; }
  function bersihkan(x) { return JSON.parse(JSON.stringify(x)); } // membuang nilai undefined (Firestore menolaknya)

  function cekSandi(sandi) {
    if (String(sandi || '').length < 6) throw new Error('Kata sandi minimal 6 karakter.');
  }

  // ---------- Profil dan pengaturan ----------
  function ambilProfil(u) {
    if (cache.uid === u.uid && cache.profil) return Promise.resolve(cache.profil);
    return milik(u).get().then(function (snap) {
      var d = snap.exists ? snap.data() : {};
      cache.uid = u.uid;
      cache.profil = d;
      return d;
    });
  }

  // Mengisi pengaturan awal dan produk contoh sekali saja untuk akun baru
  function isiAwal(u, ada) {
    var p = Object.assign({}, DATA_AWAL, ada || {}, { id: 1, contoh_diisi: true });
    return koleksi(u, 'produk').limit(1).get().then(function (qs) {
      var b = fs.batch();
      b.set(dokPengaturan(u), p);
      if (qs.empty) {
        PRODUK_CONTOH.forEach(function (c, i) {
          b.set(koleksi(u, 'produk').doc(String(i + 1)), Object.assign({ id: i + 1 }, c));
        });
        b.set(penghitung(u), { produk: PRODUK_CONTOH.length }, { merge: true });
      }
      return b.commit();
    }).then(function () { return p; });
  }

  function pastikanData(u) {
    if (cache.uid === u.uid && cache.pengaturan) return Promise.resolve(cache.pengaturan);
    return dokPengaturan(u).get().then(function (snap) {
      if (snap.exists && snap.data().contoh_diisi) return snap.data();
      return isiAwal(u, snap.exists ? snap.data() : null);
    }).then(function (p) {
      cache.uid = u.uid;
      cache.pengaturan = p;
      return p;
    });
  }

  // Menyiapkan koneksi. Jika sudah masuk, data awal akun diisi bila masih kosong.
  // Sebelum masuk, yang dikembalikan hanya pengaturan bawaan (untuk layar pembuka).
  function siapkan() {
    return siap().then(function () {
      var u = auth.currentUser;
      if (!u) return Object.assign({}, DATA_AWAL);
      return pastikanData(u).then(function (p) { return Object.assign({}, p); });
    }).catch(lemparTerjemah);
  }

  function pengaturan() {
    return butuhPengguna().then(pastikanData).then(function (p) { return Object.assign({}, p); }).catch(lemparTerjemah);
  }

  function simpanPengaturan(data) {
    return butuhPengguna().then(function (u) {
      return pastikanData(u).then(function (p) {
        var baru = Object.assign({}, p, bersihkan(data || {}), { id: 1, contoh_diisi: true });
        return dokPengaturan(u).set(baru).then(function () { cache.pengaturan = baru; return baru; });
      });
    }).catch(lemparTerjemah);
  }

  // Nama tampilan dan foto profil (foto: data URL, '' untuk menghapus, undefined = tidak diubah).
  // Argumen pertama dipertahankan agar cocok dengan pemanggilan lama; profil selalu milik akun yang masuk.
  function simpanProfil(username, data) {
    return butuhPengguna().then(function (u) {
      var nama = String((data && data.nama_tampilan) || '').trim();
      if (nama.length > 30) throw new Error('Nama tampilan maksimal 30 karakter.');
      var isi = { nama_tampilan: nama, email: u.email || '' };
      if (data && data.foto !== undefined) isi.foto = data.foto || '';
      return milik(u).set(isi, { merge: true }).then(function () {
        cache.uid = u.uid;
        cache.profil = Object.assign({}, cache.profil || {}, isi);
        return isi;
      });
    }).catch(lemparTerjemah);
  }

  // ---------- Akun: masuk, daftar, keluar ----------
  // Mengembalikan true jika berhasil, false jika email atau kata sandi salah.
  function masuk(email, sandi) {
    return siap().then(function () {
      return auth.signInWithEmailAndPassword(String(email || '').trim(), String(sandi || ''));
    }).then(function () {
      return true;
    }, function (e) {
      var salah = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email', 'auth/missing-password'];
      if (salah.indexOf(e.code) !== -1) return false;
      throw terjemah(e);
    });
  }

  function daftar(nama, email, sandi) {
    return siap().then(function () {
      cekSandi(sandi);
      return auth.createUserWithEmailAndPassword(String(email || '').trim(), String(sandi));
    }).then(function (cred) {
      var u = cred.user;
      return milik(u).set({
        email: u.email || '',
        nama_tampilan: String(nama || '').trim().slice(0, 30),
        foto: '',
        peran: 'admin',
        dibuat_pada: new Date().toISOString()
      }).then(function () { return true; });
    }).catch(lemparTerjemah);
  }

  // Mengirim email berisi tautan untuk membuat kata sandi baru.
  // Email yang tidak terdaftar diperlakukan sama seperti yang terdaftar (tetap "berhasil"),
  // supaya orang lain tidak bisa mengecek siapa saja yang punya akun.
  function kirimResetSandi(email) {
    return siap().then(function () {
      auth.languageCode = 'id';
      return auth.sendPasswordResetEmail(String(email || '').trim());
    }).then(function () {
      return true;
    }, function (e) {
      if (e && e.code === 'auth/user-not-found') return true;
      throw terjemah(e);
    });
  }

  function keluar() {
    return siap().then(function () {
      cache = { uid: null, pengaturan: null, profil: null };
      return auth.signOut();
    });
  }

  // Mengembalikan data sesi jika pengguna masih masuk, atau null.
  // Setiap akun adalah pemilik data tokonya sendiri, jadi perannya selalu admin.
  function sesiAktif() {
    return siap().then(function () {
      var u = auth.currentUser;
      if (!u) return null;
      return ambilProfil(u).then(function (d) {
        return {
          id: 1, uid: u.uid, username: namaPendek(u), email: u.email || '', peran: 'admin',
          nama_tampilan: d.nama_tampilan || '', foto: d.foto || '', google: false,
          masuk_pada: (u.metadata && u.metadata.lastSignInTime) || ''
        };
      });
    }).catch(lemparTerjemah);
  }

  // Kata sandi diganti lewat Firebase: akun dikonfirmasi dulu dengan kata sandi lama
  function gantiSandi(username, lama, baru) {
    return butuhPengguna().then(function (u) {
      cekSandi(baru);
      var kredensial = firebase.auth.EmailAuthProvider.credential(u.email, String(lama || ''));
      return u.reauthenticateWithCredential(kredensial).then(function () { return u.updatePassword(baru); });
    }).catch(function (e) {
      if (e && (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password')) throw new Error('Kata sandi lama salah.');
      throw terjemah(e);
    });
  }

  // ---------- Pengguna (sekarang satu akun = satu toko) ----------
  function daftarPengguna() {
    return butuhPengguna().then(function (u) {
      return ambilProfil(u).then(function (d) {
        return [{ username: namaPendek(u), peran: 'admin', dibuat_pada: d.dibuat_pada || null, google: false, email: u.email || '', nama_tampilan: d.nama_tampilan || '' }];
      });
    }).catch(lemparTerjemah);
  }

  function tidakTersedia() {
    return Promise.reject(new Error('Fitur ini tidak tersedia. Setiap orang membuat akunnya sendiri lewat halaman Daftar.'));
  }

  // ---------- Membaca data ----------
  function semua(tabel) {
    return butuhPengguna().then(function (u) {
      if (tabel === 'pengaturan') return pastikanData(u).then(function (p) { return [Object.assign({}, p)]; });
      if (tabel === 'pengguna') return daftarPengguna();
      if (tabel !== 'produk' && tabel !== 'transaksi') throw new Error('Tabel tidak dikenal: ' + tabel);
      return koleksi(u, tabel).get().then(function (qs) {
        return qs.docs.map(function (d) { return d.data(); }).sort(function (a, b) { return a.id - b.id; });
      });
    }).catch(lemparTerjemah);
  }

  // ---------- Produk ----------
  // Menambah produk baru (tanpa id) atau mengubah produk (dengan id).
  // Nomor produk baru diambil dari penghitung supaya id tetap berupa angka berurutan.
  function simpanProduk(produk) {
    return butuhPengguna().then(function (u) {
      if (!String(produk.nama || '').trim()) throw new Error('Nama produk wajib diisi');
      if (!(produk.harga >= 0) || !(produk.stok >= 0)) throw new Error('Harga dan stok tidak boleh negatif');
      var isi = { nama: String(produk.nama).trim(), kategori: String(produk.kategori || 'Lainnya'), harga: Number(produk.harga), stok: Number(produk.stok) };

      if (produk.id !== undefined && produk.id !== null) {
        isi.id = Number(produk.id);
        return koleksi(u, 'produk').doc(String(isi.id)).set(isi).then(function () { return isi; });
      }
      var cRef = penghitung(u);
      return fs.runTransaction(function (tx) {
        return tx.get(cRef).then(function (c) {
          var n = ((c.exists && c.data().produk) || 0) + 1;
          isi.id = n;
          tx.set(cRef, { produk: n }, { merge: true });
          tx.set(koleksi(u, 'produk').doc(String(n)), isi);
          return isi;
        });
      });
    }).catch(lemparTerjemah);
  }

  function hapusProduk(id) {
    return butuhPengguna().then(function (u) {
      return koleksi(u, 'produk').doc(String(id)).delete();
    }).catch(lemparTerjemah);
  }

  // ---------- Transaksi ----------
  // Mencatat transaksi dan mengurangi stok dalam satu transaksi Firestore
  // (jika satu langkah gagal, semuanya dibatalkan). Total dihitung dari harga di database.
  function catatTransaksi(data) {
    return butuhPengguna().then(function (u) {
      if (!data.item || !data.item.length) throw new Error('Keranjang kosong');
      var cRef = penghitung(u);
      var refProduk = data.item.map(function (it) { return koleksi(u, 'produk').doc(String(it.id)); });

      return fs.runTransaction(function (tx) {
        // Semua pembacaan dulu, baru penulisan
        var bacaan = refProduk.map(function (r) { return tx.get(r); });
        bacaan.push(tx.get(cRef));
        return Promise.all(bacaan).then(function (snaps) {
          var c = snaps[snaps.length - 1], baris = [];
          data.item.forEach(function (it, i) {
            if (!snaps[i].exists) throw new Error('Produk tidak ditemukan');
            var p = snaps[i].data();
            if (Number(p.stok) < it.jumlah) throw new Error('Stok ' + p.nama + ' tidak cukup');
            baris.push({ id: p.id, nama: p.nama, harga: p.harga, jumlah: it.jumlah, subtotal: p.harga * it.jumlah });
            tx.update(refProduk[i], { stok: Number(p.stok) - it.jumlah });
          });
          var total = baris.reduce(function (a, b) { return a + b.subtotal; }, 0);
          if (!(data.bayar >= total)) throw new Error('Uang yang diterima kurang');
          var n = ((c.exists && c.data().transaksi) || 0) + 1;
          var rec = { id: n, waktu: new Date().toISOString(), kasir: String(data.kasir || ''), item: baris, total: total, bayar: data.bayar, kembali: data.bayar - total };
          tx.set(cRef, { transaksi: n }, { merge: true });
          tx.set(koleksi(u, 'transaksi').doc(String(n)), rec);
          return rec;
        });
      });
    }).catch(lemparTerjemah);
  }

  // ---------- Data: hapus, reset, cadangan ----------
  // Menjalankan penulisan dalam kelompok (batas Firestore 500 operasi per batch)
  function berkelompok(daftarItem, aksi) {
    var tugas = Promise.resolve();
    for (var i = 0; i < daftarItem.length; i += 400) {
      (function (potong) {
        tugas = tugas.then(function () {
          var b = fs.batch();
          potong.forEach(function (x) { aksi(b, x); });
          return b.commit();
        });
      })(daftarItem.slice(i, i + 400));
    }
    return tugas;
  }

  function kosongkan(u, nama) {
    return koleksi(u, nama).get().then(function (qs) {
      return berkelompok(qs.docs.map(function (d) { return d.ref; }), function (b, r) { b.delete(r); });
    });
  }

  function hapusTransaksi() {
    return butuhPengguna().then(function (u) { return kosongkan(u, 'transaksi'); }).catch(lemparTerjemah);
  }

  // Menghapus produk, transaksi, dan pengaturan akun ini lalu keluar.
  // Saat masuk lagi, data awal (pengaturan dan produk contoh) diisi ulang otomatis.
  function resetSemua() {
    return butuhPengguna().then(function (u) {
      return Promise.all(['produk', 'transaksi', 'pengaturan', 'meta'].map(function (n) { return kosongkan(u, n); }));
    }).then(function () { return keluar(); }).catch(lemparTerjemah);
  }

  function ekspor() {
    return butuhPengguna().then(function (u) {
      return Promise.all([pastikanData(u), semua('produk'), semua('transaksi')]).then(function (h) {
        return { aplikasi: 'MaduraMart', versi: 2, dibuat: new Date().toISOString(), data: { pengaturan: [h[0]], pengguna: [], produk: h[1], transaksi: h[2] } };
      });
    }).catch(lemparTerjemah);
  }

  function adaId(r) { return r && isFinite(Number(r.id)); }
  function idTerbesar(l) { return l.reduce(function (a, r) { return Math.max(a, Number(r.id)); }, 0); }

  // Memulihkan produk, transaksi, dan pengaturan dari file cadangan (termasuk cadangan versi lama).
  // Daftar pengguna di file cadangan diabaikan: akun dikelola oleh Firebase.
  function impor(o) {
    return Promise.resolve().then(function () {
      if (!o || o.aplikasi !== 'MaduraMart' || !o.data) throw new Error('File ini bukan cadangan MaduraMart.');
      ['produk', 'transaksi'].forEach(function (t) { if (!Array.isArray(o.data[t])) throw new Error('Isi cadangan tidak lengkap.'); });
      return butuhPengguna();
    }).then(function (u) {
      var produk = o.data.produk.filter(adaId).map(function (p) { return Object.assign(bersihkan(p), { id: Number(p.id) }); });
      var transaksi = o.data.transaksi.filter(adaId).map(function (t) { return Object.assign(bersihkan(t), { id: Number(t.id) }); });
      var lama = (Array.isArray(o.data.pengaturan) && o.data.pengaturan[0]) || {};
      return Promise.all([kosongkan(u, 'produk'), kosongkan(u, 'transaksi')]).then(function () {
        return berkelompok(produk, function (b, p) { b.set(koleksi(u, 'produk').doc(String(p.id)), p); });
      }).then(function () {
        return berkelompok(transaksi, function (b, t) { b.set(koleksi(u, 'transaksi').doc(String(t.id)), t); });
      }).then(function () {
        var baru = Object.assign({}, DATA_AWAL, bersihkan(lama), { id: 1, contoh_diisi: true });
        return Promise.all([
          dokPengaturan(u).set(baru),
          penghitung(u).set({ produk: idTerbesar(produk), transaksi: idTerbesar(transaksi) })
        ]).then(function () { cache.pengaturan = baru; });
      });
    }).catch(lemparTerjemah);
  }

  return {
    siapkan: siapkan, masuk: masuk, sesiAktif: sesiAktif, keluar: keluar, daftar: daftar, kirimResetSandi: kirimResetSandi,
    semua: semua, catatTransaksi: catatTransaksi, simpanProduk: simpanProduk, hapusProduk: hapusProduk,
    simpanProfil: simpanProfil, pengaturan: pengaturan, simpanPengaturan: simpanPengaturan,
    gantiSandi: gantiSandi, daftarPengguna: daftarPengguna,
    tambahPengguna: tidakTersedia, ubahPeran: tidakTersedia, aturSandi: tidakTersedia, hapusPengguna: tidakTersedia,
    hapusTransaksi: hapusTransaksi, resetSemua: resetSemua, ekspor: ekspor, impor: impor
  };
})();
