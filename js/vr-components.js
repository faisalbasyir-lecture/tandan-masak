/*
 * vr-components.js — komponen A-Frame untuk blok kebun sawit virtual (mode VR).
 * Semua objek dibangun dari bentuk primitif dan tekstur kanvas buatan sendiri
 * (tanpa model atau gambar dari luar), sehingga adegan tetap jalan tanpa internet
 * setelah pustaka A-Frame termuat.
 *
 * Komunikasi dengan app.js:
 *   - adegan memancarkan event 'kebun-pilih' { jenis: 'tandan'|'tph'|'pemandu'|'truk', id }
 *   - app.js memanggil window.KebunVR.* (setTandanState, panen, setTphState, kartu VR, dll.)
 */
(function () {
  'use strict';
  if (!window.AFRAME || !window.TBSModel) { return; }
  var THREE = AFRAME.THREE;
  var T = window.TBSModel;

  // ------------------------------------------------------------------ util
  function setSRGB(t) {
    if ('colorSpace' in t) { t.colorSpace = THREE.SRGBColorSpace; } else if ('encoding' in t) { t.encoding = THREE.sRGBEncoding; }
    return t;
  }
  function canvasTexture(w, h, draw, repeat) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = setSRGB(new THREE.CanvasTexture(c));
    t.anisotropy = 4;
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
    }
    return t;
  }
  function rand(r, a, b) { return a + r() * (b - a); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }

  // ------------------------------------------------------------------ tekstur
  var TEX = {};
  var MAKE = {
    frond: function () {
      return canvasTexture(128, 512, function (g, w, h) {
        var r = T.rng(5);
        g.clearRect(0, 0, w, h);
        var cx = w / 2;
        var greens = ['#3d6a25', '#4a7a2b', '#365f22', '#557f2f', '#2f5620'];
        for (var y = h - 60; y > 6; y -= 3.2) {
          var t = (h - y) / h;
          var k = Math.max(0, Math.min(1, (t - 0.1) / 0.9));
          var L = (w / 2 - 5) * Math.pow(Math.sin(k * Math.PI * 0.92 + 0.08), 0.7);
          var ang = 0.55 + r() * 0.25;
          for (var side = -1; side <= 1; side += 2) {
            g.strokeStyle = pick(r, greens);
            g.lineWidth = 2.1;
            g.beginPath();
            g.moveTo(cx, y);
            g.quadraticCurveTo(cx + side * L * 0.6, y - L * Math.sin(ang) * 0.35, cx + side * L * Math.cos(ang * 0.6), y - L * Math.sin(ang) * 0.75);
            g.stroke();
          }
        }
        // tulang daun (rachis) dan pangkal pelepah berduri
        g.fillStyle = '#5d6a2a';
        g.beginPath();
        g.moveTo(cx - 5, h); g.lineTo(cx + 5, h); g.lineTo(cx + 1.2, 4); g.lineTo(cx - 1.2, 4); g.closePath();
        g.fill();
        g.strokeStyle = '#3b3a1c'; g.lineWidth = 1.2;
        for (var yy = h - 4; yy > h - 60; yy -= 6) {
          g.beginPath(); g.moveTo(cx - 5, yy); g.lineTo(cx - 11, yy - 4); g.stroke();
          g.beginPath(); g.moveTo(cx + 5, yy); g.lineTo(cx + 11, yy - 4); g.stroke();
        }
      });
    },
    trunk: function () {
      return canvasTexture(256, 256, function (g, w, h) {
        var r = T.rng(9);
        g.fillStyle = '#5f4a30'; g.fillRect(0, 0, w, h);
        // pangkal pelepah tua (pola belah ketupat)
        for (var row = 0; row < 8; row++) {
          for (var col = 0; col < 5; col++) {
            var x = col * 52 + (row % 2) * 26;
            var y = row * 34;
            g.fillStyle = pick(r, ['#6f5737', '#7a613e', '#665033', '#584228']);
            g.beginPath();
            g.moveTo(x, y + 6); g.lineTo(x + 24, y - 10); g.lineTo(x + 48, y + 6); g.lineTo(x + 24, y + 30); g.closePath();
            g.fill();
            g.strokeStyle = '#3e2f1d'; g.lineWidth = 3; g.stroke();
            if (r() < 0.35) { g.fillStyle = 'rgba(96,128,60,0.55)'; g.beginPath(); g.arc(x + 24, y + 8, 6 + r() * 6, 0, Math.PI * 2); g.fill(); }
          }
        }
      }, [2, 2]);
    },
    grass: function () {
      return canvasTexture(256, 256, function (g, w, h) {
        var r = T.rng(13);
        g.fillStyle = '#6b8a3b'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 2600; i++) {
          g.strokeStyle = pick(r, ['#7c9c46', '#5d7c33', '#88a851', '#9aa456', '#4f6e2c', '#a08a52']);
          g.lineWidth = 1;
          var x = r() * w, y = r() * h;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(r, -2, 2), y - rand(r, 2, 6)); g.stroke();
        }
      }, [36, 36]);
    },
    soil: function () {
      return canvasTexture(256, 256, function (g, w, h) {
        var r = T.rng(17);
        g.fillStyle = '#93704a'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 1800; i++) {
          g.fillStyle = pick(r, ['#86643f', '#a27f56', '#7a5a38', '#b08c62', '#6f5233']);
          g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
        }
        for (var j = 0; j < 30; j++) {
          g.strokeStyle = 'rgba(70,90,40,0.6)'; g.lineWidth = 1;
          var x = r() * w, y = r() * h;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + 3, y - 5); g.stroke();
        }
      }, [2, 2]);
    },
    road: function () {
      return canvasTexture(256, 256, function (g, w, h) {
        var r = T.rng(19);
        g.fillStyle = '#b39871'; g.fillRect(0, 0, w, h);
        for (var i = 0; i < 2200; i++) {
          g.fillStyle = pick(r, ['#a38760', '#c4ab86', '#93795a', '#d1bc98']);
          g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2);
        }
      }, [12, 2]);
    },
    karung: function () {
      return canvasTexture(128, 128, function (g, w, h) {
        g.fillStyle = '#b48d55'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(120,88,48,0.8)'; g.lineWidth = 1;
        for (var i = 0; i < w; i += 4) {
          g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke();
          g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke();
        }
      });
    },
    sky: function () {
      return canvasTexture(8, 256, function (g, w, h) {
        var gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, '#6fa9d8');
        gr.addColorStop(0.42, '#a9cfe6');
        gr.addColorStop(0.5, '#dfeadf');
        gr.addColorStop(1, '#c9d9bd');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      });
    },
    // Kain bermotif terinspirasi sasirangan (motif zigzag "gigi haruan" dan "ombak"), untuk baju pemandu.
    sasirangan: function () {
      return canvasTexture(256, 256, function (g, w, h) {
        g.fillStyle = '#5a2a68'; g.fillRect(0, 0, w, h);
        for (var row = 0; row < 4; row++) {
          var y0 = row * 64;
          g.fillStyle = row % 2 ? '#e0a92e' : '#d9622a';
          g.beginPath();
          g.moveTo(0, y0 + 40);
          for (var x = 0; x <= w; x += 32) { g.lineTo(x + 16, y0 + 14); g.lineTo(x + 32, y0 + 40); }
          g.lineTo(w, y0 + 46); g.lineTo(0, y0 + 46); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(255,248,230,0.9)'; g.lineWidth = 2; g.setLineDash([3, 4]);
          g.beginPath();
          g.moveTo(0, y0 + 52);
          for (var x2 = 0; x2 <= w; x2 += 32) { g.quadraticCurveTo(x2 + 8, y0 + 44, x2 + 16, y0 + 52); g.quadraticCurveTo(x2 + 24, y0 + 60, x2 + 32, y0 + 52); }
          g.stroke(); g.setLineDash([]);
        }
      }, [2, 1]);
    },
    tanggui: function () {
      return canvasTexture(128, 128, function (g, w, h) {
        g.fillStyle = '#d6bd85'; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(140,110,60,0.7)'; g.lineWidth = 1.5;
        for (var i = 0; i < w; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
        g.strokeStyle = 'rgba(90,42,104,0.8)'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(0, h * 0.75); g.lineTo(w, h * 0.75); g.stroke();
      }, [6, 1]);
    }
  };
  function tex(name) { if (!TEX[name]) { TEX[name] = MAKE[name](); } return TEX[name]; }

  // ------------------------------------------------------------------ geometri bersama
  var GEO = {};
  function geo(name) {
    if (GEO[name]) { return GEO[name]; }
    var g;
    if (name === 'fruit') { g = new THREE.SphereGeometry(1, 8, 6); }
    if (name === 'core') { g = new THREE.SphereGeometry(1, 18, 14); }
    if (name === 'spine') { g = new THREE.ConeGeometry(1, 1, 5); g.translate(0, 0.5, 0); }
    if (name === 'brond') { g = new THREE.SphereGeometry(1, 7, 5); }
    GEO[name] = g;
    return g;
  }
  var ZAXIS = new THREE.Vector3(0, 0, 1);
  var YAXIS = new THREE.Vector3(0, 1, 0);

  function mergeGeometries(list) {
    var pos = [], nor = [], uv = [], idx = [], offset = 0;
    var v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
    list.forEach(function (it) {
      var g = it.geo, p = g.attributes.position, no = g.attributes.normal, u = g.attributes.uv;
      nm.getNormalMatrix(it.matrix);
      for (var i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(it.matrix);
        pos.push(v.x, v.y, v.z);
        if (no) { n.fromBufferAttribute(no, i).applyMatrix3(nm).normalize(); nor.push(n.x, n.y, n.z); }
        if (u) { uv.push(u.getX(i), u.getY(i)); }
      }
      var k;
      if (g.index) { for (k = 0; k < g.index.count; k++) { idx.push(g.index.getX(k) + offset); } } else { for (k = 0; k < p.count; k++) { idx.push(k + offset); } }
      offset += p.count;
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (nor.length) { out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); }
    if (uv.length) { out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); }
    out.setIndex(idx);
    out.computeBoundingSphere();
    return out;
  }

  function frondGeometry(len, width, droop) {
    var g = new THREE.PlaneGeometry(width, len, 2, 12);
    g.translate(0, len / 2, 0);
    g.rotateX(Math.PI / 2); // pangkal di titik asal, ujung ke +Z
    var p = g.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), z = p.getZ(i);
      p.setY(i, p.getY(i) - droop * z * z + 0.12 * Math.abs(x) * (z / len));
    }
    g.computeVertexNormals();
    return g;
  }

  function crownGeometry(nFronds, seed) {
    var r = T.rng(seed);
    var base = frondGeometry(3.7, 1.45, 0.045);
    var list = [];
    for (var i = 0; i < nFronds; i++) {
      var f = i / (nFronds - 1);
      var yaw = i * 2.39996 + r() * 0.2;
      var elev = THREE.MathUtils.degToRad(62 - f * 68 + (r() - 0.5) * 8);
      var m = new THREE.Matrix4().makeTranslation(0, -f * 0.5, 0)
        .multiply(new THREE.Matrix4().makeRotationY(yaw))
        .multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.24))
        .multiply(new THREE.Matrix4().makeRotationX(-elev))
        .multiply(new THREE.Matrix4().makeScale(1, 1, 0.85 + r() * 0.3));
      list.push({ geo: base, matrix: m });
    }
    return mergeGeometries(list);
  }

  // ------------------------------------------------------------------ komponen: tandan (TBS)
  AFRAME.registerComponent('tbs-bunch', {
    schema: {
      fraksi: { default: '2' },
      seed: { default: 1 },
      stalkLen: { default: 0.11 },
      size: { default: 1 }
    },
    init: function () {
      var d = T.generate(this.data.fraksi, this.data.seed, { stalkLen: this.data.stalkLen });
      var grp = new THREE.Group();
      var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), n = new THREE.Vector3();
      var colors = d.colors.map(function (h) { return new THREE.Color(h); });
      var jitter = new THREE.Color();
      var rr = T.rng(this.data.seed + 101);

      var fruits = d.fruitlets.concat(d.inner);
      if (fruits.length) {
        var im = new THREE.InstancedMesh(geo('fruit'), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0 }), fruits.length);
        fruits.forEach(function (f, i) {
          n.set(f.n[0], f.n[1], f.n[2]); q.setFromUnitVectors(ZAXIS, n);
          p.set(f.p[0], f.p[1], f.p[2]); s.set(f.s[0], f.s[1], f.s[2]);
          m4.compose(p, q, s); im.setMatrixAt(i, m4);
          jitter.copy(colors[f.b]).offsetHSL(0, 0, (rr() - 0.5) * 0.05);
          im.setColorAt(i, jitter);
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) { im.instanceColor.needsUpdate = true; }
        grp.add(im);
      }
      if (d.sockets.length) {
        var sm = new THREE.InstancedMesh(geo('fruit'), new THREE.MeshStandardMaterial({ color: d.socketColor, roughness: 0.9 }), d.sockets.length);
        d.sockets.forEach(function (f, i) {
          n.set(f.n[0], f.n[1], f.n[2]); q.setFromUnitVectors(ZAXIS, n);
          p.set(f.p[0], f.p[1], f.p[2]); s.set(f.s[0], f.s[1], f.s[2]);
          m4.compose(p, q, s); sm.setMatrixAt(i, m4);
        });
        sm.instanceMatrix.needsUpdate = true;
        grp.add(sm);
      }
      if (d.spines.length) {
        var spm = new THREE.InstancedMesh(geo('spine'), new THREE.MeshStandardMaterial({ color: d.spineColor, roughness: 0.7 }), d.spines.length);
        d.spines.forEach(function (f, i) {
          n.set(f.n[0], f.n[1], f.n[2]); q.setFromUnitVectors(YAXIS, n);
          p.set(f.p[0], f.p[1], f.p[2]); s.set(f.w, f.len, f.w);
          m4.compose(p, q, s); spm.setMatrixAt(i, m4);
        });
        spm.instanceMatrix.needsUpdate = true;
        grp.add(spm);
      }
      var core = new THREE.Mesh(geo('core'), new THREE.MeshStandardMaterial({ color: d.coreColor, roughness: 0.85 }));
      core.scale.set(d.core.s[0], d.core.s[1], d.core.s[2]);
      grp.add(core);
      var st = d.stalk;
      var stalk = new THREE.Mesh(new THREE.CylinderGeometry(st.r1, st.r0, st.len + 0.06, 8),
        new THREE.MeshStandardMaterial({ color: d.stalkColor, roughness: 0.9 }));
      stalk.position.y = st.y0 + (st.len + 0.06) / 2 - 0.03;
      grp.add(stalk);
      grp.scale.setScalar(this.data.size);
      this.el.setObject3D('mesh', grp);
    },
    remove: function () { this.el.removeObject3D('mesh'); }
  });

  // ------------------------------------------------------------------ komponen: brondolan di piringan
  // Ukuran brondolan sedikit diperbesar (±1,3×) agar terlihat dari jalan panen.
  function brondolanMesh(n, colorKey) {
    var im = new THREE.InstancedMesh(geo('brond'), new THREE.MeshStandardMaterial({ roughness: 0.45 }), Math.max(1, n));
    im.frustumCulled = false;
    im.userData.cols = T.COLORS[colorKey].map(function (h) { return new THREE.Color(h); });
    return im;
  }
  var _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

  AFRAME.registerComponent('brondolan-scatter', {
    schema: {
      count: { default: 0 }, seed: { default: 5 },
      rMin: { default: 0.55 }, rMax: { default: 1.35 },
      arcA: { default: 0 }, arcB: { default: 6.283 },
      colorKey: { default: '3' }
    },
    init: function () {
      var d = this.data;
      this.items = T.scatter(d.count, d.seed, d.rMin, d.rMax, [d.arcA, d.arcB]);
      this.anim = null;
      if (!d.count) { return; }
      var im = brondolanMesh(d.count, d.colorKey);
      var cols = im.userData.cols;
      this.items.forEach(function (it, i) {
        _p.set(it.x, 0.024, it.z); _e.set(it.tilt, it.rot, Math.PI / 2); _q.setFromEuler(_e);
        _s.set(0.024 * it.s, 0.022 * it.s, 0.034 * it.s);
        _m.compose(_p, _q, _s); im.setMatrixAt(i, _m);
        im.setColorAt(i, cols[it.b]);
        it.q = _q.clone(); it.sc = _s.clone();
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) { im.instanceColor.needsUpdate = true; }
      this.im = im;
      this.el.setObject3D('mesh', im);
    },
    kutip: function (targetWorld, onDone) {
      if (!this.im || this.anim) { if (onDone) { onDone(0); } return; }
      this.el.object3D.updateMatrixWorld(true);
      var inv = new THREE.Matrix4().copy(this.el.object3D.matrixWorld).invert();
      this.anim = { t0: performance.now(), tgt: targetWorld.clone().applyMatrix4(inv), done: onDone };
    },
    tick: function () {
      if (!this.anim) { return; }
      var a = this.anim, im = this.im, el = performance.now() - a.t0, all = true;
      for (var i = 0; i < this.items.length; i++) {
        var it = this.items[i];
        var k = Math.max(0, Math.min(1, (el - i * 35) / 1100));
        if (k < 1) { all = false; }
        var e = k * k * (3 - 2 * k);
        _p.set(it.x + (a.tgt.x - it.x) * e, 0.024 + (a.tgt.y - 0.024) * e + Math.sin(e * Math.PI) * 0.9, it.z + (a.tgt.z - it.z) * e);
        _s.copy(it.sc).multiplyScalar(k >= 1 ? 0.0001 : 1);
        _m.compose(_p, it.q, _s); im.setMatrixAt(i, _m);
      }
      im.instanceMatrix.needsUpdate = true;
      if (all) {
        im.visible = false;
        var cb = a.done; this.anim = null;
        if (cb) { cb(this.items.length); }
      }
    }
  });

  // ------------------------------------------------------------------ komponen: tumpukan brondolan di atas karung
  AFRAME.registerComponent('karung-heap', {
    schema: { max: { default: 160 }, radius: { default: 0.3 }, colorKey: { default: '3' }, initial: { default: 0 } },
    init: function () {
      this.im = brondolanMesh(this.data.max, this.data.colorKey);
      this.im.count = 0;
      this.n = 0;
      this.r = T.rng(77);
      this.el.setObject3D('mesh', this.im);
      if (this.data.initial) { this.add(this.data.initial); }
    },
    add: function (k) {
      var im = this.im, cols = im.userData.cols;
      for (var i = 0; i < k && this.n < this.data.max; i++) {
        var j = this.n;
        var a = this.r() * Math.PI * 2;
        var layer = Math.floor(j / 26);
        var rad = Math.sqrt(this.r()) * this.data.radius * Math.max(0.25, 1 - layer * 0.22);
        _p.set(Math.cos(a) * rad, 0.022 + layer * 0.03, Math.sin(a) * rad);
        _e.set(this.r() - 0.5, this.r() * 6.28, Math.PI / 2); _q.setFromEuler(_e);
        var sc = 0.9 + this.r() * 0.25;
        _s.set(0.024 * sc, 0.022 * sc, 0.034 * sc);
        _m.compose(_p, _q, _s); im.setMatrixAt(j, _m);
        im.setColorAt(j, cols[Math.floor(this.r() * 3)]);
        this.n++;
      }
      im.count = this.n;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) { im.instanceColor.needsUpdate = true; }
    }
  });

  // ------------------------------------------------------------------ komponen: label kanvas
  var V1 = new THREE.Vector3(), V2 = new THREE.Vector3();
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }
  function zigzag(g, x0, x1, y, amp, step, color) {
    g.fillStyle = color;
    g.beginPath(); g.moveTo(x0, y);
    for (var x = x0; x < x1; x += step) { g.lineTo(x + step / 2, y - amp); g.lineTo(x + step, y); }
    g.lineTo(x1, y + 2); g.lineTo(x0, y + 2); g.closePath(); g.fill();
  }
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  AFRAME.registerComponent('label-sprite', {
    schema: {
      text: { default: '' }, sub: { default: '' },
      width: { default: 0.6 }, height: { default: 0.3 },
      bg: { default: 'rgba(23,57,43,0.9)' }, fg: { default: '#ffffff' }, accent: { default: '#e7b12f' },
      shape: { default: 'rect' }, billboard: { default: true },
      onTop: { default: false } // penanda selalu tampak walau tertutup pelepah
    },
    init: function () {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 512;
      this.canvas.height = Math.round(512 * this.data.height / this.data.width);
      this.texture = setSRGB(new THREE.CanvasTexture(this.canvas));
      var mat = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthWrite: false, depthTest: !this.data.onTop, side: THREE.DoubleSide, fog: false });
      this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.data.width, this.data.height), mat);
      this.mesh.renderOrder = this.data.onTop ? 15 : 10;
      this.el.setObject3D('mesh', this.mesh);
    },
    update: function () { this.draw(); },
    draw: function () {
      var d = this.data, c = this.canvas, g = c.getContext('2d'), w = c.width, h = c.height;
      g.clearRect(0, 0, w, h);
      if (d.shape === 'circle') {
        var R = Math.min(w, h * 0.78) / 2 - 8;
        g.fillStyle = d.bg; g.beginPath(); g.arc(w / 2, R + 8, R, 0, Math.PI * 2); g.fill();
        g.lineWidth = 10; g.strokeStyle = d.accent; g.stroke();
        g.setLineDash([10, 10]); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,0.85)';
        g.beginPath(); g.arc(w / 2, R + 8, R - 16, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.fillStyle = d.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = 'bold ' + Math.round(R * 1.0) + 'px ' + FONT;
        g.fillText(d.text, w / 2, R + 12);
        if (d.sub) {
          g.font = 'bold ' + Math.round(h * 0.14) + 'px ' + FONT;
          var tw = g.measureText(d.sub).width + 30;
          g.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(g, (w - tw) / 2, h * 0.8, tw, h * 0.19, 14); g.fill();
          g.fillStyle = '#fff'; g.fillText(d.sub, w / 2, h * 0.895);
        }
      } else if (d.shape === 'board') {
        g.fillStyle = '#f7f3e8'; roundRect(g, 6, 6, w - 12, h - 12, 18); g.fill();
        g.lineWidth = 10; g.strokeStyle = '#2a2a2a'; g.stroke();
        g.fillStyle = '#1b1b1b'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = 'bold ' + Math.round(h * 0.34) + 'px ' + FONT; g.fillText(d.text, w / 2, h * 0.3);
        g.beginPath(); g.moveTo(30, h / 2); g.lineTo(w - 30, h / 2); g.lineWidth = 5; g.stroke();
        g.fillText(d.sub, w / 2, h * 0.72);
      } else {
        g.fillStyle = d.bg; roundRect(g, 4, 4, w - 8, h - 8, 22); g.fill();
        zigzag(g, 14, w - 14, h - 10, 12, 24, d.accent);
        g.fillStyle = d.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
        var main = Math.round(h * (d.sub ? 0.3 : 0.42));
        g.font = 'bold ' + main + 'px ' + FONT;
        g.fillText(d.text, w / 2, d.sub ? h * 0.36 : h * 0.47, w - 30);
        if (d.sub) { g.font = Math.round(h * 0.2) + 'px ' + FONT; g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillText(d.sub, w / 2, h * 0.68, w - 30); }
      }
      this.texture.needsUpdate = true;
    },
    tick: function () {
      if (!this.data.billboard) { return; }
      var cam = this.el.sceneEl.camera;
      if (!cam) { return; }
      cam.getWorldPosition(V1);
      this.el.object3D.getWorldPosition(V2);
      this.el.object3D.rotation.y = Math.atan2(V1.x - V2.x, V1.z - V2.z);
    }
  });

  // ------------------------------------------------------------------ tata letak blok
  // Pokok interaktif (urutan sama dengan KONTEN.tandan A–G)
  var PALMS = [
    { x: -3, z: 3 }, { x: 3, z: 1.5 }, { x: -3, z: -4 }, { x: 3, z: -5.5 },
    { x: -3, z: -11 }, { x: 3, z: -12.5 }, { x: -3, z: -18 }
  ];
  var STATIONS = [6.5, -0.5, -7.5, -14.5];
  var TPH = { x: 3.6, z: -20, w: 3, d: 4 };         // TPH 3 × 4 m (TM-1 s.d. TM-5, sesuai materi)
  var ROAD_Z = -24.5;
  var KARUNG = { x: 4.55, z: -19.95 };
  var SLOT_Z = -18.75;
  var PALM_H = 2.35;

  function makeEntity(parent, attrs) {
    var el = document.createElement('a-entity');
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    parent.appendChild(el);
    return el;
  }

  AFRAME.registerComponent('kebun-builder', {
    init: function () {
      var scene = this.el;
      var root = new THREE.Group();
      root.name = 'kebun-statis';
      scene.object3D.add(root);
      this.root = root;
      this.buildGround(root);
      this.buildGrove(root);
      this.buildTPH(root, scene);
      this.buildTruck(root, scene);
      this.buildGuide(root, scene);
      this.buildInteractive(scene);
      this.buildStations(scene);
      this.setupVRMode(scene);
      this.api(scene);
    },

    buildGround: function (root) {
      var ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshLambertMaterial({ map: tex('grass') }));
      ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -10);
      root.add(ground);
      var pathTex = tex('soil').clone(); pathTex.needsUpdate = true; pathTex.repeat.set(1, 18);
      var path = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 36), new THREE.MeshLambertMaterial({ map: pathTex }));
      path.rotation.x = -Math.PI / 2; path.position.set(0, 0.006, -4.5);
      root.add(path);
      var road = new THREE.Mesh(new THREE.PlaneGeometry(90, 4), new THREE.MeshLambertMaterial({ map: tex('road') }));
      road.rotation.x = -Math.PI / 2; road.position.set(0, 0.008, ROAD_Z);
      root.add(road);
      var sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16),
        new THREE.MeshBasicMaterial({ map: tex('sky'), side: THREE.BackSide, fog: false, depthWrite: false }));
      sky.renderOrder = -1;
      root.add(sky);
    },

    palmPositions: function () {
      var list = [];
      var rowsX = [-24, -17, -10, -3, 3, 10, 17, 24];
      rowsX.forEach(function (x, ri) {
        var off = (ri % 2) ? 1.5 : 3;
        for (var z = 24 + off; z > -60; z -= 7) {
          if (Math.abs(z - ROAD_Z) < 3) { continue; }
          if (x > 1 && x < 6 && z < -16.5 && z > -23) { continue; } // area TPH
          list.push({ x: x, z: z });
        }
      });
      return list;
    },

    buildGrove: function (root) {
      var pos = this.palmPositions();
      var r = T.rng(31);
      var trunkGeo = new THREE.CylinderGeometry(0.33, 0.42, 1, 12, 1, true); trunkGeo.translate(0, 0.5, 0);
      var bootGeo = new THREE.CylinderGeometry(0.52, 0.36, 0.8, 12, 1, false); bootGeo.translate(0, -0.25, 0);
      var crownGeo = crownGeometry(20, 3);
      var trunkMat = new THREE.MeshLambertMaterial({ map: tex('trunk') });
      var frondMat = new THREE.MeshLambertMaterial({ map: tex('frond'), alphaTest: 0.45, side: THREE.DoubleSide });
      var n = pos.length;
      var trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
      var boots = new THREE.InstancedMesh(bootGeo, trunkMat, n);
      var crowns = new THREE.InstancedMesh(crownGeo, frondMat, n);
      var pirGeo = new THREE.CircleGeometry(1.5, 28); pirGeo.rotateX(-Math.PI / 2);
      var pir = new THREE.InstancedMesh(pirGeo, new THREE.MeshLambertMaterial({ map: tex('soil') }), n);
      [trunks, boots, crowns, pir].forEach(function (m) { m.frustumCulled = false; root.add(m); });
      var m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
      pos.forEach(function (pt, i) {
        var interactive = PALMS.some(function (P) { return P.x === pt.x && Math.abs(P.z - pt.z) < 0.01; });
        var h = interactive ? PALM_H : rand(r, 2.2, 3.4);
        var yaw = r() * Math.PI * 2, sc = interactive ? 1 : rand(r, 0.9, 1.12);
        e.set(0, yaw, 0); q.setFromEuler(e);
        p.set(pt.x, 0, pt.z); s.set(1, h, 1); m4.compose(p, q, s); trunks.setMatrixAt(i, m4);
        p.set(pt.x, h, pt.z); s.set(1, 1, 1); m4.compose(p, q, s); boots.setMatrixAt(i, m4);
        s.set(sc, sc, sc); m4.compose(p, q, s); crowns.setMatrixAt(i, m4);
        p.set(pt.x, 0.01, pt.z); s.set(1, 1, 1); m4.compose(p, q, s); pir.setMatrixAt(i, m4);
      });
      // Gawangan mati: pelepah hasil tunasan disusun rapi di antara barisan.
      var deadGeo = frondGeometry(3.6, 1.2, 0.0);
      var dead = new THREE.InstancedMesh(deadGeo, new THREE.MeshLambertMaterial({ map: tex('frond'), color: '#b0884f', alphaTest: 0.45, side: THREE.DoubleSide }), 40);
      dead.frustumCulled = false;
      for (var k = 0; k < 40; k++) {
        var gx = (k % 2 ? 6.6 : -6.6) + rand(r, -0.3, 0.3);
        var gz = 20 - Math.floor(k / 2) * 3.4 + rand(r, -0.6, 0.6);
        e.set(0, (r() < 0.5 ? 0 : Math.PI) + rand(r, -0.25, 0.25), 0); q.setFromEuler(e);
        p.set(gx, 0.03 + (k % 3) * 0.02, gz); s.set(1, 1, 1); m4.compose(p, q, s); dead.setMatrixAt(k, m4);
      }
      root.add(dead);
    },

    buildTPH: function (root, scene) {
      var plat = new THREE.Mesh(new THREE.PlaneGeometry(TPH.w, TPH.d), new THREE.MeshLambertMaterial({ map: tex('road') }));
      plat.rotation.x = -Math.PI / 2; plat.position.set(TPH.x, 0.012, TPH.z);
      root.add(plat);
      var pegMat = new THREE.MeshLambertMaterial({ color: '#d9c38f' });
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (c) {
        var peg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6), pegMat);
        peg.position.set(TPH.x + c[0] * TPH.w / 2, 0.175, TPH.z + c[1] * TPH.d / 2);
        root.add(peg);
      });
      var kar = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshLambertMaterial({ map: tex('karung') }));
      kar.rotation.x = -Math.PI / 2; kar.position.set(KARUNG.x, 0.016, KARUNG.z);
      root.add(kar);
      // Papan TPH: nomor blok di atas, nomor TPH di bawah
      var post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), new THREE.MeshLambertMaterial({ color: '#6b5134' }));
      post.position.set(2.2, 0.65, -21.85); root.add(post);
      makeEntity(scene, { position: '2.2 1.45 -21.8', 'label-sprite': 'text: A-1; sub: 07; shape: board; width: 0.55; height: 0.45; billboard: false' });
      makeEntity(scene, { position: '3.6 2.05 -20', 'label-sprite': 'text: TPH; sub: Tempat Pengumpulan Hasil (klik benda di TPH); width: 1.5; height: 0.42' });

      this.heap = makeEntity(scene, { position: KARUNG.x + ' 0.016 ' + KARUNG.z, 'karung-heap': 'max: 160; radius: 0.28' });

      // Benda di TPH untuk aktivitas "Periksa TPH"
      var items = [
        { id: 'T1', pos: '2.6 0.24 -20.05', bunch: 'fraksi: 2; seed: 91' },
        { id: 'T4', pos: '3.15 0.24 -20.05', bunch: 'fraksi: 3; seed: 92; stalkLen: 0.26' },
        { id: 'T2', pos: '3.7 0.22 -20.05', bunch: 'fraksi: jk; seed: 93' },
        { id: 'T3', pos: '3.05 0.0 -21.25', heap: true }
      ];
      var self = this;
      this.tphEls = {};
      items.forEach(function (it) {
        var holder = makeEntity(scene, { position: it.pos });
        if (it.bunch) {
          makeEntity(holder, { 'tbs-bunch': it.bunch });
        } else {
          makeEntity(holder, { 'karung-heap': 'max: 40; radius: 0.22; initial: 34' });
          // serasah bercampur di tumpukan brondolan
          var tw = T.rng(55);
          for (var k = 0; k < 7; k++) {
            makeEntity(holder, { geometry: 'primitive: box; width: 0.18; height: 0.01; depth: 0.025', material: 'color: #6a4b2a', position: (tw() * 0.4 - 0.2).toFixed(2) + ' 0.05 ' + (tw() * 0.4 - 0.2).toFixed(2), rotation: '0 ' + Math.round(tw() * 180) + ' 0' });
          }
        }
        if (it.id === 'T1') { makeEntity(holder, { position: '0 0.42 0.0', 'label-sprite': 'text: 12; width: 0.16; height: 0.1; bg: #f7f3e8; fg: #1b1b1b; accent: #1b1b1b' }); }
        makeEntity(holder, { class: 'clickable', 'data-jenis': 'tph', 'data-id': it.id, geometry: 'primitive: sphere; radius: 0.32', material: 'visible: false', position: '0 0.05 0' });
        var mk = makeEntity(scene, {
          position: it.pos.split(' ').map(function (v, i) { return i === 1 ? '0.85' : v; }).join(' '),
          'label-sprite': 'text: !; shape: circle; width: 0.22; height: 0.28; bg: rgba(160,60,20,0.92); accent: #ffd166; onTop: true',
          animation: 'property: position; dir: alternate; loop: true; dur: 900; easing: easeInOutSine; to: ' + it.pos.split(' ').map(function (v, i) { return i === 1 ? '0.95' : v; }).join(' ')
        });
        self.tphEls[it.id] = { holder: holder, marker: mk };
      });
    },

    buildTruck: function (root, scene) {
      var g = new THREE.Group();
      var cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.5, 1.8), new THREE.MeshLambertMaterial({ color: '#2f6fae' }));
      cab.position.set(1.9, 1.15, 0); g.add(cab);
      var win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 1.5), new THREE.MeshLambertMaterial({ color: '#cfe6f2' }));
      win.position.set(2.72, 1.45, 0); g.add(win);
      var bed = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.25, 1.9), new THREE.MeshLambertMaterial({ color: '#7d5a32' }));
      bed.position.set(-0.5, 0.65, 0); g.add(bed);
      var wallMat = new THREE.MeshLambertMaterial({ color: '#c99a33' });
      [[-0.5, 1.05, 0.93, 3.2, 0.8, 0.06], [-0.5, 1.05, -0.93, 3.2, 0.8, 0.06], [-2.08, 1.05, 0, 0.06, 0.8, 1.9]].forEach(function (b) {
        var wm = new THREE.Mesh(new THREE.BoxGeometry(b[3], b[4], b[5]), wallMat); wm.position.set(b[0], b[1], b[2]); g.add(wm);
      });
      var wheelMat = new THREE.MeshLambertMaterial({ color: '#222' });
      [[1.8, 0.95], [1.8, -0.95], [-1.3, 0.95], [-1.3, -0.95]].forEach(function (w) {
        var wh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 14), wheelMat);
        wh.rotation.x = Math.PI / 2; wh.position.set(w[0], 0.38, w[1]); g.add(wh);
      });
      g.position.set(-3.5, 0, ROAD_Z);
      root.add(g);
      makeEntity(scene, { class: 'clickable', 'data-jenis': 'truk', 'data-id': 'truk', geometry: 'primitive: box; width: 5; height: 2.2; depth: 2.2', material: 'visible: false', position: '-3.5 1.1 ' + ROAD_Z });
      makeEntity(scene, { position: '-3.5 2.6 ' + ROAD_Z, 'label-sprite': 'text: Truk ke PKS; sub: angkut pada hari panen; width: 1.3; height: 0.42' });
    },

    buildGuide: function (root, scene) {
      var g = new THREE.Group();
      var skin = new THREE.MeshLambertMaterial({ color: '#a8754e' });
      var pants = new THREE.MeshLambertMaterial({ color: '#33332f' });
      var shirtMat = new THREE.MeshLambertMaterial({ map: tex('sasirangan') });
      [-0.09, 0.09].forEach(function (x) {
        var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.8, 8), pants);
        leg.position.set(x, 0.4, 0); g.add(leg);
      });
      var boot = new THREE.MeshLambertMaterial({ color: '#1d1d1d' });
      [-0.09, 0.09].forEach(function (x) {
        var b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), boot); b.position.set(x, 0.06, 0.04); g.add(b);
      });
      var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.62, 12), shirtMat);
      torso.position.y = 1.12; g.add(torso);
      var armL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.6, 8), shirtMat);
      armL.position.set(-0.26, 1.1, 0.02); armL.rotation.z = 0.15; g.add(armL);
      var armR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.55, 8), shirtMat);
      armR.position.set(0.27, 1.18, 0.12); armR.rotation.set(-0.7, 0, -0.25); g.add(armR);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skin);
      head.position.y = 1.58; g.add(head);
      // Tanggui: topi lebar khas Banjar [CEK]
      var hat = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.17, 24, 1, true), new THREE.MeshLambertMaterial({ map: tex('tanggui'), side: THREE.DoubleSide }));
      hat.position.y = 1.74; g.add(hat);
      // Dodos (alat potong untuk tanaman muda)
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.5, 6), new THREE.MeshLambertMaterial({ color: '#8a6a3c' }));
      pole.position.set(0.36, 1.25, 0.25); pole.rotation.x = -0.12; g.add(pole);
      var blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.012), new THREE.MeshLambertMaterial({ color: '#9aa1a6' }));
      blade.position.set(0.36, 2.52, 0.1); g.add(blade);
      g.position.set(-1.15, 0, 2.3);
      g.rotation.y = Math.atan2(0 + 1.15, 6.5 - 2.3);
      root.add(g);
      makeEntity(scene, { class: 'clickable', 'data-jenis': 'pemandu', 'data-id': 'pemandu', geometry: 'primitive: box; width: 0.8; height: 1.9; depth: 0.8', material: 'visible: false', position: '-1.15 0.95 2.3' });
      makeEntity(scene, { position: '-1.1 2.15 2.3', 'label-sprite': 'text: Julak Amat; sub: klik untuk menyapa; width: 0.8; height: 0.28' });
    },

    buildInteractive: function (scene) {
      var self = this;
      var tandan = (window.KONTEN && window.KONTEN.tandan) || [];
      this.tandanEls = {};
      tandan.forEach(function (t, i) {
        var P = PALMS[i];
        if (!P) { return; }
        var dir = P.x < 0 ? 1 : -1;           // arah ke jalan panen (x = 0)
        var bx = P.x + dir * 0.55, by = 1.98, bz = P.z + 0.1;
        var bunch = makeEntity(scene, {
          position: bx + ' ' + by + ' ' + bz,
          rotation: '0 0 ' + (dir * 32),
          'tbs-bunch': 'fraksi: ' + t.fraksi + '; seed: ' + t.seed
        });
        // tandan muda hitam di sisi belakang pokok (realisme; tidak interaktif)
        makeEntity(scene, {
          position: (P.x - dir * 0.5) + ' 2.05 ' + (P.z - 0.25),
          rotation: '0 0 ' + (-dir * 30),
          'tbs-bunch': 'fraksi: 00; seed: ' + (t.seed + 500) + '; size: 0.8'
        });
        var collider = makeEntity(scene, {
          class: 'clickable', 'data-jenis': 'tandan', 'data-id': t.id,
          geometry: 'primitive: sphere; radius: 0.42', material: 'visible: false',
          position: bx + ' ' + by + ' ' + bz
        });
        var marker = makeEntity(scene, {
          position: bx + ' 2.5 ' + bz,
          'label-sprite': 'text: ' + t.id + '; sub: periksa; shape: circle; width: 0.36; height: 0.46; onTop: true',
          animation: 'property: scale; dir: alternate; loop: true; dur: 800; easing: easeInOutSine; to: 1.12 1.12 1.12'
        });
        var brond = makeEntity(scene, {
          position: P.x + ' 0.012 ' + P.z,
          'brondolan-scatter': 'count: ' + T.BRONDOLAN_PIRINGAN[t.fraksi] + '; seed: ' + (t.seed + 9) + '; rMin: 0.5; rMax: 1.35; arcA: ' + (dir > 0 ? -1.3 : 1.84) + '; arcB: ' + (dir > 0 ? 1.3 : 4.44) + '; colorKey: ' + (t.fraksi === '00' ? '0' : t.fraksi)
        });
        self.tandanEls[t.id] = { bunch: bunch, collider: collider, marker: marker, brond: brond, idx: i, state: 'baru' };
      });
    },

    buildStations: function (scene) {
      var rig = document.getElementById('rig');
      var cam = document.getElementById('cam');
      STATIONS.forEach(function (z, i) {
        var st = makeEntity(scene, {
          class: 'clickable', 'data-jenis': 'titik', 'data-id': String(i),
          geometry: 'primitive: circle; radius: 0.42', material: 'color: #e7b12f; opacity: 0.55; transparent: true; shader: flat',
          rotation: '-90 0 0', position: '0 0.03 ' + (z - 1.2)
        });
        makeEntity(st, { geometry: 'primitive: ring; radiusInner: 0.3; radiusOuter: 0.38', material: 'color: #ffffff; shader: flat', position: '0 0 0.002' });
        makeEntity(scene, { position: '0 0.55 ' + (z - 1.2), 'label-sprite': 'text: Titik ' + (i + 1) + '; sub: klik untuk pindah; width: 0.7; height: 0.26' });
      });
      scene.addEventListener('click', function (ev) {
        var t = ev.target;
        if (!t || !t.getAttribute) { return; }
        var jenis = t.getAttribute('data-jenis');
        if (!jenis) { return; }
        var id = t.getAttribute('data-id');
        if (jenis === 'titik') {
          var z = STATIONS[+id];
          if (rig) {
            rig.setAttribute('animation__pindah', { property: 'position', to: '0 0 ' + z, dur: 900, easing: 'easeInOutQuad' });
          }
          if (cam) { var cp = cam.object3D.position; cp.x = 0; cp.z = 0; }
          return;
        }
        if (jenis === 'kartu') { return; }
        scene.emit('kebun-pilih', { jenis: jenis, id: id });
      });
    },

    setupVRMode: function (scene) {
      // Perbarui sinar kursor tepat saat tombol ditekan/ketuk, agar klik tetap kena
      // walaupun tidak ada gerakan tetikus sebelumnya.
      var stage = scene.parentNode;
      if (stage && stage.addEventListener) {
        stage.addEventListener('mousedown', function (e) {
          // Hanya event tetikus asli pada kanvas (A-Frame juga memancarkan 'mousedown' tiruan tanpa koordinat).
          if (e.target !== scene.canvas || typeof e.clientX !== 'number') { return; }
          var cur = scene.components.cursor, rc = scene.components.raycaster;
          if (cur && rc && cur.onMouseMove && !scene.is('vr-mode')) {
            cur.onMouseMove(e);
            rc.checkIntersections();
          }
        }, true);
      }
      var gaze = document.getElementById('gaze');
      var rig = document.getElementById('rig');
      var handsMade = false;
      scene.addEventListener('enter-vr', function () {
        if (gaze) {
          gaze.setAttribute('raycaster', 'objects: .clickable; far: 30');
          gaze.setAttribute('cursor', 'fuse: true; fuseTimeout: 1400');
          gaze.setAttribute('visible', true);
        }
        if (!handsMade && rig) {
          handsMade = true;
          ['left', 'right'].forEach(function (hand) {
            makeEntity(rig, { 'laser-controls': 'hand: ' + hand, raycaster: 'objects: .clickable; far: 30' });
          });
        }
      });
      scene.addEventListener('exit-vr', function () {
        if (gaze) {
          gaze.removeAttribute('cursor');
          gaze.removeAttribute('raycaster');
          gaze.setAttribute('visible', false);
        }
        if (window.KebunVR) { window.KebunVR.tutupKartu(); }
      });
    },

    // ---------------------------------------------------------------- API untuk app.js
    api: function (scene) {
      var self = this;
      var nextSlot = 0;
      var MARK = {
        baru: { bg: 'rgba(23,57,43,0.9)', accent: '#e7b12f', sub: 'periksa' },
        benar: { bg: 'rgba(31,122,70,0.95)', accent: '#bff0c8', sub: 'tepat' },
        salah: { bg: 'rgba(170,52,30,0.95)', accent: '#ffd1c2', sub: 'cek lagi' },
        tunda: { bg: 'rgba(60,40,70,0.92)', accent: '#d9b8ff', sub: 'tunggu rotasi' }
      };
      var card = null;

      window.KebunVR = {
        ready: true,
        isVR: function () { return scene.is('vr-mode'); },
        setTandanState: function (id, state, letter) {
          var t = self.tandanEls[id];
          if (!t) { return; }
          t.state = state;
          var m = MARK[state] || MARK.baru;
          t.marker.setAttribute('label-sprite', { bg: m.bg, accent: m.accent, sub: m.sub, text: letter || id });
          if (state !== 'baru') { t.marker.removeAttribute('animation'); t.marker.object3D.scale.set(1, 1, 1); }
        },
        panen: function (id, done) {
          var t = self.tandanEls[id];
          if (!t || t.dipanen) { if (done) { done(false); } return; }
          t.dipanen = true;
          var slot = nextSlot++;
          var to = (2.45 + slot * 0.4).toFixed(2) + ' 0.24 ' + SLOT_Z;
          t.bunch.setAttribute('animation__pos', { property: 'position', to: to, dur: 1800, easing: 'easeInOutCubic' });
          t.bunch.setAttribute('animation__rot', { property: 'rotation', to: '0 0 0', dur: 1800, easing: 'easeInOutCubic' });
          t.marker.setAttribute('visible', false);
          t.collider.classList.remove('clickable');
          t.collider.setAttribute('position', to);
          var bs = t.brond.components['brondolan-scatter'];
          var heap = self.heap.components['karung-heap'];
          if (bs) {
            bs.kutip(new THREE.Vector3(KARUNG.x, 0.1, KARUNG.z), function (n) {
              if (heap && n) { heap.add(n); }
              if (done) { done(true, n); }
            });
          } else if (done) { done(true, 0); }
        },
        setTphState: function (id, ok) {
          var e = self.tphEls[id];
          if (!e) { return; }
          e.marker.removeAttribute('animation');
          e.marker.setAttribute('label-sprite', { text: ok ? '✓' : '✗', bg: ok ? 'rgba(31,122,70,0.95)' : 'rgba(170,52,30,0.95)', accent: '#ffffff' });
        },
        // Kartu 3D untuk mode headset VR (panel HTML tidak terlihat di dalam headset)
        bukaKartu: function (opts) {
          if (!card) { card = buatKartu(scene); }
          card.open(opts);
        },
        tutupKartu: function () { if (card) { card.close(); } },
        stations: STATIONS
      };
      scene.emit('kebun-siap');
    }
  });

  // ------------------------------------------------------------------ kartu 3D (mode VR)
  function wrap(g, text, x, y, maxW, lh) {
    var words = String(text).split(' '), line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = words[i]; y += lh; } else { line = test; }
    }
    if (line) { g.fillText(line, x, y); y += lh; }
    return y;
  }

  function buatKartu(scene) {
    var W = 1100, H = 820;
    var canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
    var texture = setSRGB(new THREE.CanvasTexture(canvas));
    var el = makeEntity(scene, { visible: false });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(W / 1000, H / 1000), new THREE.MeshBasicMaterial({ map: texture, transparent: true, fog: false, depthTest: false }));
    mesh.renderOrder = 20;
    el.setObject3D('mesh', mesh);
    var buttons = [];
    var state = null;

    function clearButtons() { buttons.forEach(function (b) { b.parentNode && b.parentNode.removeChild(b); }); buttons = []; }
    function addButton(x, y, w, h, onClick) {
      var b = makeEntity(el, {
        class: 'clickable', 'data-jenis': 'kartu',
        geometry: 'primitive: plane; width: ' + (w / 1000) + '; height: ' + (h / 1000),
        material: 'visible: false',
        position: ((x + w / 2 - W / 2) / 1000) + ' ' + ((H / 2 - y - h / 2) / 1000) + ' 0.01'
      });
      b.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
      buttons.push(b);
    }
    function btn(g, x, y, w, h, fill, label, sub) {
      g.fillStyle = fill; roundRect(g, x, y, w, h, 16); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 36px ' + FONT; g.fillText(label, x + w / 2, y + h / 2 - (sub ? 12 : 0), w - 24);
      if (sub) { g.font = '22px ' + FONT; g.fillText(sub, x + w / 2, y + h / 2 + 24, w - 10); }
    }
    function draw() {
      var g = canvas.getContext('2d');
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(247,241,227,0.97)'; roundRect(g, 0, 0, W, H, 30); g.fill();
      g.fillStyle = '#17392b'; roundRect(g, 0, 0, W, 96, 30); g.fill(); g.fillRect(0, 60, W, 36);
      zigzag(g, 0, W, 104, 14, 28, '#e7b12f');
      g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.font = 'bold 44px ' + FONT; g.fillText(state.judul, 34, 52);
      g.fillStyle = '#1f2a24'; g.textBaseline = 'alphabetic';
      clearButtons();
      var y = 160;
      if (state.tahap === 'fraksi') {
        g.font = '30px ' + FONT;
        state.obs.forEach(function (o) { y = wrap(g, '• ' + o, 40, y, W - 80, 40); });
        g.font = 'bold 34px ' + FONT; g.fillText('Pilih fraksi (tatap tombol ±1,5 detik):', 40, y + 30);
        var tw = (W - 80 - 6 * 12) / 7;
        state.fraksiList.forEach(function (f, i) {
          var x = 40 + i * (tw + 12), by = H - 200;
          btn(g, x, by, tw, 150, f.warna, f.kode, f.derajat);
          addButton(x, by, tw, 150, function () { state.onFraksi(f.kode); });
        });
      } else if (state.tahap === 'keputusan') {
        g.font = 'bold 34px ' + FONT; g.fillText('Fraksi pilihan Anda: ' + state.pilihFraksi + '. Apa keputusannya?', 40, y);
        state.keputusanList.forEach(function (k, i) {
          var x = 40 + (i % 2) * ((W - 100) / 2 + 20), by = y + 40 + Math.floor(i / 2) * 140;
          var bw = (W - 100) / 2;
          btn(g, x, by, bw, 120, '#2f6b4a', k.label.split(';')[0].split('(')[0].trim());
          addButton(x, by, bw, 120, function () { state.onKeputusan(k.id); });
        });
      } else {
        g.font = 'bold 38px ' + FONT;
        g.fillStyle = state.benar ? '#1f7a46' : '#aa341e';
        g.fillText(state.hasilJudul, 40, y); y += 56;
        g.fillStyle = '#1f2a24'; g.font = '30px ' + FONT;
        state.hasil.forEach(function (t) { y = wrap(g, t, 40, y, W - 80, 40) + 8; });
        var bw2 = 300;
        if (state.bisaPanen) {
          btn(g, 40, H - 170, 460, 130, '#d2481a', 'Panen & angkut ke TPH');
          addButton(40, H - 170, 460, 130, function () { state.onPanen(); });
        }
        btn(g, W - 40 - bw2, H - 170, bw2, 130, '#17392b', 'Tutup');
        addButton(W - 40 - bw2, H - 170, bw2, 130, function () { api.close(); });
      }
      texture.needsUpdate = true;
    }
    var api = {
      open: function (opts) {
        state = opts;
        state.tahap = state.tahap || 'fraksi';
        var cam = scene.camera;
        var cp = new THREE.Vector3(), dir = new THREE.Vector3();
        cam.getWorldPosition(cp); cam.getWorldDirection(dir);
        dir.y = 0; dir.normalize();
        el.object3D.position.set(cp.x + dir.x * 1.25, cp.y - 0.1, cp.z + dir.z * 1.25);
        el.object3D.rotation.set(0, Math.atan2(-dir.x, -dir.z), 0);
        el.setAttribute('visible', true);
        draw();
      },
      update: function (patch) { Object.keys(patch).forEach(function (k) { state[k] = patch[k]; }); draw(); },
      close: function () { el.setAttribute('visible', false); clearButtons(); }
    };
    window.KebunVRCard = api;
    return api;
  }
}());
