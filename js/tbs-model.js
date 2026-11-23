/*
 * tbs-model.js
 * Generator geometri tandan buah segar (TBS) kelapa sawit dari bentuk primitif.
 * Dipakai bersama oleh:
 *   - adegan VR di browser (js/vr-components.js, three.js bawaan A-Frame), dan
 *   - skrip pembuat model GLB untuk AR (dijalankan sekali dengan Node.js saat pengembangan).
 * Karena memakai seed yang sama, tandan di VR dan di AR tampak konsisten.
 *
 * CATATAN VALIDITAS:
 * - Rentang persentase buah luar yang membrondol per fraksi mengikuti tabel fraksi di materi kuliah
 *   (slide "Fraksi kematangan tandan"). Nilai di LOOSE_OUTER sengaja dipilih di TENGAH rentang.
 * - Warna, ukuran tandan, jumlah duri, dan jumlah brondolan di piringan adalah ILUSTRASI VISUAL,
 *   bukan data pengukuran lapangan. [CEK] jumlah brondolan per fraksi di BRONDOLAN_PIRINGAN hanya
 *   ilustrasi yang konsisten dengan kriteria contoh ">= 5 brondolan per tandan" (SOP kebun berbeda-beda).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TBSModel = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // PRNG deterministik (mulberry32) agar bentuk tandan selalu sama untuk seed yang sama.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Tiga warna per fraksi: [ujung buah terpapar, tengah, pangkal/dekat tangkai].
  // Disusun agar sesuai deskripsi materi: mentah = hitam keunguan, matang = jingga kemerahan.
  var COLORS = {
    '00': ['#1d1320', '#2a1a2b', '#3b2633'],
    '0':  ['#27151f', '#3b1d26', '#5a2d27'],
    '1':  ['#4b1a1b', '#76291a', '#a2461d'],
    '2':  ['#9c2318', '#c13916', '#dd681c'],
    '3':  ['#ad2817', '#d2481a', '#ea7d22'],
    '4':  ['#a3331a', '#c6541e', '#de8d2d'],
    '5':  ['#6b3318', '#8b4921', '#a66833'],
    'jk': ['#5a4630', '#6b5438', '#7d6442']   // janjang kosong (tandan kosong)
  };

  // Proporsi buah luar yang sudah membrondol (lepas), di tengah rentang tabel fraksi:
  // 00: 0% | 0: 1-12,5% | 1: 12,5-25% | 2: 25-50% | 3: 50-75% | 4: 75-100% | 5: buah dalam ikut lepas
  var LOOSE_OUTER = { '00': 0, '0': 0.075, '1': 0.175, '2': 0.35, '3': 0.625, '4': 0.85, '5': 1, 'jk': 1 };
  // Fraksi 5: sebagian buah lapisan dalam juga lepas (ilustrasi).
  var LOOSE_INNER = { '5': 0.5, 'jk': 1 };

  // [CEK] Ilustrasi jumlah brondolan lepas alami di piringan untuk tiap fraksi.
  var BRONDOLAN_PIRINGAN = { '00': 0, '0': 2, '1': 4, '2': 9, '3': 16, '4': 28, '5': 40, 'jk': 0 };

  var CORE_COLOR = { normal: '#9a6f3e', '5': '#8a6238', 'jk': '#6f573a' };
  var SOCKET_COLOR = { normal: '#efe0b4', '5': '#d9c08a', 'jk': '#4a3826' };
  var SPINE_COLOR = '#2a1d14';
  var STALK_COLOR = '#5b5a2c';

  function norm(v) {
    var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }

  /**
   * Membuat data tandan.
   * @param {string} fraksi  '00','0','1','2','3','4','5' atau 'jk' (janjang kosong)
   * @param {number} seed
   * @param {object} [opts]  { rx, ry, n, stalkLen }
   * @returns {object} { fruitlets, sockets, spines, inner, core, stalk, colors, rx, ry }
   *   Koordinat dalam meter. Tangkai di sumbu +Y (atas), ujung tandan di -Y.
   */
  function generate(fraksi, seed, opts) {
    opts = opts || {};
    var r = rng(seed || 1);
    var rx = opts.rx || 0.165;
    var ry = opts.ry || 0.22;
    var N = opts.n || 300;
    var looseP = LOOSE_OUTER[fraksi] !== undefined ? LOOSE_OUTER[fraksi] : 0;
    var golden = Math.PI * (3 - Math.sqrt(5));
    var out = {
      fraksi: fraksi, rx: rx, ry: ry,
      fruitlets: [], sockets: [], spines: [], inner: [],
      colors: COLORS[fraksi] || COLORS['2'],
      coreColor: CORE_COLOR[fraksi] || CORE_COLOR.normal,
      socketColor: SOCKET_COLOR[fraksi] || SOCKET_COLOR.normal,
      spineColor: SPINE_COLOR,
      stalkColor: STALK_COLOR
    };

    // Titik permukaan bulat telur (distribusi Fibonacci), area tangkai dilewati.
    var pts = [];
    var i;
    for (i = 0; i < N; i++) {
      var u = 1 - 2 * (i + 0.5) / N;           // 1 = dekat tangkai, -1 = ujung bawah
      if (u > 0.9) { continue; }
      var th = i * golden;
      var rad = Math.sqrt(1 - u * u);
      var taper = 1 - 0.16 * Math.max(0, -u);  // sedikit meruncing ke ujung bawah
      var x = rx * rad * Math.cos(th) * taper;
      var z = rx * rad * Math.sin(th) * taper;
      var y = ry * u;
      var n = norm([x / (rx * rx), y / (ry * ry), z / (rx * rx)]);
      pts.push({ p: [x, y, z], n: n, u: u });
    }

    // Pilih tepat round(jumlah * proporsi) buah yang lepas, acak tapi deterministik.
    var order = pts.map(function (_, k) { return k; });
    for (i = order.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1));
      var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
    }
    var nLoose = Math.round(pts.length * looseP);
    var loose = new Array(pts.length);
    for (i = 0; i < nLoose; i++) { loose[order[i]] = true; }

    for (i = 0; i < pts.length; i++) {
      var pt = pts[i];
      if (loose[i]) {
        out.sockets.push({
          p: [pt.p[0] - pt.n[0] * 0.006, pt.p[1] - pt.n[1] * 0.006, pt.p[2] - pt.n[2] * 0.006],
          n: pt.n,
          s: [0.0135, 0.0135, 0.0045]
        });
      } else {
        // Ember warna: 0 = ujung terpapar (bawah), 1 = tengah, 2 = pangkal (dekat tangkai)
        var b = pt.u > 0.4 ? 2 : (pt.u < -0.35 ? 0 : 1);
        var rr = r();
        if (rr < 0.18) { b = Math.max(0, b - 1); } else if (rr > 0.86) { b = Math.min(2, b + 1); }
        var k = 0.9 + r() * 0.22;
        out.fruitlets.push({
          p: [pt.p[0] + pt.n[0] * 0.004, pt.p[1] + pt.n[1] * 0.004, pt.p[2] + pt.n[2] * 0.004],
          n: norm([pt.n[0] + (r() - 0.5) * 0.25, pt.n[1] + (r() - 0.5) * 0.25, pt.n[2] + (r() - 0.5) * 0.25]),
          s: [0.0196 * k, 0.0186 * k, 0.028 * k],
          b: b
        });
      }
    }

    // Lapisan buah dalam (hanya ditampilkan sebagai buah untuk fraksi 5; lainnya diwakili inti pucat).
    if (LOOSE_INNER[fraksi] !== undefined && fraksi !== 'jk') {
      var N2 = 220;
      for (i = 0; i < N2; i++) {
        var u2 = 1 - 2 * (i + 0.5) / N2;
        if (u2 > 0.88) { continue; }
        if (r() < LOOSE_INNER[fraksi]) { continue; }
        var th2 = i * golden + 0.7;
        var rad2 = Math.sqrt(1 - u2 * u2);
        var x2 = rx * 0.86 * rad2 * Math.cos(th2);
        var z2 = rx * 0.86 * rad2 * Math.sin(th2);
        var y2 = ry * 0.9 * u2;
        var n2 = norm([x2, y2 * 0.6, z2]);
        var k2 = 0.8 + r() * 0.2;
        out.inner.push({ p: [x2, y2, z2], n: n2, s: [0.015 * k2, 0.014 * k2, 0.02 * k2], b: r() < 0.5 ? 1 : 2 });
      }
    }

    // Duri pada ujung spikelet (lebih menonjol pada janjang kosong).
    var nSp = fraksi === 'jk' ? 140 : 64;
    for (i = 0; i < nSp; i++) {
      var uu = 0.85 - r() * 1.75;
      var tt = r() * Math.PI * 2;
      var rd = Math.sqrt(Math.max(0, 1 - uu * uu));
      var scale = fraksi === 'jk' ? 0.88 : 1.0;
      var sx = rx * scale * rd * Math.cos(tt), sz = rx * scale * rd * Math.sin(tt), sy = ry * scale * uu;
      var sn = norm([sx / (rx * rx), sy / (ry * ry) - 0.6, sz / (rx * rx)]);
      out.spines.push({ p: [sx, sy, sz], n: sn, len: 0.03 + r() * 0.018, w: 0.0035 });
    }

    out.core = { s: [rx * 0.86, ry * 0.9, rx * 0.86] };
    if (fraksi === 'jk') { out.core.s = [rx * 0.8, ry * 0.88, rx * 0.8]; }
    var stalkLen = opts.stalkLen || 0.11;
    out.stalk = { r0: 0.034, r1: 0.027, y0: ry * 0.8, len: stalkLen };
    return out;
  }

  /**
   * Sebaran brondolan (buah lepas) di atas bidang datar.
   * @returns {Array} [{x, z, rot, tilt, b, s}]
   */
  function scatter(count, seed, rMin, rMax, arc) {
    var r = rng(seed || 7);
    var res = [];
    var a0 = arc ? arc[0] : 0, a1 = arc ? arc[1] : Math.PI * 2;
    for (var i = 0; i < count; i++) {
      var a = a0 + r() * (a1 - a0);
      var d = rMin + Math.sqrt(r()) * (rMax - rMin);
      res.push({
        x: Math.cos(a) * d, z: Math.sin(a) * d,
        rot: r() * Math.PI * 2, tilt: (r() - 0.5) * 0.8,
        b: r() < 0.5 ? 0 : (r() < 0.6 ? 1 : 2),
        s: 0.9 + r() * 0.25
      });
    }
    return res;
  }

  /** Sampel 40 buah luar untuk lembar pengamatan: jumlah yang lepas sesuai fraksi. */
  function sample40(fraksi) {
    var p = LOOSE_OUTER[fraksi] !== undefined ? LOOSE_OUTER[fraksi] : 0;
    return Math.round(40 * p);
  }

  return {
    rng: rng,
    generate: generate,
    scatter: scatter,
    sample40: sample40,
    COLORS: COLORS,
    LOOSE_OUTER: LOOSE_OUTER,
    BRONDOLAN_PIRINGAN: BRONDOLAN_PIRINGAN
  };
}));
