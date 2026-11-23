/*
 * app.js — alur belajar "Tandan Masak":
 * tujuan → eksplorasi VR → amati AR → sortasi (kuis) → studi kasus → refleksi GenAI → ringkasan.
 * Tidak ada kunci API. Integrasi GenAI berupa penyusun prompt kontekstual dari jejak belajar
 * mahasiswa, yang disalin lalu ditempel ke layanan GenAI pilihan mahasiswa.
 * Progres disimpan di localStorage perangkat (bisa kosong di mode privat; aplikasi tetap jalan).
 */
(function () {
  'use strict';
  var K = window.KONTEN;
  var TB = window.TBSModel;
  var STORE = 'tandan-masak-v1';
  var BUNCH_Y = 0.267; // harus sama dengan make_glb.mjs (tinggi pusat tandan pada model AR)
  var MV_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';

  var STEPS = [
    { id: 'tujuan', label: 'Tujuan' },
    { id: 'vr', label: 'Eksplorasi VR' },
    { id: 'ar', label: 'Amati AR' },
    { id: 'kuis', label: 'Sortasi' },
    { id: 'kasus', label: 'Studi kasus' },
    { id: 'refleksi', label: 'Refleksi GenAI' },
    { id: 'ringkasan', label: 'Ringkasan' }
  ];
  var MAKS = { vr: 28, tph: 4, ar: 4, kuis: 9, kasus: 12 };
  var AR_MODEL = {
    X: { fraksi: '2', seed: 202, file: 'assets/models/tbs-f2.glb' },
    Y: { fraksi: '4', seed: 204, file: 'assets/models/tbs-f4.glb' },
    Z: { fraksi: '0', seed: 201, file: 'assets/models/tbs-f0.glb' }
  };

  // ------------------------------------------------------------ state
  function baru() {
    return {
      nama: '', pre: {}, post: {}, tandan: {}, tph: {}, ar: {}, kuis: {}, kasus: {}, refleksi: {},
      ai: { disalin: 0, tempel: '', cek: {}, catatan: '' }, lencana: {}, log: [], suara: true,
      mulai: new Date().toISOString()
    };
  }
  function muat() { try { var s = localStorage.getItem(STORE); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  var S = muat() || baru();
  ['pre', 'post', 'tandan', 'tph', 'ar', 'kuis', 'kasus', 'refleksi', 'lencana'].forEach(function (k) { if (!S[k]) { S[k] = {}; } });
  if (!S.ai) { S.ai = { disalin: 0, tempel: '', cek: {}, catatan: '' }; }
  if (!S.log) { S.log = []; }
  function simpan() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* mode privat: abaikan */ } }
  function catat(jenis, teks) {
    S.log.push({ t: new Date().toISOString(), jenis: jenis, teks: teks });
    if (S.log.length > 200) { S.log.shift(); }
    simpan();
  }

  // ------------------------------------------------------------ util
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function acak(arr, seed) {
    var r = TB.rng(seed), a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function fraksiInfo(kode) { return K.fraksi.filter(function (f) { return f.kode === kode; })[0]; }
  function labelKep(id) { var k = K.keputusan.filter(function (x) { return x.id === id; })[0]; return k ? k.label : '–'; }
  function tandanById(id) { return K.tandan.filter(function (t) { return t.id === id; })[0]; }
  var toastTimer = null;
  function toast(msg, ms) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('tampil');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('tampil'); }, ms || 3200);
  }
  function salin(teks, onOk) {
    function cadangan() {
      var ta = document.createElement('textarea');
      ta.value = teks; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      if (ok) { onOk(); } else { toast('Salin otomatis tidak tersedia. Pilih teks prompt lalu salin manual.'); }
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(teks).then(onOk, cadangan);
    } else { cadangan(); }
  }

  // ------------------------------------------------------------ suara
  var actx = null;
  function audio() {
    if (!S.suara) { return null; }
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) { return null; }
    if (!actx) { actx = new C(); }
    if (actx.state === 'suspended') { actx.resume(); }
    return actx;
  }
  // Nada petik sintetis (Karplus–Strong), terinspirasi bunyi petikan panting Banjar [CEK].
  function petik(freq, delay, dur, gain) {
    var c = audio(); if (!c) { return; }
    var sr = c.sampleRate, len = Math.floor(sr * dur), N = Math.max(2, Math.floor(sr / freq));
    var buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N), idx = 0;
    for (var i = 0; i < N; i++) { ring[i] = Math.random() * 2 - 1; }
    for (var k = 0; k < len; k++) {
      var v = ring[idx], nx = ring[(idx + 1) % N];
      ring[idx] = 0.996 * 0.5 * (v + nx);
      d[k] = v; idx = (idx + 1) % N;
    }
    var src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; g.gain.value = gain;
    src.connect(g); g.connect(c.destination);
    src.start(c.currentTime + delay);
  }
  var bunyi = {
    benar: function () { [392, 523.25, 659.25].forEach(function (f, i) { petik(f, i * 0.11, 1.2, 0.32); }); },
    salah: function () { petik(220, 0, 0.9, 0.28); petik(196, 0.14, 1.0, 0.24); },
    lencana: function () { [392, 440, 523.25, 587.33, 783.99].forEach(function (f, i) { petik(f, i * 0.1, 1.4, 0.28); }); }
  };
  function ucap(teks) {
    if (!S.suara || !('speechSynthesis' in window)) { toast('Suara pemandu tidak tersedia di peramban ini.'); return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(teks);
      u.lang = 'id-ID'; u.rate = 0.95;
      var v = window.speechSynthesis.getVoices().filter(function (x) { return /^id/i.test(x.lang); })[0];
      if (v) { u.voice = v; }
      window.speechSynthesis.speak(u);
    } catch (e) { /* abaikan */ }
  }

  // ------------------------------------------------------------ grafis kecil
  var AVATAR = '<svg class="avatar" viewBox="0 0 64 64" aria-hidden="true"><defs><clipPath id="clipAv"><circle cx="32" cy="32" r="31"/></clipPath></defs>' +
    '<g clip-path="url(#clipAv)"><rect width="64" height="64" fill="#5a2a68"/>' +
    '<path d="M0 44 L8 36 L16 44 L24 36 L32 44 L40 36 L48 44 L56 36 L64 44 L64 64 L0 64Z" fill="#e7b12f"/>' +
    '<path d="M12 64 Q14 47 32 47 Q50 47 52 64Z" fill="#d9622a"/><path d="M18 58 L24 52 L30 58 L36 52 L42 58" stroke="#fff" stroke-dasharray="2 2" fill="none"/>' +
    '<circle cx="32" cy="35" r="11" fill="#b07a52"/>' +
    '<circle cx="28" cy="35" r="1.5" fill="#2a1d14"/><circle cx="36" cy="35" r="1.5" fill="#2a1d14"/>' +
    '<path d="M27 40 Q32 43.5 37 40" stroke="#2a1d14" fill="none" stroke-width="1.6" stroke-linecap="round"/>' +
    '<ellipse cx="32" cy="24" rx="23" ry="5" fill="#d6bd85" stroke="#8a6a3c"/><path d="M17 24 Q32 7 47 24Z" fill="#e2cb94" stroke="#8a6a3c"/>' +
    '<path d="M19 22 L45 22" stroke="#5a2a68" stroke-width="2"/></g><circle cx="32" cy="32" r="31" fill="none" stroke="#e7b12f" stroke-width="2"/></svg>';

  function pemandu(kunci) {
    var b = K.pemandu.baris[kunci];
    if (!b) { return ''; }
    return '<div class="pemandu">' + AVATAR + '<div class="isi"><div class="nama">' + esc(K.pemandu.nama) + ' · ' + esc(K.pemandu.peran) + '</div>' +
      '<div class="banjar" lang="bjn">“' + esc(b.banjar) + '”</div><p class="indo">' + esc(b.indo) + '</p>' +
      '<button type="button" class="btn ghost small" data-ucap="' + esc(kunci) + '">Dengarkan</button></div></div>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ucap]');
    if (!b) { return; }
    var baris = K.pemandu.baris[b.getAttribute('data-ucap')];
    if (baris) { ucap(baris.banjar + '. ' + baris.indo); }
  });

  // Strip fraksi bermotif sasirangan
  function strip(nama, terpilih, kunci) {
    return '<div class="strip" role="radiogroup" aria-label="Pilih fraksi" data-strip="' + esc(nama) + '">' + K.fraksi.map(function (f) {
      var on = terpilih === f.kode;
      return '<button type="button" class="tile' + (kunci === f.kode ? ' kunci' : '') + '" role="radio" aria-checked="' + on + '" data-kode="' + f.kode + '" style="background-color:' + TB.COLORS[f.kode][1] + '" title="Fraksi ' + f.kode + ': ' + esc(f.derajat) + '"><span class="kode">' + f.kode + '</span><span class="nm">' + esc(f.derajat) + '</span></button>';
    }).join('') + '</div>';
  }
  function pasangStrip(root, onPick) {
    $$('.strip', root).forEach(function (st) {
      st.addEventListener('click', function (e) {
        var t = e.target.closest('.tile');
        if (!t || st.classList.contains('terkunci')) { return; }
        $$('.tile', st).forEach(function (x) { x.setAttribute('aria-checked', String(x === t)); });
        onPick(st.getAttribute('data-strip'), t.getAttribute('data-kode'));
      });
    });
  }

  // Sampel 40 buah luar (grid 8 × 5). Buah lepas digambar sebagai bekas pucat bergaris putus.
  function sampelSVG(lepas, kodeWarna, dalam) {
    var cols = TB.COLORS[kodeWarna] || TB.COLORS['2'];
    var urut = acak(Array.apply(null, { length: 40 }).map(function (_, i) { return i; }), lepas * 31 + 7 + hash(kodeWarna));
    var lp = {};
    urut.slice(0, lepas).forEach(function (i) { lp[i] = true; });
    var r = TB.rng(lepas + 3);
    var out = '<svg viewBox="0 0 368 ' + (dalam ? 262 : 236) + '" role="img" aria-label="Sampel 40 buah luar; hitung bekas buah yang lepas"><title>Sampel 40 buah luar</title>';
    out += '<rect x="0" y="0" width="368" height="236" rx="12" fill="#fbf6ea"/>';
    for (var i = 0; i < 40; i++) {
      var cx = 26 + (i % 8) * 45 + (Math.floor(i / 8) % 2 ? 6 : -2), cy = 26 + Math.floor(i / 8) * 45;
      if (lp[i]) {
        out += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="15" ry="18" fill="#efe2bf" stroke="#9c7d48" stroke-width="2" stroke-dasharray="4 3"/>';
        out += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="5" ry="6" fill="#d8c08b"/>';
      } else {
        var c = cols[Math.floor(r() * 3)];
        out += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="16" ry="19" fill="' + c + '" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>';
        out += '<ellipse cx="' + (cx - 5) + '" cy="' + (cy - 7) + '" rx="4" ry="5" fill="rgba(255,255,255,0.28)"/>';
      }
    }
    if (dalam) {
      out += '<rect x="6" y="236" width="356" height="24" rx="8" fill="#5e4128"/><text x="184" y="253" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">Lapisan dalam: banyak buah ikut lepas</text>';
    }
    return out + '</svg>';
  }

  // ------------------------------------------------------------ penilaian
  var ALASAN = {
    tidak: 'Mengapa: kandungan minyak buah mentah belum maksimal. ALB-nya memang rendah (±2,3% pada F0), tetapi di PKS buah mentah dikenai potongan 50% × persen buah mentah. Biarkan di pokok dan periksa lagi pada rotasi berikutnya.',
    batas: 'Mengapa: fraksi 1 adalah batas bawah panen. Boleh dipotong, tetapi belum ideal; brondolan di piringan biasanya masih di bawah standar.',
    ideal: 'Mengapa: fraksi 2–3 memberi minyak paling banyak dengan ALB yang masih terkendali (3,1–3,3%).',
    segera: 'Mengapa: pada fraksi 4 ALB mulai naik dan makin banyak brondolan tercecer. Potong hari ini dan kutip semua brondolan.',
    terlambat: 'Mengapa: pada fraksi 5 buah dalam ikut lepas dan ALB tinggi (±4,0%). Tandan tetap dipotong agar tidak menjadi losses, tetapi ini tanda rotasi panen terlambat.'
  };
  function kunciTandan(t) {
    var lepas = TB.sample40(t.fraksi);
    return { info: fraksiInfo(t.fraksi), lepas: lepas, persen: lepas / 40 * 100 };
  }
  function nilaiTandan(t, j) {
    var k = kunciTandan(t);
    var ada = j.persen !== '' && j.persen !== null && j.persen !== undefined && !isNaN(Number(j.persen));
    var persenOk = ada && Math.abs(Number(j.persen) - k.persen) <= 2.5;
    var fraksiOk = j.fraksi === t.fraksi;
    var kepOk = j.keputusan === k.info.kelompok;
    return { persenOk: persenOk, fraksiOk: fraksiOk, kepOk: kepOk, skor: (persenOk ? 1 : 0) + (fraksiOk ? 2 : 0) + (kepOk ? 1 : 0) };
  }
  function umpanTandan(t, j) {
    var k = kunciTandan(t), br = TB.BRONDOLAN_PIRINGAN[t.fraksi], baris = [];
    var ada = j.persen !== '' && j.persen !== null && j.persen !== undefined;
    baris.push('Hitungan: ' + k.lepas + ' dari 40 buah luar sudah lepas = ' + fmt(k.persen) + '%.' + (ada ? ' Jawaban Anda: ' + fmt(Number(j.persen)) + '%.' : ''));
    if (t.fraksi === '5') { baris.push('Buah lapisan dalam juga sudah lepas, sehingga tandan ini masuk fraksi 5, bukan fraksi 4.'); }
    baris.push('Rentang ' + k.info.persen + ' → Fraksi ' + t.fraksi + ' (' + k.info.derajat + '). Pilihan Anda: Fraksi ' + (j.fraksi || '–') + '.');
    baris.push('Keputusan: ' + k.info.keputusan + '. Pilihan Anda: ' + labelKep(j.keputusan) + '.');
    baris.push('Brondolan di piringan: ' + br + ' butir (' + (br >= 5 ? 'memenuhi' : 'belum memenuhi') + ' kriteria contoh ≥ 5 butir per tandan).');
    baris.push(ALASAN[k.info.kelompok]);
    return baris;
  }
  function skorVR() { var s = 0; Object.keys(S.tandan).forEach(function (id) { s += S.tandan[id].skor || 0; }); return s; }
  function skorTPH() { var s = 0; Object.keys(S.tph).forEach(function (id) { if (S.tph[id].benar) { s++; } }); return s; }
  function skorAR() { return S.ar.skor || 0; }
  function skorKuis() { var s = 0; Object.keys(S.kuis).forEach(function (id) { if (S.kuis[id].benar) { s++; } }); return s; }
  function skorKasus() {
    var s = 0;
    ['d1', 'd2', 'd3'].forEach(function (id) { if (S.kasus[id] && S.kasus[id].skor) { s += S.kasus[id].skor; } });
    ['c1', 'c2'].forEach(function (id) { if (S.kasus[id] && S.kasus[id].benar) { s += 2; } });
    if (S.kasus.rekomendasi && S.kasus.rekomendasi.length >= 150) { s += 2; }
    return s;
  }
  function skorTes(obj) { var s = 0; K.tesSingkat.forEach(function (q) { if (obj[q.id] === q.benar) { s++; } }); return s; }
  function bisaPanen(t) { return fraksiInfo(t.fraksi).kelompok !== 'tidak'; }

  function cekLencana() {
    var done = K.tandan.filter(function (t) { return S.tandan[t.id]; });
    var tepat = done.filter(function (t) { return S.tandan[t.id].fraksiOk; }).length;
    var baruDapat = [];
    function beri(id, syarat) { if (syarat && !S.lencana[id]) { S.lencana[id] = new Date().toISOString(); baruDapat.push(id); } }
    beri('kayuh', done.length === K.tandan.length && tepat >= 6);
    var semuaPanen = K.tandan.filter(bisaPanen).every(function (t) { return S.tandan[t.id] && S.tandan[t.id].dipanen; });
    beri('waja', done.length === K.tandan.length && semuaPanen && Object.keys(S.tph).length === K.tph.length);
    var nCek = Object.keys(S.ai.cek || {}).filter(function (k) { return S.ai.cek[k]; }).length;
    beri('cek', (S.ai.tempel || '').trim().length >= 30 && nCek >= 2);
    if (baruDapat.length) {
      simpan();
      bunyi.lencana();
      baruDapat.forEach(function (id, i) {
        setTimeout(function () { toast('Lencana nilai banua: ' + K.nilaiBanua[id].nama + ' (' + K.nilaiBanua[id].arti + ')', 4200); }, i * 4300);
      });
    }
  }

  // ------------------------------------------------------------ navigasi
  var aktif = null;
  function renderStepper() {
    var nav = $('#stepper');
    nav.innerHTML = STEPS.map(function (s, i) {
      return '<button type="button" data-go="' + s.id + '" class="' + (selesai(s.id) ? 'selesai' : '') + '"' + (aktif === s.id ? ' aria-current="step"' : '') + '><span class="no">' + (selesai(s.id) ? '✓' : (i + 1)) + '</span>' + esc(s.label) + '</button>';
    }).join('');
  }
  function selesai(id) {
    if (id === 'tujuan') { return Object.keys(S.pre).length === K.tesSingkat.length; }
    if (id === 'vr') { return Object.keys(S.tandan).length === K.tandan.length && Object.keys(S.tph).length === K.tph.length; }
    if (id === 'ar') { return !!S.ar.selesai; }
    if (id === 'kuis') { return Object.keys(S.kuis).length === K.kuis.length; }
    if (id === 'kasus') { return !!(S.kasus.d1 && S.kasus.d2 && S.kasus.d3 && S.kasus.c1 && S.kasus.c2 && S.kasus.rekomendasi); }
    if (id === 'refleksi') { return K.refleksi.every(function (r) { return (S.refleksi[r.id] || '').trim().length > 0; }); }
    if (id === 'ringkasan') { return Object.keys(S.post).length === K.tesSingkat.length; }
    return false;
  }
  document.addEventListener('click', function (e) {
    var k = e.target.closest && e.target.closest('[data-ke-adegan]');
    if (k) { $('#vr-stage').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  document.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('[data-go]');
    if (!g) { return; }
    e.preventDefault();
    pergi(g.getAttribute('data-go'));
  });
  function pergi(id) {
    if (location.hash !== '#' + id) { location.hash = id; } else { tampil(id); }
  }
  window.addEventListener('hashchange', function () { tampil((location.hash || '#tujuan').slice(1)); });

  var RENDER = {};
  function tampil(id) {
    if (!STEPS.some(function (s) { return s.id === id; })) { id = 'tujuan'; }
    aktif = id;
    $$('.step').forEach(function (s) { s.classList.toggle('aktif', s.getAttribute('data-step') === id); });
    if (RENDER[id]) { RENDER[id](); }
    renderStepper();
    vrJalan(id === 'vr');
    var cur = $('#stepper [aria-current="step"]');
    if (cur && cur.scrollIntoView) { cur.scrollIntoView({ block: 'nearest', inline: 'center' }); }
    window.scrollTo(0, 0);
  }
  function navBawah(prev, next, labelNext) {
    return '<div class="step-nav">' + (prev ? '<button type="button" class="btn ghost" data-go="' + prev + '">← Kembali</button>' : '<span></span>') +
      (next ? '<button type="button" class="btn" data-go="' + next + '">' + esc(labelNext || 'Lanjut') + ' →</button>' : '') + '</div>';
  }

  // ------------------------------------------------------------ 1. Tujuan
  function heroArt() {
    var w = 360, out = '<svg viewBox="0 0 360 230" role="img" aria-label="Skala kematangan tandan dari fraksi 00 sampai 5 dalam motif sasirangan">';
    out += '<rect width="360" height="230" rx="12" fill="#17392b"/>';
    out += '<text x="180" y="28" text-anchor="middle" fill="#fff" font-size="15" font-weight="700">Skala kematangan = kain sasirangan</text>';
    K.fraksi.forEach(function (f, i) {
      var x = 14 + i * 47.5, c = TB.COLORS[f.kode][1];
      out += '<rect x="' + x + '" y="44" width="44" height="120" rx="8" fill="' + c + '"/>';
      for (var y = 58; y < 160; y += 22) {
        out += '<path d="M' + (x + 3) + ' ' + y + ' l9.5 -9 l9.5 9 l9.5 -9 l9.5 9" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.6" stroke-dasharray="2 2.4"/>';
      }
      out += '<text x="' + (x + 22) + '" y="186" text-anchor="middle" fill="#fff" font-size="15" font-weight="800">' + f.kode + '</text>';
    });
    out += '<text x="14" y="212" fill="#e7b12f" font-size="12">hitam keunguan</text><text x="346" y="212" text-anchor="end" fill="#e7b12f" font-size="12">jingga kemerahan → kusam</text>';
    return out + '</svg>';
  }
  function soalTes(nama, obj, kunciTampil) {
    return K.tesSingkat.map(function (q, qi) {
      var urut = acak(q.pilihan.map(function (_, i) { return i; }), hash(q.id + nama));
      return '<div class="form-item"><span class="lbl">' + (qi + 1) + '. ' + esc(q.soal) + '</span><div class="opsi-list">' + urut.map(function (i) {
        var cls = obj[q.id] === i ? ' dipilih' : '';
        if (kunciTampil && obj[q.id] !== undefined) { cls += i === q.benar ? ' benar' : (obj[q.id] === i ? ' salah' : ''); }
        return '<label class="opsi' + cls + '"><input type="radio" name="' + nama + '-' + q.id + '" value="' + i + '"' + (obj[q.id] === i ? ' checked' : '') + (obj[q.id] !== undefined ? ' disabled' : '') + '><span>' + esc(q.pilihan[i]) + '</span></label>';
      }).join('') + '</div></div>';
    }).join('');
  }
  RENDER.tujuan = function () {
    var el = $('#step-tujuan');
    var preDone = Object.keys(S.pre).length === K.tesSingkat.length;
    el.innerHTML =
      '<div class="hero kartu sasirangan"><div><h1 id="h-tujuan">Tandan Masak</h1>' +
      '<p><strong>Belajar kriteria matang panen dan fraksi kematangan tandan buah segar (TBS) kelapa sawit</strong> melalui kebun virtual (VR), model tandan di meja Anda (AR), dan asisten GenAI untuk refleksi.</p>' +
      '<p class="muted kecil">Mata kuliah Budidaya dan Penanganan Pascapanen Kelapa Sawit (BIK231209, 2 SKS) · D3 Agroindustri Politala · Materi rujukan: Manajemen Panen Kelapa Sawit (Pertemuan 12–13).</p>' +
      '<div class="row"><button type="button" class="btn oranye" data-go="vr">Mulai ke kebun VR →</button><button type="button" class="btn ghost" id="btn-rujukan2">Lihat tabel fraksi</button></div></div>' +
      '<div class="hero-art">' + heroArt() + '</div></div>' +
      pemandu('tujuan') +
      '<div class="grid2"><div class="kartu"><h2>Tujuan belajar</h2><ol>' +
      '<li>Menghitung persentase buah luar yang membrondol dan menentukan fraksi kematangan tandan (00–5). <span class="label-cpmk">CPMK081</span></li>' +
      '<li>Memutuskan tindakan panen untuk tiap fraksi dan menjelaskan dampaknya pada rendemen dan ALB. <span class="label-cpmk">CPMK081</span></li>' +
      '<li>Mengidentifikasi kesalahan penanganan pascapanen di TPH (brondolan, tangkai, janjang kosong) dan menghitung potongan timbangan. <span class="label-cpmk">CPMK051</span></li>' +
      '<li>Menganalisis kasus panen di kebun rakyat dan menyusun rekomendasi tertulis, termasuk mengaitkan mutu buah dengan hama tikus. <span class="label-cpmk">CPMK051</span> <span class="label-cpmk">CPMK083</span></li>' +
      '<li>Merefleksikan pemahaman bersama GenAI secara kritis: bertanya, lalu mengecek jawaban AI dengan materi.</li></ol></div>' +
      '<div class="kartu"><h2>Alur dan waktu (± 60 menit)</h2><ol class="kecil">' +
      '<li><b>Eksplorasi VR</b> (20 menit): periksa 7 tandan di blok A-1, panen yang layak, periksa TPH.</li>' +
      '<li><b>Amati AR</b> (8 menit): bandingkan tiga tandan dari dekat di meja Anda.</li>' +
      '<li><b>Sortasi</b> (10 menit): 9 soal klasifikasi, kelainan mutu, dan hitungan potongan.</li>' +
      '<li><b>Studi kasus</b> (12 menit): bantu Acil Salmah memutuskan panen dan angkutan.</li>' +
      '<li><b>Refleksi GenAI</b> (8 menit): tanya AI dengan prompt dari jejak belajar Anda, lalu cek faktanya.</li>' +
      '<li><b>Ringkasan</b>: tes akhir, skor, lencana nilai banua, unduh jurnal belajar.</li></ol>' +
      '<p class="kecil muted">Perangkat: ponsel atau laptop dengan peramban Chrome, Edge, atau Safari terbaru. Headset/kacamata VR bersifat opsional.</p></div></div>' +
      '<div class="kartu"><h2>Sebelum mulai</h2><div class="form-item"><label class="lbl" for="in-nama">Nama atau NIM (opsional, hanya untuk jurnal belajar Anda)</label>' +
      '<input type="text" id="in-nama" maxlength="60" value="' + esc(S.nama) + '" autocomplete="off"></div>' +
      '<h3>Tes awal singkat (3 soal)</h3><p class="kecil muted">Jawab sesuai pemahaman Anda sekarang. Pembahasannya ada di bagian Ringkasan.</p>' +
      '<div id="tes-awal">' + soalTes('pre', S.pre, false) + '</div>' +
      (preDone ? '<p><strong>Tes awal tersimpan: ' + skorTes(S.pre) + '/3.</strong></p>' : '<button type="button" class="btn" id="btn-pre">Simpan tes awal</button>') +
      '</div>' + navBawah(null, 'vr', 'Eksplorasi VR');
    $('#in-nama').addEventListener('input', function (e) { S.nama = e.target.value; simpan(); });
    $('#btn-rujukan2').addEventListener('click', bukaRujukan);
    var bp = $('#btn-pre');
    if (bp) {
      bp.addEventListener('click', function () {
        var jaw = {};
        K.tesSingkat.forEach(function (q) { var r = $('input[name="pre-' + q.id + '"]:checked'); if (r) { jaw[q.id] = +r.value; } });
        if (Object.keys(jaw).length < K.tesSingkat.length) { toast('Jawab ketiga soal tes awal dulu.'); return; }
        S.pre = jaw; catat('tes-awal', 'Skor ' + skorTes(jaw) + '/3'); simpan();
        RENDER.tujuan(); renderStepper();
        toast('Tes awal tersimpan. Ayo ke kebun!');
      });
    }
  };

  // ------------------------------------------------------------ 2. VR
  var vrSiap = false;
  function scene() { return document.querySelector('a-scene'); }
  function vrJalan(on) {
    var sc = scene();
    if (!sc || !sc.renderer || typeof sc.render !== 'function') { return; }
    if (on) {
      sc.renderer.setAnimationLoop(sc.render);
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 30);
    } else if (!sc.is('vr-mode')) {
      sc.renderer.setAnimationLoop(null);
    }
  }
  function hudUpdate() {
    var nT = Object.keys(S.tandan).length, nP = Object.keys(S.tph).length;
    var a = $('#hud-tandan'), b = $('#hud-tph');
    if (a) { a.textContent = 'Tandan ' + nT + '/' + K.tandan.length; }
    if (b) { b.textContent = 'TPH ' + nP + '/' + K.tph.length; }
  }
  function sideKosong(on) { $('#vr-side').classList.toggle('kosong', !!on); }

  RENDER.vr = function () {
    $('#vr-head').innerHTML = '<h1 id="h-vr">Eksplorasi VR: Blok A-1</h1>' + pemandu('vr');
    $('#vr-foot').innerHTML = navBawah('tujuan', 'ar', 'Amati AR');
    if (!window.AFRAME) { $('#vr-fallback').hidden = false; }
    hudUpdate();
    var mode = $('#vr-side').getAttribute('data-mode');
    if (!mode || mode === 'misi') { sideMisi(); }
  };

  function sideMisi() {
    var side = $('#vr-side');
    side.setAttribute('data-mode', 'misi');
    sideKosong(true);
    var nT = Object.keys(S.tandan).length;
    var layak = K.tandan.filter(bisaPanen);
    var nPanen = layak.filter(function (t) { return S.tandan[t.id] && S.tandan[t.id].dipanen; }).length;
    var nP = Object.keys(S.tph).length;
    function li(ok, teks) { return '<li class="' + (ok ? 'ok' : '') + '"><span class="cek">' + (ok ? '✓' : '') + '</span><span>' + teks + '</span></li>'; }
    side.innerHTML = '<h2>Misi di kebun</h2><ul class="misi">' +
      li(nT === K.tandan.length, 'Periksa 7 tandan bertanda <b>A–G</b>: hitung buah luar yang lepas, tentukan fraksi dan keputusan. (' + nT + '/7)') +
      li(nPanen === layak.length, 'Panen tandan yang layak; brondolannya ikut dikutip ke karung di TPH. (' + nPanen + '/' + layak.length + ')') +
      li(nP === K.tph.length, 'Di TPH, klik 4 benda bertanda <b>!</b> dan periksa kesesuaiannya dengan aturan. (' + nP + '/4)') +
      li(!!S.trukDiklik, 'Klik truk di jalan koleksi: buah harus sampai PKS pada hari panen.') + '</ul>' +
      '<dl class="kontrol"><dt>Laptop</dt><dd>Seret layar untuk menoleh. W/A/S/D atau tombol panah untuk berjalan. Klik tandan atau ikon untuk memeriksa. Klik lingkaran kuning “Titik” untuk berpindah.</dd>' +
      '<dt>Ponsel</dt><dd>Gerakkan ponsel atau usap layar untuk menoleh. Ketuk tandan atau “Titik”. Tombol “Layar penuh” memperlebar tampilan.</dd>' +
      '<dt>Headset atau kacamata VR</dt><dd>Tekan tombol VR di pojok kanan bawah adegan. Tatap tandan atau tombol ±1,5 detik untuk memilih, atau pakai kontroler.</dd></dl>' +
      '<p class="kecil muted">Petunjuk: tandan paling dekat ada di depan Anda, di kiri dan kanan jalan panen (pasar rintis).</p>';
  }

  function sideTandan(id) {
    var t = tandanById(id);
    if (!t) { return; }
    var side = $('#vr-side');
    side.setAttribute('data-mode', 'tandan');
    sideKosong(false);
    var j = S.tandan[id];
    var lepas = TB.sample40(t.fraksi);
    var temp = { fraksi: j ? j.fraksi : null };
    side.innerHTML = '<div class="row" style="justify-content:space-between"><h2 style="margin:0">Tandan ' + esc(id) + '</h2><span class="row"><button type="button" class="btn ghost small hanya-hp" data-ke-adegan>Ke adegan VR</button><button type="button" class="btn ghost small" id="btn-misi">Misi</button></span></div>' +
      '<p class="muted kecil">Pokok ' + t.pokok + ', ' + esc(t.sisi) + ' jalan panen · Blok A-1, tanaman umur ±7 tahun</p>' +
      '<div class="obs"><div><b>Warna buah luar:</b> ' + esc(t.warna) + '</div>' +
      '<div><b>Brondolan lepas alami di piringan:</b> ' + TB.BRONDOLAN_PIRINGAN[t.fraksi] + ' butir</div>' +
      '<div><b>Catatan pengamatan:</b> ' + esc(t.catatan) + '</div></div>' +
      '<figure class="sampel">' + sampelSVG(lepas, t.fraksi === '00' ? '00' : t.fraksi, t.fraksi === '5') +
      '<figcaption>Sampel 40 buah luar dari sisi tandan yang menghadap Anda. Buah berwarna = masih melekat; lingkaran pucat bergaris putus = bekas buah yang sudah lepas (membrondol).</figcaption></figure>' +
      '<div class="form-item"><label class="lbl" for="in-persen">1. Persentase buah luar yang membrondol</label><div class="inline-num"><input type="number" id="in-persen" min="0" max="100" step="0.5" inputmode="decimal" value="' + (j ? esc(j.persen) : '') + '"' + (j ? ' disabled' : '') + '><span>%</span></div><p class="kecil muted">Rumus: jumlah bekas lepas ÷ 40 × 100%.</p></div>' +
      '<div class="form-item"><span class="lbl">2. Fraksi kematangan</span>' + strip('tandan', temp.fraksi, j ? t.fraksi : null) + '</div>' +
      '<div class="form-item"><span class="lbl">3. Keputusan panen</span><div class="opsi-list">' + K.keputusan.map(function (k) {
        var on = j && j.keputusan === k.id;
        return '<label class="opsi' + (on ? ' dipilih' : '') + '"><input type="radio" name="kep" value="' + k.id + '"' + (on ? ' checked' : '') + (j ? ' disabled' : '') + '><span>' + esc(k.label) + '</span></label>';
      }).join('') + '</div></div>' +
      '<div class="form-item"><label class="lbl" for="in-alasan">4. Alasan singkat (dipakai untuk prompt GenAI)</label><textarea id="in-alasan" maxlength="600" placeholder="Contoh: warna sudah jingga kemerahan dan sekitar sepertiga buah luar lepas…"' + (j ? ' disabled' : '') + '>' + (j ? esc(j.alasan) : '') + '</textarea></div>' +
      (j ? '' : '<button type="button" class="btn oranye" id="btn-periksa">Periksa jawaban</button>') +
      '<div id="umpan-tandan"></div>';
    if (j) { $('.strip', side).classList.add('terkunci'); tampilUmpanTandan(t); }
    pasangStrip(side, function (_, kode) { temp.fraksi = kode; });
    $('#btn-misi').addEventListener('click', sideMisi);
    var bp = $('#btn-periksa');
    if (bp) {
      bp.addEventListener('click', function () {
        var persen = $('#in-persen').value;
        var kep = $('input[name="kep"]:checked', side);
        if (persen === '' || !temp.fraksi || !kep) { toast('Isi persentase, pilih fraksi, dan pilih keputusan dulu.'); return; }
        simpanTandan(t, { persen: Number(persen), fraksi: temp.fraksi, keputusan: kep.value, alasan: $('#in-alasan').value.trim(), via: 'layar' });
        sideTandan(id);
      });
    }
    if (window.innerWidth < 900 && !$('#vr-wrap').classList.contains('penuh')) { side.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  function simpanTandan(t, j) {
    var n = nilaiTandan(t, j);
    j.persenOk = n.persenOk; j.fraksiOk = n.fraksiOk; j.kepOk = n.kepOk; j.skor = n.skor; j.waktu = new Date().toISOString();
    S.tandan[t.id] = j;
    catat('tandan', 'Tandan ' + t.id + ': jawab F' + j.fraksi + '/' + j.keputusan + ', kunci F' + t.fraksi + ', skor ' + n.skor + '/4');
    simpan();
    if (n.fraksiOk && n.kepOk) { bunyi.benar(); } else { bunyi.salah(); }
    if (window.KebunVR) {
      var st = n.fraksiOk ? (bisaPanen(t) ? 'benar' : 'tunda') : 'salah';
      window.KebunVR.setTandanState(t.id, st);
    }
    hudUpdate(); renderStepper(); cekLencana();
    return n;
  }

  function tampilUmpanTandan(t) {
    var j = S.tandan[t.id], box = $('#umpan-tandan');
    if (!j || !box) { return; }
    var semua = j.fraksiOk && j.kepOk;
    var b = K.pemandu.baris[semua ? 'benar' : 'salah'];
    var aksi = '';
    if (bisaPanen(t)) {
      aksi = j.dipanen ? '<p class="kecil"><b>Sudah dipanen.</b> Tandan dan ' + TB.BRONDOLAN_PIRINGAN[t.fraksi] + ' brondolan sudah di TPH.</p>' :
        '<button type="button" class="btn oranye" id="btn-panen">Panen &amp; angkut ke TPH</button>';
    } else {
      aksi = '<p class="kecil" lang="id"><span class="banjar" lang="bjn">“' + esc(K.pemandu.baris.hirang.banjar) + '”</span> ' + esc(K.pemandu.baris.hirang.indo) + '</p>';
    }
    box.innerHTML = '<div class="umpan ' + (semua ? 'benar' : 'salah') + '"><div class="judul"><span class="banjar" lang="bjn">“' + esc(b.banjar) + '”</span> ' + esc(b.indo) + ' · Skor ' + j.skor + '/4</div><ul>' +
      umpanTandan(t, j).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="row">' + aksi + '<button type="button" class="btn ghost" id="btn-ai-tandan">Tanya Asisten GenAI tentang tandan ini</button></div>';
    var bp = $('#btn-panen');
    if (bp) { bp.addEventListener('click', function () { panen(t); }); }
    $('#btn-ai-tandan').addEventListener('click', function () { bukaAI('tandan', t.id); });
  }

  function panen(t, done) {
    if (!window.KebunVR) { S.tandan[t.id].dipanen = true; simpan(); if (done) { done(); } return; }
    window.KebunVR.panen(t.id, function (ok, n) {
      S.tandan[t.id].dipanen = true;
      catat('panen', 'Tandan ' + t.id + ' dipanen, ' + (n || 0) + ' brondolan dikutip ke TPH');
      simpan(); cekLencana();
      if (ok) { toast('Tandan ' + t.id + ' tiba di TPH. ' + (n || 0) + ' brondolan dikutip ke atas karung.'); }
      if ($('#vr-side').getAttribute('data-mode') === 'tandan') { tampilUmpanTandan(t); }
      if (done) { done(); }
    });
  }

  function sideTPH(id) {
    var q = K.tph.filter(function (x) { return x.id === id; })[0];
    if (!q) { return; }
    var side = $('#vr-side');
    side.setAttribute('data-mode', 'tph');
    sideKosong(false);
    var j = S.tph[id];
    side.innerHTML = '<div class="row" style="justify-content:space-between"><h2 style="margin:0">Periksa TPH</h2><span class="row"><button type="button" class="btn ghost small hanya-hp" data-ke-adegan>Ke adegan VR</button><button type="button" class="btn ghost small" id="btn-misi">Misi</button></span></div>' +
      pemandu('tph') + '<div class="obs"><div><b>Temuan:</b> ' + esc(q.judul) + '</div></div>' +
      '<div class="opsi-list">' + q.pilihan.map(function (p) {
        var cls = j ? (p.id === q.benar ? ' benar' : (j.jawab === p.id ? ' salah' : '')) : '';
        return '<label class="opsi' + cls + '"><input type="radio" name="tph" value="' + p.id + '"' + (j && j.jawab === p.id ? ' checked' : '') + (j ? ' disabled' : '') + '><span>' + esc(p.label) + '</span></label>';
      }).join('') + '</div>' +
      (j ? '<div class="umpan ' + (j.benar ? 'benar' : 'salah') + '"><div class="judul">' + (j.benar ? 'Tepat.' : 'Belum tepat.') + '</div>' + esc(q.jelas) + '</div>' : '<button type="button" class="btn oranye" id="btn-tph" style="margin-top:10px">Periksa</button>');
    $('#btn-misi').addEventListener('click', sideMisi);
    var b = $('#btn-tph');
    if (b) {
      b.addEventListener('click', function () {
        var r = $('input[name="tph"]:checked', side);
        if (!r) { toast('Pilih salah satu jawaban.'); return; }
        var benar = r.value === q.benar;
        S.tph[id] = { jawab: r.value, benar: benar };
        catat('tph', 'TPH ' + id + ': ' + (benar ? 'tepat' : 'belum tepat'));
        simpan();
        if (benar) { bunyi.benar(); } else { bunyi.salah(); }
        if (window.KebunVR) { window.KebunVR.setTphState(id, benar); }
        hudUpdate(); renderStepper(); cekLencana();
        sideTPH(id);
      });
    }
    if (window.innerWidth < 900 && !$('#vr-wrap').classList.contains('penuh')) { side.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }

  // Kartu 3D saat mode headset VR
  function kartuVR(t) {
    var k = kunciTandan(t);
    var obs = ['Warna buah luar: ' + t.warna, 'Brondolan di piringan: ' + TB.BRONDOLAN_PIRINGAN[t.fraksi] + ' butir', 'Sampel 40 buah luar: ' + k.lepas + ' sudah lepas' + (t.fraksi === '5' ? '; buah lapisan dalam juga lepas' : '')];
    var pilihF = null;
    var opts = {
      judul: 'Tandan ' + t.id + ' · Pokok ' + t.pokok,
      obs: obs,
      fraksiList: K.fraksi.map(function (f) { return { kode: f.kode, derajat: f.derajat, warna: TB.COLORS[f.kode][1] }; }),
      keputusanList: K.keputusan,
      onFraksi: function (kode) { pilihF = kode; window.KebunVRCard.update({ tahap: 'keputusan', pilihFraksi: kode }); },
      onKeputusan: function (kep) {
        // Di headset persentase tidak diketik; nilai persentase diambil dari hitungan sampel yang ditampilkan.
        var n = simpanTandan(t, { persen: k.persen, fraksi: pilihF, keputusan: kep, alasan: '(dijawab di mode headset VR)', via: 'vr' });
        var b = K.pemandu.baris[n.fraksiOk && n.kepOk ? 'benar' : 'salah'];
        window.KebunVRCard.update({
          tahap: 'hasil', benar: n.fraksiOk && n.kepOk,
          hasilJudul: b.banjar + ' ' + b.indo.split('.')[0] + '. Skor ' + n.skor + '/4',
          hasil: ['Kunci: Fraksi ' + t.fraksi + ' (' + k.info.derajat + ') — ' + k.info.keputusan + '.', ALASAN[k.info.kelompok]],
          bisaPanen: bisaPanen(t),
          onPanen: function () { window.KebunVRCard.close(); panen(t); }
        });
      }
    };
    if (S.tandan[t.id]) {
      var j = S.tandan[t.id];
      opts.tahap = 'hasil'; opts.benar = j.fraksiOk && j.kepOk;
      opts.hasilJudul = 'Sudah diperiksa. Skor ' + j.skor + '/4';
      opts.hasil = ['Kunci: Fraksi ' + t.fraksi + ' (' + k.info.derajat + ') — ' + k.info.keputusan + '.'];
      opts.bisaPanen = bisaPanen(t) && !j.dipanen;
      opts.onPanen = function () { window.KebunVRCard.close(); panen(t); };
    }
    window.KebunVR.bukaKartu(opts);
  }

  function pasangVR() {
    var sc = scene();
    if (!window.AFRAME || !sc) { $('#vr-fallback').hidden = false; return; }
    // Layar ponsel tegak: sudut pandang dilebarkan agar tandan di kiri-kanan jalan panen lebih mudah terlihat.
    if (window.innerWidth < 600) { $('#cam').setAttribute('camera', 'fov', 82); }
    sc.addEventListener('kebun-pilih', function (e) {
      var d = e.detail || {};
      if (d.jenis === 'tandan') {
        var t = tandanById(d.id);
        if (window.KebunVR && window.KebunVR.isVR()) { kartuVR(t); } else { sideTandan(d.id); }
      } else if (d.jenis === 'tph') {
        if (window.KebunVR && window.KebunVR.isVR() && !S.tph[d.id]) {
          var q = K.tph.filter(function (x) { return x.id === d.id; })[0];
          window.KebunVR.bukaKartu({ judul: 'Periksa TPH', tahap: 'hasil', benar: true, hasilJudul: q.judul, hasil: ['Jawab pertanyaan ini di panel layar setelah keluar dari mode VR.'], bisaPanen: false });
        }
        sideTPH(d.id);
      } else if (d.jenis === 'pemandu') {
        var b = K.pemandu.baris.vr; ucap(b.banjar + '. ' + b.indo); toast(K.pemandu.nama + ': “' + b.banjar + '” ' + b.indo, 5200);
      } else if (d.jenis === 'truk') {
        S.trukDiklik = true; simpan();
        var sisa = K.tandan.length - Object.keys(S.tandan).length;
        toast(sisa ? 'Truk menunggu. Masih ada ' + sisa + ' tandan yang belum diperiksa.' : 'Semua TBS dan brondolan harus tiba di PKS pada hari panen. Lanjutkan ke langkah Amati AR.', 5200);
        if ($('#vr-side').getAttribute('data-mode') === 'misi') { sideMisi(); }
      }
    });
    function pulih() {
      vrSiap = true;
      K.tandan.forEach(function (t) {
        var j = S.tandan[t.id];
        if (!j) { return; }
        window.KebunVR.setTandanState(t.id, j.fraksiOk ? (bisaPanen(t) ? 'benar' : 'tunda') : 'salah');
        if (j.dipanen) { window.KebunVR.panen(t.id); }
      });
      Object.keys(S.tph).forEach(function (id) { window.KebunVR.setTphState(id, S.tph[id].benar); });
      vrJalan(aktif === 'vr');
    }
    if (window.KebunVR && window.KebunVR.ready) { pulih(); } else { sc.addEventListener('kebun-siap', pulih); }
    sc.addEventListener('loaded', function () { vrJalan(aktif === 'vr'); });
    sc.addEventListener('renderstart', function () { setTimeout(function () { vrJalan(aktif === 'vr'); }, 0); });
    $('#btn-layar').addEventListener('click', function () {
      var w = $('#vr-wrap'), on = !w.classList.contains('penuh');
      w.classList.toggle('penuh', on);
      document.body.style.overflow = on ? 'hidden' : '';
      this.textContent = on ? 'Keluar layar penuh' : 'Layar penuh';
      setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 50);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('#vr-wrap').classList.contains('penuh')) { $('#btn-layar').click(); }
    });
  }

  // ------------------------------------------------------------ 3. AR
  var mvDimuat = false, arPilih = 'X';
  function muatModelViewer() {
    if (mvDimuat) { return; }
    mvDimuat = true;
    var s = document.createElement('script');
    s.type = 'module'; s.src = MV_SRC;
    s.onerror = function () { var st = $('#ar-status'); if (st) { st.textContent = 'Pustaka model-viewer gagal dimuat (periksa koneksi). Gunakan AR marker di bawah.'; } };
    document.head.appendChild(s);
  }
  function hotspotHTML(kode) {
    var m = AR_MODEL[kode], d = TB.generate(m.fraksi, m.seed), H = [];
    function v(a) { return a.map(function (x) { return x.toFixed(3) + 'm'; }).join(' '); }
    function n(a) { return a.map(function (x) { return x.toFixed(3); }).join(' '); }
    var st = d.stalk;
    H.push(['tangkai', 'Tangkai (potong bentuk V, sisa ≤ 2 cm)', [0, BUNCH_Y + st.y0 + st.len + 0.02, 0], [0, 1, 0]]);
    var f = d.fruitlets.filter(function (x) { return x.n[2] > 0.6 && Math.abs(x.n[1]) < 0.45; })[0];
    if (f) { H.push(['buah', 'Buah luar', [f.p[0], f.p[1] + BUNCH_Y, f.p[2]], f.n]); }
    var so = d.sockets.filter(function (x) { return x.n[0] > 0.55 && Math.abs(x.n[1]) < 0.5; })[0];
    if (so) { H.push(['soket', 'Bekas buah lepas', [so.p[0], so.p[1] + BUNCH_Y, so.p[2]], so.n]); }
    var sp = d.spines.filter(function (x) { return x.n[0] < -0.5; })[0];
    if (sp) { H.push(['duri', 'Duri', [sp.p[0] + sp.n[0] * 0.03, sp.p[1] + BUNCH_Y + sp.n[1] * 0.03, sp.p[2] + sp.n[2] * 0.03], sp.n]); }
    var br = TB.scatter(TB.BRONDOLAN_PIRINGAN[m.fraksi], m.seed + 9, 0.21, 0.31)[0];
    if (br) { H.push(['brondolan', 'Brondolan di alas', [br.x, 0.04, br.z], [0, 1, 0]]); }
    return H.map(function (h) { return '<div class="hotspot" slot="hotspot-' + h[0] + '" data-position="' + v(h[2]) + '" data-normal="' + n(h[3]) + '">' + esc(h[1]) + '</div>'; }).join('');
  }
  function gantiModel(kode) {
    arPilih = kode;
    var mv = $('#mv');
    if (!mv) { return; }
    $$('[slot^="hotspot-"]', mv).forEach(function (h) { mv.removeChild(h); });
    mv.insertAdjacentHTML('beforeend', hotspotHTML(kode));
    mv.setAttribute('src', AR_MODEL[kode].file);
    mv.setAttribute('alt', 'Model 3D tandan ' + kode);
    $$('.ar-pilih button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-kode') === kode)); });
  }
  RENDER.ar = function () {
    var el = $('#step-ar');
    if (!el.getAttribute('data-siap')) {
      el.setAttribute('data-siap', '1');
      el.innerHTML = '<h1 id="h-ar">Amati AR: tandan di meja Anda</h1>' + pemandu('ar') +
        '<div class="grid2"><div><div class="ar-stage">' +
        '<div class="ar-pilih" role="group" aria-label="Pilih tandan">' + ['X', 'Y', 'Z'].map(function (k) { return '<button type="button" data-kode="' + k + '" aria-pressed="' + (k === arPilih) + '">Tandan ' + k + '</button>'; }).join('') + '</div>' +
        '<model-viewer id="mv" src="' + AR_MODEL[arPilih].file + '" alt="Model 3D tandan ' + arPilih + '" ar ar-modes="webxr scene-viewer quick-look" ar-scale="auto" camera-controls touch-action="pan-y" shadow-intensity="1" exposure="1.05" camera-orbit="25deg 70deg auto" min-camera-orbit="auto auto 0.5m" max-camera-orbit="auto auto 3m" interaction-prompt="auto">' +
        '<button slot="ar-button" class="btn oranye ar-btn" type="button">Lihat di ruangan Anda (AR)</button>' +
        '<div class="ar-loading" slot="poster">Memuat model 3D… (perlu koneksi untuk pustaka model-viewer)</div>' + hotspotHTML(arPilih) +
        '</model-viewer><div class="ar-status" id="ar-status">Putar dengan jari atau tetikus. Cubit atau gulir untuk memperbesar.</div></div>' +
        '<p class="kecil muted">Model dibuat dari bentuk primitif oleh generator yang sama dengan kebun VR. Warna dan ukuran bersifat ilustrasi.</p></div>' +
        '<div><div class="kartu"><h2>Dua cara melihat dalam AR</h2><ol class="kecil">' +
        '<li><b>AR tanpa marker</b>: tekan “Lihat di ruangan Anda (AR)” lalu arahkan ponsel ke lantai atau meja. Tersedia di Android yang mendukung ARCore dan di iPhone/iPad (Quick Look). Di laptop tombol ini tidak muncul.</li>' +
        '<li><b>AR dengan marker Hiro</b> (untuk ponsel berkamera tanpa ARCore): buka <a href="marker-hiro.html" target="_blank" rel="noopener">lembar marker Hiro</a> (cetak, atau tampilkan di layar lain), lalu buka <a href="ar-marker.html">halaman AR marker</a> di ponsel dan izinkan kamera.</li></ol>' +
        '<p class="kecil muted">Kamera hanya dipakai di perangkat Anda; tidak ada gambar yang dikirim ke server.</p></div>' +
        '<div class="kartu" id="ar-tugas"></div></div></div>' + navBawah('vr', 'kuis', 'Sortasi');
      $$('.ar-pilih button', el).forEach(function (b) { b.addEventListener('click', function () { gantiModel(b.getAttribute('data-kode')); }); });
      var mv = $('#mv');
      mv.addEventListener('load', function () {
        var st = $('#ar-status');
        if (st) { st.textContent = mv.canActivateAR ? 'AR tersedia di perangkat ini. Tekan tombol AR.' : 'Perangkat ini belum mendukung AR tanpa marker (umum di laptop). Gunakan AR marker Hiro di ponsel.'; }
      });
      mv.addEventListener('error', function () { var st = $('#ar-status'); if (st) { st.textContent = 'Model gagal dimuat.'; } });
      muatModelViewer();
    }
    tugasAR();
  };
  function tugasAR() {
    var box = $('#ar-tugas'), a = S.ar, sudah = !!a.selesai;
    var opsiF = '<option value="">pilih…</option>' + K.fraksi.map(function (f) { return '<option value="' + f.kode + '">Fraksi ' + f.kode + ' (' + esc(f.derajat) + ')</option>'; }).join('');
    box.innerHTML = '<h2>Tugas pengamatan</h2><p class="kecil">Putar setiap tandan. Perhatikan warna, bekas buah lepas, dan brondolan di alas karung. Perkirakan fraksinya.</p>' +
      ['X', 'Y', 'Z'].map(function (k) {
        var nilai = a['f' + k] || '';
        return '<div class="form-item"><label class="lbl" for="ar-' + k + '">Tandan ' + k + '</label><select id="ar-' + k + '"' + (sudah ? ' disabled' : '') + '>' + opsiF.replace('value="' + nilai + '"', 'value="' + nilai + '" selected') + '</select>' +
          (sudah ? '<p class="kecil ' + (nilai === AR_MODEL[k].fraksi ? '' : 'muted') + '">Kunci: Fraksi ' + AR_MODEL[k].fraksi + ' (' + esc(fraksiInfo(AR_MODEL[k].fraksi).derajat) + ')' + (nilai === AR_MODEL[k].fraksi ? ' ✓' : '') + '</p>' : '') + '</div>';
      }).join('') +
      '<div class="form-item"><span class="lbl">Tandan mana yang paling tepat dipanen hari ini?</span><div class="opsi-list">' + ['X', 'Y', 'Z'].map(function (k) {
        return '<label class="opsi' + (a.panen === k ? ' dipilih' : '') + '"><input type="radio" name="ar-panen" value="' + k + '"' + (a.panen === k ? ' checked' : '') + (sudah ? ' disabled' : '') + '><span>Tandan ' + k + '</span></label>';
      }).join('') + '</div></div>' +
      '<div class="form-item"><label class="lbl" for="ar-amatan">Apa perbedaan yang Anda amati?</label><textarea id="ar-amatan" maxlength="600"' + (sudah ? ' disabled' : '') + '>' + esc(a.amatan || '') + '</textarea></div>' +
      (sudah ? '<div class="umpan ' + (a.skor >= 3 ? 'benar' : 'salah') + '"><div class="judul">Skor ' + a.skor + '/4</div>Tandan X fraksi 2 (ideal) adalah yang paling tepat dipanen. Tandan Y fraksi 4 juga harus segera dipotong karena ALB mulai naik. Tandan Z fraksi 0 dibiarkan.</div>' :
        '<button type="button" class="btn oranye" id="btn-ar">Simpan &amp; tampilkan kunci</button>');
    var b = $('#btn-ar');
    if (b) {
      b.addEventListener('click', function () {
        var jaw = { fX: $('#ar-X').value, fY: $('#ar-Y').value, fZ: $('#ar-Z').value };
        var p = $('input[name="ar-panen"]:checked');
        if (!jaw.fX || !jaw.fY || !jaw.fZ || !p) { toast('Isi fraksi ketiga tandan dan pilih tandan yang paling tepat dipanen.'); return; }
        var skor = ['X', 'Y', 'Z'].filter(function (k) { return jaw['f' + k] === AR_MODEL[k].fraksi; }).length + (p.value === 'X' ? 1 : 0);
        S.ar = { fX: jaw.fX, fY: jaw.fY, fZ: jaw.fZ, panen: p.value, amatan: $('#ar-amatan').value.trim(), skor: skor, selesai: true };
        catat('ar', 'AR: skor ' + skor + '/4');
        simpan();
        if (skor >= 3) { bunyi.benar(); } else { bunyi.salah(); }
        renderStepper(); tugasAR();
      });
    }
  }

  // ------------------------------------------------------------ 4. Sortasi (kuis)
  RENDER.kuis = function () {
    var el = $('#step-kuis');
    el.innerHTML = '<h1 id="h-kuis">Sortasi di TPH</h1>' + pemandu('kuis') +
      '<p class="muted">Setiap soal hanya bisa diperiksa sekali. Penjelasan muncul setelah Anda menjawab. Skor saat ini: <b id="skor-kuis">' + skorKuis() + '/' + MAKS.kuis + '</b></p>' +
      K.kuis.map(function (q, i) { return '<div class="kartu" id="kuis-' + q.id + '"></div>'; }).join('') + navBawah('ar', 'kasus', 'Studi kasus');
    K.kuis.forEach(function (q, i) { renderSoal(q, i); });
  };
  function renderSoal(q, i) {
    var box = $('#kuis-' + q.id), j = S.kuis[q.id], h = '<h3>Soal ' + (i + 1) + '</h3><p>' + esc(q.soal) + '</p>';
    var temp = { kode: j ? j.jawab : null, urut: [] };
    if (q.tipe === 'fraksi') {
      h += '<figure class="sampel">' + sampelSVG(q.lepas, q.benar, false) + '<figcaption>Warna: ' + esc(q.warna) + ' · Brondolan di piringan: ' + q.brondolan + ' butir</figcaption></figure>' + strip(q.id, j ? j.jawab : null, j ? q.benar : null);
    } else if (q.tipe === 'pg') {
      h += '<div class="opsi-list">' + q.pilihan.map(function (p, k) {
        var cls = j ? (k === q.benar ? ' benar' : (j.jawab === k ? ' salah' : '')) : '';
        return '<label class="opsi' + cls + '"><input type="radio" name="' + q.id + '" value="' + k + '"' + (j && j.jawab === k ? ' checked' : '') + (j ? ' disabled' : '') + '><span>' + esc(p) + '</span></label>';
      }).join('') + '</div>';
    } else if (q.tipe === 'urut') {
      h += '<div class="urut-pilih">' + q.item.map(function (it) { return '<button type="button" data-it="' + esc(it) + '"' + (j ? ' disabled' : '') + '>' + esc(it) + '</button>'; }).join('') + '</div>' +
        '<div class="urut-hasil" aria-live="polite">' + (j ? j.jawab.map(function (x, k) { return '<span>' + (k + 1) + '. ' + esc(x) + '</span>'; }).join('') : '') + '</div>' +
        (j ? '' : '<button type="button" class="btn ghost small" data-ulang style="margin-top:6px">Ulangi urutan</button>');
    } else if (q.tipe === 'angka') {
      h += '<div class="inline-num"><input type="number" step="0.1" inputmode="decimal" id="in-' + q.id + '" value="' + (j ? esc(j.jawab) : '') + '"' + (j ? ' disabled' : '') + '><span>' + esc(q.satuan) + '</span></div>';
    }
    if (j) {
      h += '<div class="umpan ' + (j.benar ? 'benar' : 'salah') + '"><div class="judul">' + (j.benar ? 'Tepat.' : 'Belum tepat.') + '</div>' + esc(q.jelas) + '</div>';
    } else {
      h += '<button type="button" class="btn" data-periksa style="margin-top:10px">Periksa</button>';
    }
    box.innerHTML = h;
    if (j) { var s = $('.strip', box); if (s) { s.classList.add('terkunci'); } return; }
    pasangStrip(box, function (_, kode) { temp.kode = kode; });
    $$('.urut-pilih button', box).forEach(function (b) {
      b.addEventListener('click', function () {
        temp.urut.push(b.getAttribute('data-it')); b.disabled = true;
        $('.urut-hasil', box).innerHTML = temp.urut.map(function (x, k) { return '<span>' + (k + 1) + '. ' + esc(x) + '</span>'; }).join('');
      });
    });
    var ul = $('[data-ulang]', box);
    if (ul) { ul.addEventListener('click', function () { temp.urut = []; $$('.urut-pilih button', box).forEach(function (b) { b.disabled = false; }); $('.urut-hasil', box).innerHTML = ''; }); }
    $('[data-periksa]', box).addEventListener('click', function () {
      var jaw, benar;
      if (q.tipe === 'fraksi') { if (!temp.kode) { toast('Pilih salah satu fraksi.'); return; } jaw = temp.kode; benar = jaw === q.benar; }
      if (q.tipe === 'pg') { var r = $('input[name="' + q.id + '"]:checked', box); if (!r) { toast('Pilih salah satu jawaban.'); return; } jaw = +r.value; benar = jaw === q.benar; }
      if (q.tipe === 'urut') { if (temp.urut.length < q.item.length) { toast('Klik keempat kegiatan sesuai urutan.'); return; } jaw = temp.urut.slice(); benar = jaw.join('|') === q.benar.join('|'); }
      if (q.tipe === 'angka') { var v = $('#in-' + q.id).value; if (v === '') { toast('Isi jawaban angka.'); return; } jaw = Number(v); benar = Math.abs(jaw - q.benar) <= q.toleransi; }
      S.kuis[q.id] = { jawab: jaw, benar: benar };
      catat('kuis', 'Soal ' + (i + 1) + ': ' + (benar ? 'tepat' : 'belum tepat'));
      simpan();
      if (benar) { bunyi.benar(); } else { bunyi.salah(); }
      renderSoal(q, i);
      var sk = $('#skor-kuis'); if (sk) { sk.textContent = skorKuis() + '/' + MAKS.kuis; }
      renderStepper();
    });
  }

  // ------------------------------------------------------------ 5. Studi kasus
  RENDER.kasus = function () {
    var el = $('#step-kasus'), c = K.kasus;
    el.innerHTML = '<h1 id="h-kasus">Studi kasus: ' + esc(c.judul) + '</h1>' + pemandu('kasus') +
      '<div class="kartu sasirangan">' + c.cerita.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '<div class="tabel-wrap"><table class="tabel" style="max-width:420px"><thead><tr><th>Hasil pemeriksaan 50 pokok</th><th>Jumlah</th></tr></thead><tbody>' +
      c.tabel.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
      c.keputusan.map(function (d, i) { return '<div class="kartu" id="kasus-' + d.id + '"></div>'; }).join('') +
      c.hitung.map(function (d) { return '<div class="kartu" id="kasus-' + d.id + '"></div>'; }).join('') +
      '<div class="kartu" id="kasus-rek"></div>' + navBawah('kuis', 'refleksi', 'Refleksi GenAI');
    c.keputusan.forEach(function (d, i) { renderKeputusan(d, i); });
    c.hitung.forEach(function (d, i) { renderHitung(d, i); });
    renderRekomendasi();
  };
  function renderKeputusan(d, i) {
    var box = $('#kasus-' + d.id), j = S.kasus[d.id];
    box.innerHTML = '<h3>Keputusan ' + (i + 1) + '</h3><p>' + esc(d.tanya) + '</p><div class="opsi-list">' + d.pilihan.map(function (p) {
      var cls = j ? (p.skor ? ' benar' : (j.jawab === p.id ? ' salah' : '')) : '';
      return '<label class="opsi' + cls + '"><input type="radio" name="' + d.id + '" value="' + p.id + '"' + (j && j.jawab === p.id ? ' checked' : '') + (j ? ' disabled' : '') + '><span>' + esc(p.label) + '</span></label>';
    }).join('') + '</div>' + (j ? '<div class="umpan ' + (j.skor ? 'benar' : 'salah') + '">' + esc(d.pilihan.filter(function (p) { return p.id === j.jawab; })[0].umpan) +
      (j.skor ? '' : '<br><b>Pilihan terbaik:</b> ' + esc(d.pilihan.filter(function (p) { return p.skor; })[0].label) + ' ' + esc(d.pilihan.filter(function (p) { return p.skor; })[0].umpan.replace(/^Tepat\.\s*/, ''))) + '</div>' : '<button type="button" class="btn" data-pilih style="margin-top:10px">Putuskan</button>');
    var b = $('[data-pilih]', box);
    if (b) {
      b.addEventListener('click', function () {
        var r = $('input[name="' + d.id + '"]:checked', box);
        if (!r) { toast('Pilih salah satu keputusan.'); return; }
        var p = d.pilihan.filter(function (x) { return x.id === r.value; })[0];
        S.kasus[d.id] = { jawab: p.id, skor: p.skor || 0 };
        catat('kasus', 'Keputusan ' + (i + 1) + ': ' + p.id + (p.skor ? ' (tepat)' : ''));
        simpan();
        if (p.skor) { bunyi.benar(); } else { bunyi.salah(); }
        renderKeputusan(d, i); renderStepper();
      });
    }
  }
  function renderHitung(d, i) {
    var box = $('#kasus-' + d.id), j = S.kasus[d.id];
    box.innerHTML = '<h3>Hitungan ' + (i + 1) + '</h3><p>' + esc(d.tanya) + '</p><div class="inline-num"><input type="number" step="0.1" inputmode="decimal" id="in-' + d.id + '" value="' + (j ? esc(j.jawab) : '') + '"' + (j ? ' disabled' : '') + '><span>kg</span></div>' +
      (j ? '<div class="umpan ' + (j.benar ? 'benar' : 'salah') + '"><div class="judul">' + (j.benar ? 'Tepat.' : 'Belum tepat. Jawaban: ' + d.benar + ' kg.') + '</div>' + esc(d.jelas) + '</div>' : '<button type="button" class="btn" data-hitung style="margin-top:10px">Periksa</button>') +
      (i === 1 ? '<p class="kecil muted" style="margin-top:8px">' + esc(K.kasus.catatanAturan) + '</p>' : '');
    var b = $('[data-hitung]', box);
    if (b) {
      b.addEventListener('click', function () {
        var v = $('#in-' + d.id).value;
        if (v === '') { toast('Isi hasil hitungan.'); return; }
        var benar = Math.abs(Number(v) - d.benar) <= d.toleransi;
        S.kasus[d.id] = { jawab: Number(v), benar: benar };
        catat('kasus', 'Hitungan ' + (i + 1) + ': ' + (benar ? 'tepat' : 'belum tepat'));
        simpan();
        if (benar) { bunyi.benar(); } else { bunyi.salah(); }
        renderHitung(d, i); renderStepper();
      });
    }
  }
  function renderRekomendasi() {
    var box = $('#kasus-rek'), v = S.kasus.rekomendasi || '';
    box.innerHTML = '<h3>Sintesis: rekomendasi untuk Acil Salmah</h3><p>Tulis 3–5 kalimat rekomendasi panen dan pengangkutan untuk minggu ini. Sebutkan fraksi yang dipanen, cara menangani brondolan, dan rencana angkut. Minimal 150 karakter.</p>' +
      '<textarea id="in-rek" maxlength="1500" style="min-height:130px">' + esc(v) + '</textarea><p class="kecil muted"><span id="rek-n">' + v.length + '</span> karakter</p>' +
      '<div class="row"><button type="button" class="btn" id="btn-rek">Simpan rekomendasi</button><button type="button" class="btn ghost" id="btn-rek-ai">Minta umpan balik GenAI</button></div>';
    var ta = $('#in-rek');
    ta.addEventListener('input', function () { $('#rek-n').textContent = ta.value.length; });
    $('#btn-rek').addEventListener('click', function () {
      if (ta.value.trim().length < 150) { toast('Rekomendasi minimal 150 karakter (sekarang ' + ta.value.trim().length + ').'); return; }
      S.kasus.rekomendasi = ta.value.trim(); catat('kasus', 'Rekomendasi disimpan (' + S.kasus.rekomendasi.length + ' karakter)'); simpan();
      toast('Rekomendasi tersimpan.'); renderStepper();
    });
    $('#btn-rek-ai').addEventListener('click', function () {
      if (ta.value.trim()) { S.kasus.rekomendasi = ta.value.trim(); simpan(); }
      bukaAI('kasus');
    });
  }

  // ------------------------------------------------------------ 6. GenAI
  function tabelFraksiTeks() {
    return K.fraksi.map(function (f) {
      var dasar = f.kode === '5' ? 'buah luar sudah lepas dan buah bagian dalam ikut lepas' : f.persen + ' buah luar membrondol';
      return '- Fraksi ' + f.kode + ': ' + dasar + '; ' + f.derajat + '; keputusan: ' + f.keputusan + '.';
    }).join('\n');
  }
  var ACUAN = function () {
    return 'Acuan materi kuliah (gunakan sebagai rujukan utama; jangan mengubah angka di bawah ini):\n' + tabelFraksiTeks() +
      '\n- Kriteria lapangan contoh: minimal 5 brondolan lepas alami di piringan per tandan (angka baku mengikuti SOP kebun); buah luar jingga kemerahan, bukan lagi hitam keunguan.' +
      '\n- ALB: buah mentah (F0) ±2,3%; buah matang (F2–F3) 3,1–3,3%; lewat matang dan busuk (F4–F5) ±4,0%. Buah restan: ALB naik dan berat menyusut.' +
      '\n- Potongan timbangan (materi, merujuk Pergub Riau 77/2020): buah mentah 50% × persen buah mentah; lewat matang 25% × (persen lewat matang − 5%); tandan kosong 100% × persen; tangkai panjang 1% × persen; brondolan < 12,5%: 30% × (12,5% − persen brondolan); brondolan kotor 2 × berat kotoran.\n';
  };
  var PERAN = 'Peran: Anda tutor agronomi kelapa sawit untuk mahasiswa D3 Agroindustri di Kalimantan Selatan. Jawab dalam bahasa Indonesia yang sederhana dan ringkas.\n';
  var PENUTUP = '\nJika Anda tidak yakin pada suatu angka atau fakta, katakan bahwa Anda tidak yakin. Jawaban Anda akan saya cek ulang dengan materi kuliah.';

  function daftarSalah() {
    return K.tandan.filter(function (t) { return S.tandan[t.id] && !(S.tandan[t.id].fraksiOk && S.tandan[t.id].kepOk); })
      .map(function (t) { return 'tandan ' + t.id + ' (kunci F' + t.fraksi + ', jawaban saya F' + S.tandan[t.id].fraksi + ')'; });
  }
  var TEMPLATE = [
    { id: 'tandan', label: 'Jelaskan umpan balik tandan' },
    { id: 'sokratik', label: 'Tanya-jawab Sokratik' },
    { id: 'soal', label: 'Buat soal latihan baru' },
    { id: 'kasus', label: 'Nilai rekomendasi studi kasus' },
    { id: 'refleksi', label: 'Umpan balik refleksi' },
    { id: 'ringkas', label: 'Rangkum jurnal belajar' }
  ];
  function susunPrompt(tpl, tandanId) {
    var t = tandanById(tandanId) || K.tandan.filter(function (x) { return S.tandan[x.id]; })[0] || K.tandan[0];
    var j = S.tandan[t.id];
    var k = kunciTandan(t);
    var dataTandan = 'Data pengamatan saya (kebun virtual, blok A-1): tandan ' + t.id + ' di pokok ' + t.pokok + '. Warna buah luar: ' + t.warna + ' Sampel 40 buah luar: ' + k.lepas + ' sudah lepas' + (t.fraksi === '5' ? ', buah lapisan dalam juga lepas' : '') + '. Brondolan lepas alami di piringan: ' + TB.BRONDOLAN_PIRINGAN[t.fraksi] + ' butir.\n';
    if (tpl === 'tandan') {
      return PERAN + ACUAN() + '\n' + dataTandan +
        (j ? 'Jawaban saya: ' + fmt(Number(j.persen)) + '% membrondol, fraksi ' + j.fraksi + ', keputusan "' + labelKep(j.keputusan) + '". Alasan saya: "' + (j.alasan || '-') + '".\nKunci dari aplikasi: fraksi ' + t.fraksi + ' (' + k.info.derajat + '), keputusan "' + k.info.keputusan + '".\n' : 'Saya belum menjawab tandan ini.\n') +
        '\nTugas Anda:\n1) Jelaskan letak benar atau keliru penalaran saya dalam 3–5 kalimat.\n2) Ajukan 2 pertanyaan pemantik agar saya bisa membedakan fraksi ' + t.fraksi + ' dengan fraksi di sebelahnya.\n3) Jelaskan dampak keputusan panen untuk tandan ini terhadap rendemen, ALB, dan losses brondolan.' + PENUTUP;
    }
    if (tpl === 'sokratik') {
      return PERAN + ACUAN() + '\n' + dataTandan +
        '\nCara kerja: JANGAN memberi jawaban langsung. Ajukan SATU pertanyaan setiap giliran untuk menuntun saya menghitung persentase buah luar yang membrondol, menentukan fraksi, lalu memutuskan tindakan panen. Tunggu jawaban saya sebelum bertanya lagi. Setelah saya sampai pada kesimpulan, beri ringkasan 3 kalimat.' + PENUTUP;
    }
    if (tpl === 'soal') {
      var salah = daftarSalah();
      return PERAN + ACUAN() +
        '\nKesalahan saya di kebun virtual: ' + (salah.length ? salah.join('; ') : 'tidak ada (semua tepat)') + '.\n' +
        '\nTugas Anda: buat 3 kasus latihan baru tentang penentuan fraksi kematangan TBS di kebun sawit rakyat di Tanah Laut, Kalimantan Selatan. Setiap kasus memuat: jumlah buah lepas dari sampel 40 buah luar, warna buah luar, jumlah brondolan di piringan, dan satu kendala lapangan (misalnya hujan atau jadwal angkut). Fokuskan pada fraksi yang sering saya keliru. Tulis kunci jawaban dan penjelasannya di bagian akhir setelah judul "KUNCI".' + PENUTUP;
    }
    if (tpl === 'kasus') {
      var c = K.kasus, dk = c.keputusan.map(function (d, i) { var jj = S.kasus[d.id]; return 'Keputusan ' + (i + 1) + ' (' + d.tanya + '): ' + (jj ? d.pilihan.filter(function (p) { return p.id === jj.jawab; })[0].label : 'belum dijawab'); }).join('\n');
      return PERAN + ACUAN() + '\nKasus: ' + c.cerita.join(' ') + ' Hasil pemeriksaan 50 pokok: ' + c.tabel.map(function (r) { return r[0] + ' = ' + r[1]; }).join(', ') + '.\n' + dk +
        '\n\nRekomendasi tertulis saya:\n"' + (S.kasus.rekomendasi || '(belum ditulis)') + '"\n' +
        '\nTugas Anda: nilai rekomendasi saya dengan skala 1–4 untuk tiap kriteria: (a) ketepatan konsep fraksi dan keputusan panen, (b) pertimbangan ALB dan losses brondolan, (c) kelayakan di kebun sawit rakyat, (d) kejelasan bahasa. Beri alasan singkat untuk tiap skor dan satu saran perbaikan paling penting. Jangan menulis ulang seluruh rekomendasi saya.' + PENUTUP;
    }
    if (tpl === 'refleksi') {
      return PERAN + '\nBerikut refleksi saya setelah belajar kriteria matang panen dan fraksi TBS:\n' +
        K.refleksi.map(function (r, i) { return (i + 1) + '. ' + r.tanya + '\nJawaban saya: ' + (S.refleksi[r.id] || '(belum diisi)'); }).join('\n') +
        '\n\nTugas Anda: tanggapi refleksi saya. Tunjukkan satu bagian yang sudah kuat, satu miskonsepsi atau bagian yang masih kabur (jika ada), dan ajukan satu pertanyaan lanjutan yang mendorong saya berpikir lebih dalam. Maksimal 150 kata.' + PENUTUP;
    }
    // ringkas
    return PERAN + ACUAN() + '\nJurnal belajar saya:\n' +
      '- Eksplorasi VR: skor ' + skorVR() + '/' + MAKS.vr + '; kesalahan: ' + (daftarSalah().join('; ') || 'tidak ada') + '.\n' +
      '- Periksa TPH: ' + skorTPH() + '/' + MAKS.tph + '; Amati AR: ' + skorAR() + '/' + MAKS.ar + '; Sortasi: ' + skorKuis() + '/' + MAKS.kuis + '; Studi kasus: ' + skorKasus() + '/' + MAKS.kasus + '.\n' +
      '\nTugas Anda: (1) rangkum kekuatan dan kelemahan saya dalam 3 poin; (2) beri 3 saran belajar yang spesifik; (3) susun daftar periksa lapangan 5 butir yang bisa dipakai pemanen di kebun rakyat untuk memastikan hanya tandan matang yang dipotong.' + PENUTUP;
  }

  function aiWorkspace(container, tpl, tandanId) {
    var ctx = { tpl: tpl || 'tandan', tandan: tandanId || (K.tandan.filter(function (x) { return S.tandan[x.id]; })[0] || K.tandan[0]).id };
    function gambar() {
      var dijawab = K.tandan.filter(function (x) { return S.tandan[x.id]; });
      container.innerHTML = '<div class="ai-box">' +
        '<p class="kecil">Aplikasi menyusun <b>prompt</b> dari jejak belajar Anda. Salin prompt, buka layanan GenAI pilihan Anda, tempel, lalu bawa kembali jawabannya untuk dicek.</p>' +
        '<div class="ai-templates" role="group" aria-label="Jenis bantuan">' + TEMPLATE.map(function (t) { return '<button type="button" data-tpl="' + t.id + '" aria-pressed="' + (t.id === ctx.tpl) + '">' + esc(t.label) + '</button>'; }).join('') + '</div>' +
        ((ctx.tpl === 'tandan' || ctx.tpl === 'sokratik') ? '<div class="form-item"><label class="lbl" for="ai-tandan">Tandan</label><select id="ai-tandan">' + K.tandan.map(function (t) { return '<option value="' + t.id + '"' + (t.id === ctx.tandan ? ' selected' : '') + '>Tandan ' + t.id + (S.tandan[t.id] ? ' (sudah dijawab)' : '') + '</option>'; }).join('') + '</select>' + (dijawab.length ? '' : '<p class="kecil muted">Belum ada tandan yang dijawab; prompt memakai data pengamatan saja.</p>') + '</div>' : '') +
        '<label class="lbl" for="ai-prompt">Prompt (boleh Anda sunting)</label><textarea id="ai-prompt" class="ai-prompt">' + esc(susunPrompt(ctx.tpl, ctx.tandan)) + '</textarea>' +
        '<div class="row"><button type="button" class="btn accent" id="ai-salin">Salin prompt</button><span class="kecil muted">Disalin: ' + (S.ai.disalin || 0) + ' kali</span></div>' +
        '<div class="ai-links">' + K.layananAI.map(function (a) { return '<a class="btn ghost small" href="' + a.url + '" target="_blank" rel="noopener noreferrer">Buka ' + esc(a.nama) + '</a>'; }).join('') + '</div>' +
        '<p class="catatan-ai">Jangan menempelkan data pribadi ke layanan AI. Akses layanan berbeda di tiap negara; pilih yang bisa Anda buka. AI dapat keliru: selalu cocokkan angka dengan Kartu rujukan.</p>' +
        '<div class="form-item"><label class="lbl" for="ai-tempel">Tempel jawaban AI di sini</label><textarea id="ai-tempel" maxlength="6000" style="min-height:120px">' + esc(S.ai.tempel || '') + '</textarea></div>' +
        '<div class="cek-list"><span class="lbl"><b>Cek fakta jawaban AI</b></span>' +
        [['rentang', 'Rentang persentase tiap fraksi sama dengan tabel fraksi di materi.'], ['angka', 'Angka ALB dan rumus potongan yang disebut AI sesuai materi (atau AI mengaku tidak yakin).'], ['relevan', 'Saran AI masuk akal untuk kebun sawit rakyat di daerah saya.']].map(function (c) {
          return '<label><input type="checkbox" data-cek="' + c[0] + '"' + (S.ai.cek && S.ai.cek[c[0]] ? ' checked' : '') + '><span>' + esc(c[1]) + '</span></label>';
        }).join('') + '</div>' +
        '<div class="form-item"><label class="lbl" for="ai-catatan">Bagian jawaban AI yang keliru atau perlu dicek (tulis “tidak ada” bila semua sesuai)</label><textarea id="ai-catatan" maxlength="1500">' + esc(S.ai.catatan || '') + '</textarea></div>' +
        '<button type="button" class="btn" id="ai-simpan">Simpan hasil cek</button></div>';
      $$('[data-tpl]', container).forEach(function (b) { b.addEventListener('click', function () { ctx.tpl = b.getAttribute('data-tpl'); gambar(); }); });
      var sel = $('#ai-tandan', container);
      if (sel) { sel.addEventListener('change', function () { ctx.tandan = sel.value; gambar(); }); }
      $('#ai-salin', container).addEventListener('click', function () {
        salin($('#ai-prompt', container).value, function () {
          S.ai.disalin = (S.ai.disalin || 0) + 1;
          catat('genai', 'Prompt "' + ctx.tpl + '" disalin');
          toast('Prompt disalin. Buka layanan GenAI lalu tempel (Ctrl+V atau tekan lama).');
          var sp = $('#ai-salin', container).nextElementSibling; if (sp) { sp.textContent = 'Disalin: ' + S.ai.disalin + ' kali'; }
        });
      });
      $('#ai-simpan', container).addEventListener('click', function () {
        S.ai.tempel = $('#ai-tempel', container).value.trim();
        S.ai.catatan = $('#ai-catatan', container).value.trim();
        S.ai.cek = {};
        $$('[data-cek]', container).forEach(function (c) { S.ai.cek[c.getAttribute('data-cek')] = c.checked; });
        catat('genai', 'Jawaban AI dicek (' + Object.keys(S.ai.cek).filter(function (k) { return S.ai.cek[k]; }).length + '/3 butir)');
        simpan(); cekLencana(); renderStepper();
        toast('Hasil cek jawaban AI tersimpan.');
      });
    }
    gambar();
  }
  function bukaAI(tpl, tandanId) {
    var d = $('#ai-drawer');
    d.hidden = false;
    aiWorkspace($('#ai-drawer-body'), tpl, tandanId);
    $('#ai-close').focus();
  }
  $('#ai-close').addEventListener('click', function () { $('#ai-drawer').hidden = true; });
  $('#btn-ai').addEventListener('click', function () { bukaAI(aktif === 'kasus' ? 'kasus' : (aktif === 'refleksi' ? 'refleksi' : 'tandan')); });

  RENDER.refleksi = function () {
    var el = $('#step-refleksi');
    el.innerHTML = '<h1 id="h-refleksi">Refleksi dengan bantuan GenAI</h1>' + pemandu('refleksi') +
      '<div class="grid2"><div class="kartu sasirangan"><h2>1. Tulis refleksi Anda dulu</h2>' + K.refleksi.map(function (r, i) {
        return '<div class="form-item"><label class="lbl" for="rf-' + r.id + '">' + (i + 1) + '. ' + esc(r.tanya) + '</label>' +
          (r.id === 'r2' && daftarSalah().length ? '<p class="kecil muted">Dari catatan Anda: ' + esc(daftarSalah().join('; ')) + '.</p>' : '') +
          '<textarea id="rf-' + r.id + '" data-rf="' + r.id + '" maxlength="1200">' + esc(S.refleksi[r.id] || '') + '</textarea></div>';
      }).join('') + '<p class="kecil muted">Tersimpan otomatis di perangkat ini.</p></div>' +
      '<div class="kartu"><h2>2. Tanya GenAI, lalu cek faktanya</h2><div id="ai-inline"></div></div></div>' + navBawah('kasus', 'ringkasan', 'Ringkasan');
    $$('[data-rf]', el).forEach(function (ta) {
      ta.addEventListener('input', function () { S.refleksi[ta.getAttribute('data-rf')] = ta.value; simpan(); });
      ta.addEventListener('change', function () { renderStepper(); });
    });
    aiWorkspace($('#ai-inline'), 'refleksi');
  };

  // ------------------------------------------------------------ 7. Ringkasan
  function predikat(p) { return p >= 85 ? 'Sangat baik' : p >= 70 ? 'Baik' : p >= 55 ? 'Cukup' : 'Perlu mengulang bagian yang keliru'; }
  function lencanaSVG(id) {
    var warna = { kayuh: ['#2f6b4a', '#e7b12f'], waja: ['#5a2a68', '#d9622a'], cek: ['#17392b', '#e0a92e'] }[id];
    var ikon = {
      kayuh: '<path d="M14 40 Q32 50 50 40" stroke="#fff" stroke-width="3" fill="none"/><path d="M20 20 L30 42 M44 20 L34 42" stroke="#fff" stroke-width="3"/>',
      waja: '<path d="M32 12 L36 30 L32 52 L28 30Z" fill="#fff"/><path d="M24 30 L40 30" stroke="#fff" stroke-width="3"/>',
      cek: '<circle cx="29" cy="29" r="10" stroke="#fff" stroke-width="3" fill="none"/><path d="M36 36 L46 46" stroke="#fff" stroke-width="4"/><path d="M24 29 L28 33 L35 25" stroke="#fff" stroke-width="2.5" fill="none"/>'
    }[id];
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="' + warna[0] + '"/><path d="M6 46 L13 40 L20 46 L27 40 L34 46 L41 40 L48 46 L55 40 L60 44" stroke="' + warna[1] + '" stroke-width="2.5" fill="none" stroke-dasharray="3 2"/>' + ikon + '</svg>';
  }
  RENDER.ringkasan = function () {
    var el = $('#step-ringkasan');
    var postDone = Object.keys(S.post).length === K.tesSingkat.length;
    var tot = skorVR() + skorTPH() + skorAR() + skorKuis() + skorKasus();
    var maks = MAKS.vr + MAKS.tph + MAKS.ar + MAKS.kuis + MAKS.kasus;
    var pct = Math.round(tot / maks * 100);
    var h = '<h1 id="h-ringkasan">Ringkasan belajar</h1>' + pemandu('ringkasan');
    h += '<div class="kartu"><h2>Tes akhir (3 soal)</h2>' + (postDone ? '<p>Tes awal: <b>' + (Object.keys(S.pre).length ? skorTes(S.pre) + '/3' : 'belum dikerjakan') + '</b> → Tes akhir: <b>' + skorTes(S.post) + '/3</b></p>' + soalTes('post', S.post, true) :
      '<p class="kecil muted">Soal yang sama dengan tes awal. Kerjakan untuk melihat perubahan pemahaman Anda.</p>' + soalTes('post', S.post, false) + '<button type="button" class="btn" id="btn-post">Simpan tes akhir</button>') + '</div>';
    h += '<div class="grid2"><div class="kartu sasirangan"><h2>Skor aktivitas</h2><div class="skor-besar">' + pct + '%</div><p><b>' + predikat(pct) + '</b> · ' + tot + ' dari ' + maks + ' poin' + (S.nama ? ' · ' + esc(S.nama) : '') + '</p><div class="bar"><span style="width:' + pct + '%"></span></div>' +
      '<div class="tabel-wrap" style="margin-top:12px"><table class="tabel"><thead><tr><th>Aktivitas</th><th>Skor</th></tr></thead><tbody>' +
      [['Eksplorasi VR: klasifikasi 7 tandan', skorVR(), MAKS.vr], ['Periksa TPH', skorTPH(), MAKS.tph], ['Amati AR', skorAR(), MAKS.ar], ['Sortasi', skorKuis(), MAKS.kuis], ['Studi kasus', skorKasus(), MAKS.kasus]].map(function (r) {
        return '<tr><td>' + r[0] + '</td><td>' + r[1] + '/' + r[2] + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="kartu"><h2>Lencana nilai banua</h2><div class="lencana-list">' + Object.keys(K.nilaiBanua).map(function (id) {
        var n = K.nilaiBanua[id], dapat = !!S.lencana[id];
        return '<div class="lencana' + (dapat ? ' dapat' : '') + '">' + lencanaSVG(id) + '<div><b lang="bjn">' + esc(n.nama) + '</b><span class="kecil">“' + esc(n.arti) + '”. ' + esc(n.syarat) + '</span><div class="kecil"><b>' + (dapat ? 'Diperoleh' : 'Belum diperoleh') + '</b></div></div></div>';
      }).join('') + '</div></div></div>';
    h += '<div class="kartu"><h2>Rincian klasifikasi tandan</h2><div class="tabel-wrap"><table class="tabel"><thead><tr><th>Tandan</th><th>Kunci</th><th>Jawaban Anda</th><th>Skor</th><th>Status</th></tr></thead><tbody>' +
      K.tandan.map(function (t) {
        var j = S.tandan[t.id], f = fraksiInfo(t.fraksi);
        return '<tr><td>' + t.id + '</td><td><span class="swatch" style="background:' + TB.COLORS[t.fraksi][1] + '"></span>F' + t.fraksi + ' · ' + esc(f.keputusan) + '</td><td>' + (j ? 'F' + esc(j.fraksi) + ' · ' + esc(labelKep(j.keputusan)) + ' · ' + fmt(Number(j.persen)) + '%' : '–') + '</td><td>' + (j ? j.skor + '/4' : '–') + '</td><td>' + (j ? (j.dipanen ? 'dipanen' : (bisaPanen(t) ? 'belum dipanen' : 'dibiarkan')) : 'belum diperiksa') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="kecil">Aktivitas GenAI: prompt disalin ' + (S.ai.disalin || 0) + ' kali · jawaban AI ' + ((S.ai.tempel || '').length ? 'ditempel dan dicek' : 'belum ditempel') + '.</p></div>';
    h += '<div class="kartu no-print"><h2>Simpan hasil</h2><p class="kecil">Unduh jurnal belajar (.txt) untuk dilampirkan ke LMS, atau cetak halaman ini sebagai PDF.</p><div class="row"><button type="button" class="btn" id="btn-unduh">Unduh jurnal belajar (.txt)</button><button type="button" class="btn ghost" id="btn-cetak">Cetak / simpan PDF</button><button type="button" class="btn ghost" id="btn-ulang">Mulai ulang dari awal</button></div></div>';
    h += navBawah('refleksi', null);
    el.innerHTML = h;
    var bp = $('#btn-post');
    if (bp) {
      bp.addEventListener('click', function () {
        var jaw = {};
        K.tesSingkat.forEach(function (q) { var r = $('input[name="post-' + q.id + '"]:checked'); if (r) { jaw[q.id] = +r.value; } });
        if (Object.keys(jaw).length < K.tesSingkat.length) { toast('Jawab ketiga soal tes akhir dulu.'); return; }
        S.post = jaw; catat('tes-akhir', 'Skor ' + skorTes(jaw) + '/3'); simpan();
        bunyi.benar(); RENDER.ringkasan(); renderStepper();
      });
    }
    $('#btn-unduh').addEventListener('click', unduhJurnal);
    $('#btn-cetak').addEventListener('click', function () { window.print(); });
    $('#btn-ulang').addEventListener('click', function () {
      if (!window.confirm('Hapus semua jawaban di perangkat ini dan mulai dari awal?')) { return; }
      try { localStorage.removeItem(STORE); } catch (e) { /* abaikan */ }
      location.hash = 'tujuan';
      location.reload();
    });
  };

  function unduhJurnal() {
    var L = [];
    L.push('JURNAL BELAJAR – TANDAN MASAK (Kriteria matang panen & fraksi TBS)');
    L.push('Nama/NIM: ' + (S.nama || '-'));
    L.push('Dibuat: ' + new Date().toLocaleString('id-ID'));
    L.push('');
    L.push('Tes awal: ' + (Object.keys(S.pre).length ? skorTes(S.pre) + '/3' : '-') + ' | Tes akhir: ' + (Object.keys(S.post).length ? skorTes(S.post) + '/3' : '-'));
    L.push('Skor: VR ' + skorVR() + '/' + MAKS.vr + ', TPH ' + skorTPH() + '/' + MAKS.tph + ', AR ' + skorAR() + '/' + MAKS.ar + ', Sortasi ' + skorKuis() + '/' + MAKS.kuis + ', Studi kasus ' + skorKasus() + '/' + MAKS.kasus);
    L.push('Lencana: ' + (Object.keys(S.lencana).map(function (k) { return K.nilaiBanua[k].nama; }).join(', ') || '-'));
    L.push('');
    L.push('KLASIFIKASI TANDAN');
    K.tandan.forEach(function (t) {
      var j = S.tandan[t.id];
      L.push('- Tandan ' + t.id + ': kunci F' + t.fraksi + (j ? ' | jawaban F' + j.fraksi + ', ' + fmt(Number(j.persen)) + '%, ' + labelKep(j.keputusan) + ' | skor ' + j.skor + '/4 | alasan: ' + (j.alasan || '-') : ' | belum diperiksa'));
    });
    L.push('');
    L.push('AMATI AR: ' + (S.ar.selesai ? 'X=F' + S.ar.fX + ', Y=F' + S.ar.fY + ', Z=F' + S.ar.fZ + ', dipanen: ' + S.ar.panen + ' | amatan: ' + (S.ar.amatan || '-') : 'belum'));
    L.push('');
    L.push('REKOMENDASI STUDI KASUS:');
    L.push(S.kasus.rekomendasi || '-');
    L.push('');
    L.push('REFLEKSI');
    K.refleksi.forEach(function (r, i) { L.push((i + 1) + '. ' + r.tanya); L.push('   ' + (S.refleksi[r.id] || '-')); });
    L.push('');
    L.push('GENAI: prompt disalin ' + (S.ai.disalin || 0) + ' kali');
    L.push('Jawaban AI yang ditempel:');
    L.push(S.ai.tempel || '-');
    L.push('Cek fakta: ' + ['rentang', 'angka', 'relevan'].map(function (k) { return k + '=' + (S.ai.cek && S.ai.cek[k] ? 'ya' : 'tidak'); }).join(', '));
    L.push('Catatan koreksi atas jawaban AI: ' + (S.ai.catatan || '-'));
    L.push('');
    L.push('LOG AKTIVITAS');
    S.log.forEach(function (x) { L.push(x.t + ' [' + x.jenis + '] ' + x.teks); });
    var blob = new Blob([L.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Jurnal Belajar Tandan Masak' + (S.nama ? ' - ' + S.nama.replace(/[^\w\- ]/g, '') : '') + '.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  // ------------------------------------------------------------ Kartu rujukan
  function bukaRujukan() {
    var b = $('#rujukan-body');
    b.innerHTML = '<h3>Fraksi kematangan tandan</h3><div class="tabel-wrap"><table class="tabel"><thead><tr><th>Fraksi</th><th>Buah luar yang membrondol</th><th>Derajat kematangan</th><th>Keputusan</th></tr></thead><tbody>' +
      K.fraksi.map(function (f) { return '<tr><td><span class="swatch" style="background:' + TB.COLORS[f.kode][1] + '"></span>' + f.kode + '</td><td>' + esc(f.persen) + '</td><td>' + esc(f.derajat) + '</td><td>' + esc(f.keputusan) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<h3 style="margin-top:14px">Satu kriteria lapangan untuk semua pemanen</h3><ul><li>Minimal 5 brondolan lepas alami di piringan per tandan (angka contoh; tetapkan satu angka baku sesuai SOP kebun).</li><li>Warna buah luar jingga kemerahan, bukan lagi hitam keunguan.</li><li>Mandor, pemanen, dan kerani memakai angka yang sama.</li></ul>' +
      '<h3>Kelas mutu: kelainan</h3><ul><li><b>Buah batu</b>: brondolan sulit lepas walau sudah matang.</li><li><b>Partenokarpi</b>: didominasi brondolan kecil tanpa biji.</li><li><b>Dimakan tikus</b>: lebih dari 25% buah luar digerogoti.</li><li><b>Tangkai panjang</b>: tangkai tersisa lebih dari 2 cm.</li></ul>' +
      '<h3>Potongan timbangan saat sortasi</h3><div class="tabel-wrap"><table class="tabel"><tbody>' +
      [['Buah mentah (fraksi 00 dan 0)', '50% × persen buah mentah'], ['Buah lewat matang', '25% × (persen lewat matang − 5%)'], ['Tandan kosong', '100% × persen tandan kosong'], ['Tangkai panjang', '1% × persen tangkai panjang'], ['Brondolan kurang dari 12,5%', '30% × (12,5% − persen brondolan)'], ['Brondolan kotor', '2 × berat kotoran']].map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="kecil muted">' + esc(K.kasus.catatanAturan) + '</p>' +
      '<h3>ALB dan buah restan</h3><ul><li>ALB buah mentah (F0) ±2,3%; buah matang (F2–F3) 3,1–3,3%; lewat matang dan busuk (F4–F5) ±4,0%.</li><li>Buah restan (tidak diolah pada hari panen): enzim lipase terus bekerja, ALB naik, berat menyusut. Target: seluruh TBS dan brondolan sampai di pabrik pada hari panen.</li></ul>' +
      '<h3>Aturan TPH</h3><ul><li>TBS disusun berbaris, 5–10 tandan per baris; tangkai menghadap ke atas dan diberi nomor pemanen.</li><li>Tangkai tidak boleh dipotong di TPH.</li><li>Brondolan bersih, ditaruh di atas alas karung.</li><li>Janjang kosong tidak ikut dikirim.</li></ul>' +
      '<h3>Sumber</h3><ol class="kecil">' + K.rujukan.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>';
    var m = $('#modal-rujukan');
    m.hidden = false;
    $('[data-close]', m).focus();
  }
  $('#btn-rujukan').addEventListener('click', bukaRujukan);
  $('#modal-rujukan').addEventListener('click', function (e) {
    if (e.target === this || (e.target.closest && e.target.closest('[data-close]'))) { this.hidden = true; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { $('#modal-rujukan').hidden = true; $('#ai-drawer').hidden = true; }
  });

  // ------------------------------------------------------------ suara on/off
  function tombolSuara() {
    var b = $('#btn-suara');
    b.textContent = 'Suara: ' + (S.suara ? 'aktif' : 'mati');
    b.setAttribute('aria-pressed', String(!!S.suara));
  }
  $('#btn-suara').addEventListener('click', function () {
    S.suara = !S.suara; simpan(); tombolSuara();
    if (!S.suara && 'speechSynthesis' in window) { window.speechSynthesis.cancel(); }
  });

  // ------------------------------------------------------------ mulai
  tombolSuara();
  pasangVR();
  RENDER.vr();
  tampil((location.hash || '#tujuan').slice(1));
  window.TandanMasak = { state: function () { return S; } }; // untuk pengujian
}());
