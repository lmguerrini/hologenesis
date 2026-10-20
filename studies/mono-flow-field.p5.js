// Demonstration study — externally authored for the studio preview; not natively generated.
//
// mono-flow-field: silky silver filaments in a smooth, slowly evolving flow.
// Velocity = curl of a stream function psi (two octaves of gradient noise with
// analytic derivatives, lattice gradients rotating slowly in time), so the flow
// is divergence-free and laminar. About 0.005 particles per pixel advect through
// it and draw short low-alpha segments; the canvas is never cleared after setup.
// A light veil, applied in rare stronger steps so 8-bit rounding cannot leave a
// grey floor, keeps the blacks deep. Everything is hash-driven (no Math.random).
// Contract: p5-style setup()/draw() with the studio shim globals; Math only.

var TAU = 6.283185307179586;
var GS = 16;
var NP = 0;
var P = null;
var tab1 = null, tab2 = null, ph1 = null, ph2 = null, om1 = null, om2 = null;
var frame = 0;
var fscale = 0;
var nz = [0, 0, 0];
var SUB = 3;
var STEP_LEN = 1.35;
var BUCKET_A = [23, 32, 42, 56, 74, 97, 128, 180];

function hsh(n) {
  var s = Math.sin(n) * 43758.5453123;
  return s - Math.floor(s);
}

function place(i) {
  var g = P.gen[i] + 1;
  P.gen[i] = g;
  P.x[i] = hsh(i * 12.9898 + g * 78.233 + 0.5) * width;
  P.y[i] = hsh(i * 39.3467 + g * 11.135 + 4.1) * height;
  P.age[i] = 0;
  P.life[i] = 90 + hsh(i * 7.7 + g * 3.1 + 9.0) * 160;
}

// Plain zero-filled arrays: the studio's p5 contract admits Array but not typed arrays.
function zeros(n) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = 0; return a; }

function setup() {
  createCanvas(width, height);
  background(0);
  noFill();
  strokeWeight(0.9);
  fscale = 1 / (0.44 * height);
  NP = Math.round(0.0048 * width * height);
  P = { x: zeros(NP), y: zeros(NP), age: zeros(NP),
        life: zeros(NP), gen: zeros(NP) };
  tab1 = zeros(GS * GS * 2); tab2 = zeros(GS * GS * 2);
  ph1 = zeros(GS * GS); ph2 = zeros(GS * GS);
  om1 = zeros(GS * GS); om2 = zeros(GS * GS);
  for (var i = 0; i < GS * GS; i++) {
    ph1[i] = hsh(i * 3.91 + 0.3) * TAU; ph2[i] = hsh(i * 5.17 + 2.9) * TAU;
    om1[i] = (hsh(i * 1.37 + 7.7) - 0.5) * 0.0075;
    om2[i] = (hsh(i * 2.11 + 4.4) - 0.5) * 0.011;
  }
  for (var j = 0; j < NP; j++) {
    P.gen[j] = 0;
    P.x[j] = ((0.5 + (j + 0.5) * 0.7548776662466927) % 1) * width;
    P.y[j] = ((0.5 + (j + 0.5) * 0.5698402909980532) % 1) * height;
    P.age[j] = hsh(j * 3.7 + 1.1) * 160;
    P.life[j] = 90 + hsh(j * 7.7 + 9.0) * 160;
  }
  for (var w = 0; w < 140; w++) step();
}

// The sketch body runs inside a with-scope, so the hot loop keeps every name it
// touches in local variables (global lookups there are an order of magnitude slower).
function step() {
  frame++;
  var floor = Math.floor, sqrt = Math.sqrt, cos = Math.cos, sin = Math.sin, min = Math.min;
  var G = 16, t1 = tab1, t2 = tab2, px = P.x, py = P.y, age = P.age, life = P.life;
  var W = width, H = height, fs = fscale, n = NP, sub = SUB, o = nz;
  for (var c = 0; c < G * G; c++) {
    var a1 = ph1[c] + om1[c] * frame, a2 = ph2[c] + om2[c] * frame;
    t1[2 * c] = cos(a1); t1[2 * c + 1] = sin(a1);
    t2[2 * c] = cos(a2); t2[2 * c + 1] = sin(a2);
  }
  if (frame % 3 === 0) {
    noStroke();
    fill(0, 0, 0, 10);
    rect(0, 0, W, H);
    noFill();
  }

  // gradient noise with analytic derivatives: o = [value, d/dx, d/dy]
  function gn(x, y, tab) {
    var ix = floor(x), iy = floor(y);
    var fx = x - ix, fy = y - iy;
    var ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    var uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
    var dx = 30 * fx * fx * (fx * (fx - 2) + 1);
    var dy = 30 * fy * fy * (fy * (fy - 2) + 1);
    var x0 = ((ix % G) + G) % G, y0 = ((iy % G) + G) % G;
    var x1 = (x0 + 1) % G, y1 = (y0 + 1) % G;
    var ia = (y0 * G + x0) * 2, ib = (y0 * G + x1) * 2;
    var ic = (y1 * G + x0) * 2, id = (y1 * G + x1) * 2;
    var ax = tab[ia], ay = tab[ia + 1], bx = tab[ib], by = tab[ib + 1];
    var cx = tab[ic], cy = tab[ic + 1], ex = tab[id], ey = tab[id + 1];
    var va = ax * fx + ay * fy;
    var vb = bx * (fx - 1) + by * fy;
    var vc = cx * fx + cy * (fy - 1);
    var vd = ex * (fx - 1) + ey * (fy - 1);
    var k = va - vb - vc + vd;
    o[1] = ax + ux * (bx - ax) + uy * (cx - ax) + ux * uy * (ax - bx - cx + ex) + dx * (vb - va + uy * k);
    o[2] = ay + ux * (by - ay) + uy * (cy - ay) + ux * uy * (ay - by - cy + ey) + dy * (vc - va + ux * k);
  }

  var h = STEP_LEN;
  for (var b = 0; b < 8; b++) {
    stroke(230, 230, 230, BUCKET_A[b]);
    for (var i = b; i < n; i += 8) {
      var x = px[i], y = py[i];
      beginShape();
      vertex(x, y);
      for (var s = 0; s < sub; s++) {
        gn(x * fs + 3.7, y * fs + 1.9, t1);
        var gx = o[1], gy = o[2];
        gn(x * fs * 2.17 + 11.3, y * fs * 2.17 + 7.1, t2);
        gx += 1.1935 * o[1];
        gy += 1.1935 * o[2];
        var m = sqrt(gx * gx + gy * gy);
        var sp = (0.55 + 0.45 * min(1, m / 1.1)) / (m + 0.08) * h;
        x += gy * sp; y -= gx * sp;
        vertex(x, y);
      }
      endShape();
      px[i] = x; py[i] = y;
      age[i] += 1;
      if (age[i] > life[i] || x < -20 || x > W + 20 || y < -20 || y > H + 20) place(i);
    }
  }
}

function draw() {
  step();
}
