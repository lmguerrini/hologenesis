// Demonstration study — externally authored for the studio preview; not natively generated.
//
// mono-reaction-diffusion: Gray-Scott morphogenesis on the GPU (Three.js).
// du/dt = Du*lap(u) - u v^2 + F(1-u),  dv/dt = Dv*lap(v) + u v^2 - (F+k) v,
// with the isotropic 9-point Laplacian (edges 2/3, corners 1/6, centre -10/3),
// so growth fronts are round. State is stored as (1-u, v) in half floats.
// ~100 soft round seeds (R2 low-discrepancy sequence + hash jitter) cover the
// whole frame; F and k drift slowly across it (spots -> labyrinth -> coral).
// Progress follows the wall clock with a per-frame catch-up cap.
// Contract: globals THREE, width, height, requestAnimationFrame; no Math.random.
(function () {
  'use strict';

  var SIM_SCALE = 0.4;
  var SIM_W = Math.max(8, Math.round(width * SIM_SCALE));
  var SIM_H = Math.max(8, Math.round(height * SIM_SCALE));
  var TAU = 6.283185307179586;
  var SEEDS = 100;
  var STEPS_PER_SEC = 55;
  var MAX_STEPS_PER_FRAME = 36;

  var renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);

  var rtOpts = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false
  };
  var readRT = new THREE.WebGLRenderTarget(SIM_W, SIM_H, rtOpts);
  var writeRT = new THREE.WebGLRenderTarget(SIM_W, SIM_H, rtOpts);

  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var quad = new THREE.PlaneGeometry(2, 2);
  var VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';

  function makePass(fs, uniforms) {
    var material = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: fs, uniforms: uniforms,
      depthTest: false, depthWrite: false
    });
    var scene = new THREE.Scene();
    var mesh = new THREE.Mesh(quad, material);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { scene: scene, material: material };
  }

  // seeds: soft Gaussian blobs of (a = 1-u, v) in sim-pixel units
  var initFS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform vec2 u_sim;',
    'float h1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }',
    'void main() {',
    '  vec2 p = vUv * u_sim;',
    '  float a = 0.0, v = 0.0;',
    '  for (int i = 0; i < ' + SEEDS + '; i++) {',
    '    float fi = float(i) + 1.0;',
    '    vec2 c = fract(vec2(0.5 + fi * 0.7548776662, 0.5 + fi * 0.5698402910));',
    '    c += (vec2(h1(fi + 3.0), h1(fi + 17.0)) - 0.5) * 0.045;',
    '    c = clamp(c, 0.015, 0.985) * u_sim;',
    '    float r = 6.0 + 3.0 * h1(fi + 31.0);',
    '    vec2 d = p - c;',
    '    float g = 1.0 - smoothstep(0.55 * r, 1.25 * r, length(d));',
    '    a = max(a, 0.5 * g);',
    '    v = max(v, 0.25 * g);',
    '  }',
    '  gl_FragColor = vec4(a, v, 0.0, 1.0);',
    '}'
  ].join('\n');

  var simFS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D u_tex;',
    'uniform vec2 u_texel;',
    'uniform float u_breath;',
    'void main() {',
    '  vec2 e = vec2(u_texel.x, 0.0), f = vec2(0.0, u_texel.y);',
    '  vec2 c = texture2D(u_tex, vUv).xy;',
    '  vec2 ed = texture2D(u_tex, vUv - e).xy + texture2D(u_tex, vUv + e).xy',
    '          + texture2D(u_tex, vUv - f).xy + texture2D(u_tex, vUv + f).xy;',
    '  vec2 co = texture2D(u_tex, vUv - e - f).xy + texture2D(u_tex, vUv + e - f).xy',
    '          + texture2D(u_tex, vUv - e + f).xy + texture2D(u_tex, vUv + e + f).xy;',
    '  vec2 lap = ed * 0.6666667 + co * 0.1666667 - c * 3.3333333;',
    '  float m = clamp(vUv.x * 0.85 + vUv.y * 0.15, 0.0, 1.0);',
    '  float F = mix(0.026, 0.0555, m) + 0.0012 * u_breath;',
    '  float k = 0.0633 - 0.0007 * smoothstep(0.0, 0.5, m) + 0.0012 * smoothstep(0.5, 1.0, m);',
    '  float uvv = (1.0 - c.x) * c.y * c.y;',
    '  float a = c.x + 0.3 * lap.x + uvv - F * c.x;',
    '  float v = c.y + 0.15 * lap.y + uvv - (F + k) * c.y;',
    '  gl_FragColor = vec4(a, v, 0.0, 1.0);',
    '}'
  ].join('\n');

  var dispFS = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D u_tex;',
    'uniform vec2 u_texel;',
    'uniform float u_aspect;',
    'float V(vec2 o) { return texture2D(u_tex, vUv + o * u_texel).y; }',
    'void main() {',
    '  float v = V(vec2(0.0));',
    '  vec2 g = vec2(V(vec2(1.0, 0.0)) - V(vec2(-1.0, 0.0)), V(vec2(0.0, 1.0)) - V(vec2(0.0, -1.0)));',
    '  float gm = length(g);',
    '  float blur = (V(vec2(2.0, 0.0)) + V(vec2(-2.0, 0.0)) + V(vec2(0.0, 2.0)) + V(vec2(0.0, -2.0))) * 0.25;',
    '  float body = smoothstep(0.08, 0.38, v);',
    '  float tone = 0.08 + 0.34 * body + 0.34 * body * body * body;',
    '  vec3 n = normalize(vec3(-g * 9.0, 1.0));',
    '  float diff = clamp(dot(n, normalize(vec3(-0.48, 0.62, 0.62))), 0.0, 1.0);',
    '  tone *= 0.74 + 0.42 * diff;',
    '  float edge = 1.0 - exp(-gm * 20.0);',
    '  tone += 0.50 * edge * (0.35 + 0.65 * body);',
    '  tone += 0.10 * smoothstep(0.02, 0.2, blur) * (1.0 - body);',
    '  vec2 q = vUv - 0.5;',
    '  q.x *= u_aspect;',
    '  tone *= 1.0 - 0.45 * smoothstep(0.40, 0.95, length(q));',
    '  tone += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;',
    '  gl_FragColor = vec4(vec3(clamp(tone, 0.0, 1.0)), 1.0);',
    '}'
  ].join('\n');

  var initPass = makePass(initFS, { u_sim: { value: new THREE.Vector2(SIM_W, SIM_H) } });
  var simPass = makePass(simFS, {
    u_tex: { value: null },
    u_texel: { value: new THREE.Vector2(1 / SIM_W, 1 / SIM_H) },
    u_breath: { value: 0 }
  });
  var dispPass = makePass(dispFS, {
    u_tex: { value: null },
    u_texel: { value: new THREE.Vector2(1 / SIM_W, 1 / SIM_H) },
    u_aspect: { value: width / height }
  });

  renderer.setRenderTarget(readRT);
  renderer.render(initPass.scene, camera);
  renderer.setRenderTarget(writeRT);
  renderer.render(initPass.scene, camera);

  var done = 0;
  var t0 = null;

  function animate(timeMs) {
    if (t0 === null) t0 = timeMs;
    var want = Math.floor((timeMs - t0) * 0.001 * STEPS_PER_SEC) - done;
    if (want > MAX_STEPS_PER_FRAME) want = MAX_STEPS_PER_FRAME;
    if (want < 1) want = 1;
    for (var i = 0; i < want; i++) {
      simPass.material.uniforms.u_breath.value = Math.sin(TAU * (done % 14000) / 14000);
      simPass.material.uniforms.u_tex.value = readRT.texture;
      renderer.setRenderTarget(writeRT);
      renderer.render(simPass.scene, camera);
      var tmp = readRT; readRT = writeRT; writeRT = tmp;
      done++;
    }
    dispPass.material.uniforms.u_tex.value = readRT.texture;
    renderer.setRenderTarget(null);
    renderer.render(dispPass.scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
