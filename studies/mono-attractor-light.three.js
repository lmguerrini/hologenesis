// Demonstration study — externally authored for the studio preview; not natively generated.
//
// mono-attractor-light — the Lorenz attractor as a constellation of luminous silk.
//
// Mathematics: the Lorenz system (sigma = 10, rho = 28, beta = 8/3) integrated
// with RK4 at dt = 0.004; after 2,000 warm-up steps, 600k points of a single
// long trajectory are kept, each carrying a normalized index t in [0,1) and a
// speed |velocity| normalized to [0,1]. The classic butterfly side view (x, z)
// is shown with an orthographic camera fitted to the projected bounding box
// (5% margin on the limiting dimension, uniform scale — no stretching), while
// each instance orbits gently about the vertical axis (+-25 deg) so depth
// reads. One hero butterfly fills the frame; a deterministic constellation of
// smaller, dimmer instances of the same trajectory — each at its own azimuth —
// populates the surrounding dark so the composition fills the frame. Additive
// silver points with speed brightness, a depth fade, and three travelling
// pulses along the trajectory index make the light appear to flow.
//
// Sandbox contract: globals THREE / window / document / requestAnimationFrame /
// cancelAnimationFrame / performance / width / height are provided by the host;
// the script builds its own WebGLRenderer (the host attaches the canvas) and
// its own clock from the first frame timestamp. No imports, no Math.random.

(function () {
  'use strict';

  // ---- deterministic hash --------------------------------------------------
  function hash1(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }

  // ---- Lorenz RK4 trajectory ------------------------------------------------
  var N = 600000;
  var DT = 0.004;
  var WARMUP = 2000;

  var raw = new Float32Array(N * 3);
  var speeds = new Float32Array(N);
  var indices = new Float32Array(N);

  function deriv(st, out) {
    var x = st[0], y = st[1], z = st[2];
    out[0] = 10.0 * (y - x);
    out[1] = x * (28.0 - z) - y;
    out[2] = x * y - (8.0 / 3.0) * z;
  }

  var st = [0.6 + hash1(1) * 0.01, 0.3 + hash1(2) * 0.01, 22.0 + hash1(3) * 0.01];
  var k1 = [0, 0, 0], k2 = [0, 0, 0], k3 = [0, 0, 0], k4 = [0, 0, 0];
  var tmp = [0, 0, 0];

  function rk4(state) {
    deriv(state, k1);
    tmp[0] = state[0] + k1[0] * DT * 0.5; tmp[1] = state[1] + k1[1] * DT * 0.5; tmp[2] = state[2] + k1[2] * DT * 0.5;
    deriv(tmp, k2);
    tmp[0] = state[0] + k2[0] * DT * 0.5; tmp[1] = state[1] + k2[1] * DT * 0.5; tmp[2] = state[2] + k2[2] * DT * 0.5;
    deriv(tmp, k3);
    tmp[0] = state[0] + k3[0] * DT; tmp[1] = state[1] + k3[1] * DT; tmp[2] = state[2] + k3[2] * DT;
    deriv(tmp, k4);
    state[0] += DT * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) / 6;
    state[1] += DT * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) / 6;
    state[2] += DT * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]) / 6;
  }

  for (var w = 0; w < WARMUP; w++) rk4(st);

  var minS = 1e9, maxS = -1e9;
  var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;
  for (var i = 0; i < N; i++) {
    // world axes: Lorenz (x, z, y) -> world (X, Y, Z); Lorenz z is up.
    raw[i * 3] = st[0];
    raw[i * 3 + 1] = st[2];
    raw[i * 3 + 2] = st[1];
    var fx = 10.0 * (st[1] - st[0]);
    var fy = st[0] * (28.0 - st[2]) - st[1];
    var fz = st[0] * st[1] - (8.0 / 3.0) * st[2];
    speeds[i] = Math.sqrt(fx * fx + fy * fy + fz * fz);
    if (speeds[i] < minS) minS = speeds[i];
    if (speeds[i] > maxS) maxS = speeds[i];
    indices[i] = i / N;
    if (st[0] < minX) minX = st[0]; if (st[0] > maxX) maxX = st[0];
    if (st[2] < minY) minY = st[2]; if (st[2] > maxY) maxY = st[2];
    if (st[1] < minZ) minZ = st[1]; if (st[1] > maxZ) maxZ = st[1];
    rk4(st);
  }
  var sSpan = Math.max(maxS - minS, 1e-6);
  for (var i = 0; i < N; i++) speeds[i] = (speeds[i] - minS) / sSpan;

  // centre the cloud on its bounding-box centre (Lorenz z is all-positive)
  var cx = (minX + maxX) * 0.5, cy = (minY + maxY) * 0.5, cz = (minZ + maxZ) * 0.5;
  for (var i = 0; i < N; i++) {
    raw[i * 3] -= cx; raw[i * 3 + 1] -= cy; raw[i * 3 + 2] -= cz;
  }

  // ---- orbit sweep bounds + orthographic fit ---------------------------------
  // Instances rotate about world Y by ANGLE_AMP * sin(time * 0.05); the fit
  // must hold for every azimuth in the +-25 deg sweep, so bounds are taken
  // over the full range on a subsample. Uniform scale only — never stretched.
  var ANGLE_AMP = 0.42;
  var halfW = 0, halfH = 0, halfD = 0;
  for (var a = 0; a <= 24; a++) {
    var ang = -ANGLE_AMP + (2 * ANGLE_AMP) * a / 24;
    var ca = Math.cos(ang), sa = Math.sin(ang);
    for (var j = 0; j < N; j += 89) {
      var px = raw[j * 3], py = raw[j * 3 + 1], pz = raw[j * 3 + 2];
      var rx = px * ca - pz * sa;
      var rz = px * sa + pz * ca;
      var ax = Math.abs(rx), ay = Math.abs(py), az = Math.abs(rz);
      if (ax > halfW) halfW = ax;
      if (ay > halfH) halfH = ay;
      if (az > halfD) halfD = az;
    }
  }
  var EXTENT = Math.max(halfW, halfH, halfD);

  // ---- renderer / camera ------------------------------------------------------
  var renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 1);

  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  var pxW = 1, pxH = 1;   // world units per pixel (set in fit)

  function fit() {
    var W = Math.max(2, Math.round(width)), H = Math.max(2, Math.round(height));
    renderer.setSize(W, H, false);
    // fill the frame on the limiting dimension, 5% margin, aspect preserved
    var s = Math.min((0.95 * W) / (2 * halfW), (0.95 * H) / (2 * halfH));
    camera.left = -W / (2 * s); camera.right = W / (2 * s);
    camera.top = H / (2 * s); camera.bottom = -H / (2 * s);
    camera.updateProjectionMatrix();
    pxW = W / s; pxH = H / s;   // full-frame extents in world units
    return { W: W, H: H };
  }
  var view = fit();

  // ---- shared point shader ------------------------------------------------
  // attributes: aSpeed, aIndex as computed; aCentre = pivot of this instance
  // (rotation happens about it); aAzimuth = base azimuth; aGainM = gain
  // multiplier; aPhase = pulse phase offset.
  var uniforms = {
    uTime:   { value: 0 },
    uSweep:  { value: 0 },
    uPx:     { value: Math.max(1.0, view.H / 720) },
    uExtent: { value: EXTENT }
  };

  function makeMaterial(gain) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: uniforms.uTime, uSweep: uniforms.uSweep,
        uPx: uniforms.uPx, uExtent: uniforms.uExtent,
        uGain: { value: gain }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      vertexShader: [
        'attribute float aSpeed;',
        'attribute float aIndex;',
        'attribute vec3 aCentre;',
        'attribute float aAzimuth;',
        'attribute float aGainM;',
        'attribute float aPhase;',
        'uniform float uTime;',
        'uniform float uSweep;',
        'uniform float uPx;',
        'uniform float uExtent;',
        'uniform float uGain;',
        'varying float vLight;',
        'void main() {',
        '  float ang = aAzimuth + uSweep;',
        '  float ca = cos(ang), sa = sin(ang);',
        '  vec3 lp = position - aCentre;',
        '  vec3 p = aCentre + vec3(lp.x * ca - lp.z * sa, lp.y, lp.x * sa + lp.z * ca);',
        '  gl_Position = projectionMatrix * vec4(p, 1.0);',
        '',
        '  float depth = clamp(1.0 - 0.42 * (0.5 + 0.5 * p.z / uExtent), 0.58, 1.0);',
        '',
        '  float pulse = 0.0;',
        '  for (int q = 0; q < 3; q++) {',
        '    float ph = fract(aIndex - uTime * 0.02 - aPhase - float(q) * 0.3337);',
        '    pulse += exp(-pow(ph * 40.0, 2.0));',
        '  }',
        '  pulse = min(pulse, 1.0);',
        '',
        '  vLight = uGain * aGainM * ((0.10 + 0.45 * aSpeed) * depth',
        '            + 1.5 * pulse * (0.25 + 0.75 * aSpeed));',
        '  gl_PointSize = uPx * (1.5 + 0.7 * pulse);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'precision mediump float;',
        'varying float vLight;',
        'void main() {',
        '  vec2 q = gl_PointCoord - 0.5;',
        '  float fall = smoothstep(0.5, 0.08, length(q));',
        '  vec3 silver = vec3(0.975, 0.988, 1.0);',
        '  gl_FragColor = vec4(silver * vLight * fall, 1.0);',
        '}'
      ].join('\n')
    });
  }

  function fillConstant(arr, v) { for (var i = 0; i < arr.length; i++) arr[i] = v; return arr; }

  // ---- hero draw: the full trajectory, fitted to the frame -----------------
  var heroGeo = new THREE.BufferGeometry();
  heroGeo.setAttribute('position', new THREE.BufferAttribute(raw, 3));
  heroGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  heroGeo.setAttribute('aIndex', new THREE.BufferAttribute(indices, 1));
  heroGeo.setAttribute('aCentre', new THREE.BufferAttribute(fillConstant(new Float32Array(N * 3), 0), 3));
  heroGeo.setAttribute('aAzimuth', new THREE.BufferAttribute(fillConstant(new Float32Array(N), 0), 1));
  heroGeo.setAttribute('aGainM', new THREE.BufferAttribute(fillConstant(new Float32Array(N), 1), 1));
  heroGeo.setAttribute('aPhase', new THREE.BufferAttribute(fillConstant(new Float32Array(N), 0), 1));
  var hero = new THREE.Points(heroGeo, makeMaterial(1.0));
  hero.frustumCulled = false;
  scene.add(hero);

  // ---- shoal: the same trajectory tiled across the frame --------------------
  // A 4x3 grid of mid-scale instances (hashed jitter, scale, azimuth, gain)
  // overlaps edge to edge so the wing discs tile the whole frame, with a
  // brighter hero at the centre. Everything is the one integrated trajectory.
  var STRIDE = 4, NS = Math.floor(N / STRIDE);
  var heroScale = Math.min((0.95 * pxW) / (2 * halfW), (0.95 * pxH) / (2 * halfH));
  var sats = [];
  for (var gc = 0; gc < 4; gc++) {
    for (var gr = 0; gr < 3; gr++) {
      var id = gr * 4 + gc + 1;
      sats.push({
        x: ((gc + 0.5) / 4 - 0.5) * pxW + (hash1(id * 3.1 + 2.7) - 0.5) * pxW * 0.10,
        y: ((gr + 0.5) / 3 - 0.5) * pxH + (hash1(id * 6.7 + 1.3) - 0.5) * pxH * 0.10,
        f: 0.58 + 0.24 * hash1(id * 9.2 + 5.1),
        az: hash1(id * 7.7 + 0.9) * Math.PI * 2,
        gain: 0.85 + 0.50 * hash1(id * 5.3 + 8.8),
        phase: hash1(id * 11.9 + 4.2)
      });
    }
  }
  // deep field: a few oversized, very dim instances that give the voids a
  // whisper of structure without competing with the hero
  var DEEP = [[-0.30, 0.24, 1.55], [0.33, -0.18, 1.30], [0.05, 0.30, 1.75]];
  for (var d3 = 0; d3 < DEEP.length; d3++) {
    sats.push({
      x: DEEP[d3][0] * pxW, y: DEEP[d3][1] * pxH,
      f: DEEP[d3][2],
      az: hash1(d3 * 13.3 + 6.1) * Math.PI * 2,
      gain: 0.09 + 0.05 * hash1(d3 * 4.4 + 2.2),
      phase: hash1(d3 * 8.8 + 9.9)
    });
  }
  // two counterweight mids: bottom-right corner and mid-left edge
  sats.push({ x: 0.40 * pxW, y: 0.30 * pxH, f: 0.62, az: hash1(71.7) * 6.2832,
              gain: 1.0, phase: hash1(73.3) });
  sats.push({ x: -0.44 * pxW, y: 0.08 * pxH, f: 0.55, az: hash1(81.1) * 6.2832,
              gain: 0.9, phase: hash1(83.9) });
  var satPos = new Float32Array(sats.length * NS * 3);
  var satSpeed = new Float32Array(sats.length * NS);
  var satIndex = new Float32Array(sats.length * NS);
  var satCentre = new Float32Array(sats.length * NS * 3);
  var satAz = new Float32Array(sats.length * NS);
  var satGainM = new Float32Array(sats.length * NS);
  var satPhase = new Float32Array(sats.length * NS);
  for (var s3 = 0; s3 < sats.length; s3++) {
    var S = sats[s3];
    var cwx = S.x, cwy = S.y;   // S.x/S.y are already world units
    var sc = heroScale * S.f;
    for (var q = 0; q < NS; q++) {
      var src = q * STRIDE, dst = s3 * NS + q;
      satPos[dst * 3] = raw[src * 3] * sc + cwx;
      satPos[dst * 3 + 1] = raw[src * 3 + 1] * sc + cwy;
      satPos[dst * 3 + 2] = raw[src * 3 + 2] * sc;
      satSpeed[dst] = speeds[src];
      satIndex[dst] = indices[src];
      satCentre[dst * 3] = cwx; satCentre[dst * 3 + 1] = cwy; satCentre[dst * 3 + 2] = 0;
      satAz[dst] = S.az;
      satGainM[dst] = S.gain;
      satPhase[dst] = S.phase;
    }
  }
  var satGeo = new THREE.BufferGeometry();
  satGeo.setAttribute('position', new THREE.BufferAttribute(satPos, 3));
  satGeo.setAttribute('aSpeed', new THREE.BufferAttribute(satSpeed, 1));
  satGeo.setAttribute('aIndex', new THREE.BufferAttribute(satIndex, 1));
  satGeo.setAttribute('aCentre', new THREE.BufferAttribute(satCentre, 3));
  satGeo.setAttribute('aAzimuth', new THREE.BufferAttribute(satAz, 1));
  satGeo.setAttribute('aGainM', new THREE.BufferAttribute(satGainM, 1));
  satGeo.setAttribute('aPhase', new THREE.BufferAttribute(satPhase, 1));
  var cloud = new THREE.Points(satGeo, makeMaterial(1.0));
  cloud.frustumCulled = false;
  scene.add(cloud);

  // ---- animation ----------------------------------------------------------------
  var t0 = null;

  function animate(timeMs) {
    if (t0 === null) t0 = timeMs;
    var t = (timeMs - t0) / 1000;
    uniforms.uTime.value = t;
    uniforms.uSweep.value = ANGLE_AMP * Math.sin(t * 0.05);

    renderer.render(scene, camera);

    window.__frames = (window.__frames || 0) + 1;
    window.__t = t;
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // re-fit on resize (the host may re-enter with new dimensions)
  window.addEventListener('resize', function () {
    view = fit();
    uniforms.uPx.value = Math.max(1.0, view.H / 720);
  });
})();
