// Silver Meander
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height, false);
renderer.setClearColor(0x000000, 1);

const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 0.2));
const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
camera.position.z = 10;

const gl = renderer.getContext();
let screenW = 0, screenH = 0, pixelSize = 1;
let limitX = 2.4, limitY = 0.9;

function fitCamera() {
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  if (w === screenW && h === screenH) return;
  screenW = w;
  screenH = h;
  const scale = Math.max(w / 5, h / 2);
  const viewH = h / scale;
  pixelSize = 1 / scale;
  limitX = viewH * w / h * 0.5 - 0.07;
  limitY = viewH * 0.5 - 0.07;
  camera.aspect = w / h;
  camera.fov = 2 * Math.atan(viewH / 20) * 180 / Math.PI;
  camera.updateProjectionMatrix();
  renderer.setViewport(0, 0, w, h);
}
fitCamera();

const MAX = 12000, CAP = 14000;
const REST = 0.012, RADIUS = REST * 6, R2 = RADIUS * RADIUS;
const GRID_W = Math.ceil(5 / RADIUS) + 4;
const GRID_H = Math.ceil(2 / RADIUS) + 4;
const heads = new Int32Array(GRID_W * GRID_H);
const next = new Int32Array(MAX);
const movedX = new Float32Array(MAX);
const movedY = new Float32Array(MAX);

let seed = 0x6d2b79f5;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

let generation = 0;
function makeRing() {
  const x = new Float32Array(MAX), y = new Float32Array(MAX);
  const n = 32;
  const cx = generation ? (random() - 0.5) * limitX * 0.55 : 0;
  const cy = generation ? (random() - 0.5) * limitY * 0.55 : 0;
  generation++;
  for (let i = 0; i < n; i++) {
    const a = i * Math.PI * 2 / n;
    x[i] = cx + Math.cos(a) * 0.065;
    y[i] = cy + Math.sin(a) * 0.065;
  }
  return { x, y, n };
}

let active = makeRing(), old = null, age = 0, fade = 0;
function cellX(x) {
  return Math.max(0, Math.min(GRID_W - 1, Math.floor((x + 2.5) / RADIUS) + 2));
}
function cellY(y) {
  return Math.max(0, Math.min(GRID_H - 1, Math.floor((y + 1) / RADIUS) + 2));
}

function step() {
  const { x, y, n } = active;
  heads.fill(-1);
  for (let i = 0; i < n; i++) {
    const cell = cellX(x[i]) + cellY(y[i]) * GRID_W;
    next[i] = heads[cell];
    heads[cell] = i;
  }

  for (let i = 0; i < n; i++) {
    const before = i ? i - 1 : n - 1;
    const after = i + 1 === n ? 0 : i + 1;
    const px = x[i], py = y[i];
    const tx = x[after] - x[before], ty = y[after] - y[before];
    const invT = 1 / Math.max(1e-8, Math.hypot(tx, ty));
    const growth = 0.00085 + (random() - 0.5) * 0.00022;
    let fx = (0.5 * (x[before] + x[after]) - px) * 0.14 + ty * invT * growth;
    let fy = (0.5 * (y[before] + y[after]) - py) * 0.14 - tx * invT * growth;
    let repelX = 0, repelY = 0, hits = 0;
    const gx = cellX(px), gy = cellY(py);

    for (let yy = Math.max(0, gy - 1); yy <= Math.min(GRID_H - 1, gy + 1); yy++) {
      for (let xx = Math.max(0, gx - 1); xx <= Math.min(GRID_W - 1, gx + 1); xx++) {
        for (let j = heads[xx + yy * GRID_W]; j !== -1; j = next[j]) {
          const chainDistance = Math.abs(j - i);
          if (chainDistance <= 3 || chainDistance >= n - 3) continue;
          const dx = px - x[j], dy = py - y[j];
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 1e-12) {
            const d = Math.sqrt(d2);
            const strength = (RADIUS - d) / (RADIUS * d);
            repelX += dx * strength;
            repelY += dy * strength;
            hits++;
          }
        }
      }
    }

    if (hits) {
      fx += 0.011 * repelX / hits;
      fy += 0.011 * repelY / hits;
    }
    if (px > limitX) fx += (limitX - px) * 0.08;
    if (px < -limitX) fx += (-limitX - px) * 0.08;
    if (py > limitY) fy += (limitY - py) * 0.08;
    if (py < -limitY) fy += (-limitY - py) * 0.08;
    const force = Math.hypot(fx, fy);
    const clamp = force > 0.0032 ? 0.0032 / force : 1;
    movedX[i] = px + fx * clamp;
    movedY[i] = py + fy * clamp;
  }

  let count = 0;
  for (let i = 0; i < n; i++) {
    const j = i + 1 === n ? 0 : i + 1;
    const ax = movedX[i], ay = movedY[i];
    x[count] = ax;
    y[count++] = ay;
    const dx = movedX[j] - ax, dy = movedY[j] - ay;
    if (dx * dx + dy * dy > 0.016 * 0.016 &&
        count < MAX - (n - i - 1)) {
      x[count] = ax + dx * 0.5;
      y[count++] = ay + dy * 0.5;
    }
  }

  active.n = count;
  age += 1 / 60;
  if (!old && ((count >= 11800 && age >= 60) || age >= 86)) {
    old = { x: x.slice(0, count), y: y.slice(0, count), n: count };
    active = makeRing();
    age = 0;
    fade = 0;
  }
  if (old) {
    fade += 1 / 60;
    if (fade >= 4) {
      old = null;
      fade = 0;
    }
  }
}

// Start with the grown labyrinth visible on the first rendered frame.
for (let i = 0; i < 900; i++) step();

const SIDES = 8, PER = (SIDES - 1) * 6;
const positions = new Float32Array(CAP * SIDES * 3);
const colors = new Float32Array(CAP * SIDES * 4);
const indices = new Uint32Array(CAP * PER);
const geometry = new THREE.BufferGeometry();
const positionAttribute = new THREE.BufferAttribute(positions, 3);
const colorAttribute = new THREE.BufferAttribute(colors, 4);
const indexAttribute = new THREE.BufferAttribute(indices, 1);
positionAttribute.setUsage(THREE.DynamicDrawUsage);
colorAttribute.setUsage(THREE.DynamicDrawUsage);
indexAttribute.setUsage(THREE.DynamicDrawUsage);
geometry.setAttribute("position", positionAttribute);
geometry.setAttribute("color", colorAttribute);
geometry.setIndex(indexAttribute);

function link(i, j) {
  for (let band = 0; band < SIDES - 1; band++) {
    const a = i * SIDES + band, b = j * SIDES + band;
    const o = i * PER + band * 6;
    indices[o] = a;
    indices[o + 1] = b;
    indices[o + 2] = a + 1;
    indices[o + 3] = a + 1;
    indices[o + 4] = b;
    indices[o + 5] = b + 1;
  }
}
for (let i = 0; i < CAP; i++) link(i, (i + 1) % CAP);

const ribbon = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
  vertexColors: true,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
  side: THREE.DoubleSide
}));
ribbon.frustumCulled = false;
scene.add(ribbon);

// A 2.5-pixel bright core, narrow shoulders, and a restrained outer halo.
const offsets = [-6.8, -3.9, -1.55, -1.25, 1.25, 1.55, 3.9, 6.8];
const alpha = [0, 0.05, 0.25, 0.98, 0.98, 0.25, 0.05, 0];

function writeCurve(curve, start, opacity, time) {
  const { x, y, n } = curve;
  for (let i = 0; i < n; i++) {
    const p = i ? i - 1 : n - 1;
    const q = i + 1 === n ? 0 : i + 1;
    const dx = x[q] - x[p], dy = y[q] - y[p];
    const inv = 1 / Math.max(1e-8, Math.hypot(dx, dy));
    const normalX = -dy * inv, normalY = dx * inv;
    const bend = Math.hypot(
      x[p] + x[q] - 2 * x[i],
      y[p] + y[q] - 2 * y[i]
    ) / REST;
    const silver = Math.min(1, 0.86 + 0.13 * Math.min(1, bend * 2.3) +
      0.007 * Math.sin(time * 0.0007 + i * 0.021));
    const vertex = start + i;

    for (let k = 0; k < SIDES; k++) {
      const po = vertex * SIDES * 3 + k * 3;
      const co = vertex * SIDES * 4 + k * 4;
      const offset = offsets[k] * pixelSize;
      positions[po] = x[i] + normalX * offset;
      positions[po + 1] = y[i] + normalY * offset;
      positions[po + 2] = 0;
      colors[co] = silver;
      colors[co + 1] = silver;
      colors[co + 2] = silver;
      colors[co + 3] = alpha[k] * opacity;
    }
  }
}

let closureA = -1, closureB = -1;
function closeCurves(a, b) {
  if (a === closureA && b === closureB) return;
  indexAttribute.clearUpdateRanges();
  for (const end of [closureA, closureB]) {
    if (end < 0) continue;
    link(end, (end + 1) % CAP);
    indexAttribute.addUpdateRange(end * PER, PER);
  }
  if (a >= 0) {
    link(a, 0);
    indexAttribute.addUpdateRange(a * PER, PER);
  }
  link(b, a + 1);
  indexAttribute.addUpdateRange(b * PER, PER);
  indexAttribute.needsUpdate = true;
  closureA = a;
  closureB = b;
}

let lastTime, accumulator = 0;
function frame(time) {
  fitCamera();
  if (lastTime === undefined) lastTime = time;
  accumulator += Math.max(0, time - lastTime) / 1000;
  lastTime = time;
  for (let i = 0; i < 2 && accumulator >= 1 / 60; i++) {
    step();
    accumulator -= 1 / 60;
  }

  const oldCount = old ? old.n : 0;
  if (old) writeCurve(old, 0, Math.max(0, 1 - fade / 4), time);
  writeCurve(active, oldCount, old ? Math.min(1, fade / 2) : 1, time);

  const count = oldCount + active.n;
  closeCurves(old ? oldCount - 1 : -1, count - 1);
  positionAttribute.clearUpdateRanges();
  colorAttribute.clearUpdateRanges();
  positionAttribute.addUpdateRange(0, count * SIDES * 3);
  colorAttribute.addUpdateRange(0, count * SIDES * 4);
  positionAttribute.needsUpdate = true;
  colorAttribute.needsUpdate = true;
  geometry.setDrawRange(0, count * PER);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
