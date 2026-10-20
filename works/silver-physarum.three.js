// Silver Physarum
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(width, height, false);
renderer.setClearColor(0x000000, 1);
renderer.autoClear = false;

const SIZE = 512;
const TRAIL_W = 1024;
const TRAIL_H = Math.max(1, Math.round(TRAIL_W * height / width));
const trailSize = new THREE.Vector2(TRAIL_W, TRAIL_H);
const gl = renderer.getContext();

function target(w, h, type, filter) {
  return new THREE.WebGLRenderTarget(w, h, {
    type, format: THREE.RGBAFormat,
    minFilter: filter, magFilter: filter,
    wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping,
    depthBuffer: false, stencilBuffer: false
  });
}
const states = [
  target(SIZE, SIZE, THREE.FloatType, THREE.NearestFilter),
  target(SIZE, SIZE, THREE.FloatType, THREE.NearestFilter)
];
const trails = [
  target(TRAIL_W, TRAIL_H, THREE.HalfFloatType, THREE.LinearFilter),
  target(TRAIL_W, TRAIL_H, THREE.HalfFloatType, THREE.LinearFilter)
];

let seed = 0x51a7e25d;
function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}

const initialData = new Float32Array(SIZE * SIZE * 4);
const pointPositions = new Float32Array(SIZE * SIZE * 3);
for (let i = 0; i < SIZE * SIZE; i++) {
  const k = i * 4, p = i * 3;
  initialData[k] = random();
  initialData[k + 1] = random();
  initialData[k + 2] = random() * Math.PI * 2;
  initialData[k + 3] = 1;
  pointPositions[p] = ((i % SIZE) + 0.5) / SIZE;
  pointPositions[p + 1] = (Math.floor(i / SIZE) + 0.5) / SIZE;
}
const initial = new THREE.DataTexture(
  initialData, SIZE, SIZE, THREE.RGBAFormat, THREE.FloatType
);
initial.minFilter = initial.magFilter = THREE.NearestFilter;
initial.generateMipmaps = false;
initial.needsUpdate = true;

const quadVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
quad.frustumCulled = false;
const quadScene = new THREE.Scene();
quadScene.add(quad);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
camera.position.z = 1;

const stepUniforms = {
  uAgents: { value: initial },
  uTrail: { value: trails[0].texture },
  uSize: { value: trailSize },
  uAngle: { value: 0.48 },
  uNoise: { value: new THREE.Vector2() }
};
const stepMaterial = new THREE.ShaderMaterial({
  uniforms: stepUniforms,
  vertexShader: quadVertex,
  fragmentShader: `
varying vec2 vUv;
uniform sampler2D uAgents, uTrail;
uniform vec2 uSize, uNoise;
uniform float uAngle;

// All hash inputs remain small. JavaScript supplies fresh offsets each step.
vec3 hash3(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
float sense(vec2 p, float a) {
  return texture2D(
    uTrail, fract(p + vec2(cos(a), sin(a)) * 9.0 / uSize)
  ).r;
}
void main() {
  vec2 id = floor(gl_FragCoord.xy);
  vec3 noise = hash3(vec3(
    id + uNoise, uNoise.x * 0.73 + uNoise.y * 0.27
  ));
  if (noise.x < 0.002) {
    vec3 born = hash3(vec3(
      id.yx + uNoise.yx + vec2(19.19, 73.23),
      uNoise.y + 0.37
    ));
    gl_FragColor = vec4(born.xy, born.z * 6.283185, 1.0);
    return;
  }
  vec4 agent = texture2D(uAgents, vUv);
  vec2 p = agent.xy;
  float a = agent.z;
  float forward = sense(p, a);
  float left = sense(p, a + uAngle);
  float right = sense(p, a - uAngle);
  if (left > forward && left > right) a += 0.62;
  else if (right > forward && right > left) a -= 0.62;
  else if (forward <= left && forward <= right)
    a += noise.y < 0.5 ? -0.62 : 0.62;
  a += (noise.z - 0.5) * 0.09;
  p = fract(p + vec2(cos(a), sin(a)) / uSize + 1.0);
  gl_FragColor = vec4(p, mod(a + 6.283185, 6.283185), 1.0);
}`,
  depthTest: false, depthWrite: false
});

const blurUniforms = {
  uTrail: { value: trails[0].texture },
  uSize: { value: trailSize }
};
const blurMaterial = new THREE.ShaderMaterial({
  uniforms: blurUniforms,
  vertexShader: quadVertex,
  fragmentShader: `
varying vec2 vUv;
uniform sampler2D uTrail;
uniform vec2 uSize;
void main() {
  float sum = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      float weight = (x == 0 ? 2.0 : 1.0) * (y == 0 ? 2.0 : 1.0);
      sum += weight * texture2D(
        uTrail, fract(vUv + vec2(float(x), float(y)) / uSize)
      ).r;
    }
  }
  gl_FragColor = vec4(sum * 0.90 / 16.0, 0.0, 0.0, 1.0);
}`,
  depthTest: false, depthWrite: false
});

const pointsGeometry = new THREE.BufferGeometry();
pointsGeometry.setAttribute(
  "position", new THREE.BufferAttribute(pointPositions, 3)
);
const depositUniforms = { uAgents: { value: initial } };
const depositMaterial = new THREE.ShaderMaterial({
  uniforms: depositUniforms,
  vertexShader: `
uniform sampler2D uAgents;
void main() {
  vec2 p = texture2D(uAgents, position.xy).xy;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}`,
  fragmentShader: `
void main() {
  gl_FragColor = vec4(0.028, 0.0, 0.0, 1.0);
}`,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthTest: false, depthWrite: false
});
const points = new THREE.Points(pointsGeometry, depositMaterial);
points.frustumCulled = false;
const depositScene = new THREE.Scene();
depositScene.add(points);

const displayUniforms = {
  uTrail: { value: trails[0].texture },
  uSize: { value: trailSize },
  uResolution: { value: new THREE.Vector2(width, height) },
  uAspect: { value: TRAIL_W / TRAIL_H }
};
const displayMaterial = new THREE.ShaderMaterial({
  uniforms: displayUniforms,
  vertexShader: quadVertex,
  fragmentShader: `
varying vec2 vUv;
uniform sampler2D uTrail;
uniform vec2 uSize, uResolution;
uniform float uAspect;
float heightAt(vec2 p) {
  return texture2D(uTrail, fract(p)).r;
}
void main() {
  float screenAspect = uResolution.x / uResolution.y;
  vec2 p = vUv - 0.5;
  if (screenAspect < uAspect) p.x *= screenAspect / uAspect;
  else p.y *= uAspect / screenAspect;
  p += 0.5;
  vec2 e = 1.0 / uSize;
  float h = heightAt(p);
  float l = heightAt(p - vec2(e.x, 0.0));
  float r = heightAt(p + vec2(e.x, 0.0));
  float d = heightAt(p - vec2(0.0, e.y));
  float u = heightAt(p + vec2(0.0, e.y));
  vec3 normal = normalize(vec3((l - r) * 2.2, (d - u) * 2.2, 0.8));
  vec3 light = normalize(vec3(-0.58, 0.66, 0.55));
  float relief = max(dot(normal, light), 0.0);
  float specular = pow(max(
    dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0
  ), 24.0);
  float spread = (
    heightAt(p + vec2(5.0 * e.x, 0.0)) +
    heightAt(p - vec2(5.0 * e.x, 0.0)) +
    heightAt(p + vec2(0.0, 5.0 * e.y)) +
    heightAt(p - vec2(0.0, 5.0 * e.y))
  ) * 0.25;
  float halo = smoothstep(0.10, 0.46, spread);
  float body = smoothstep(0.07, 0.43, h);
  float core = smoothstep(0.34, 1.20, h);
  float silver = 0.003 + 0.52 * body * (0.5 + 0.5 * relief)
               + 0.30 * core + 0.08 * core * specular + 0.09 * halo;
  gl_FragColor = vec4(vec3(min(silver, 0.995)), 1.0);
}`,
  depthTest: false, depthWrite: false
});

renderer.setRenderTarget(trails[0]);
renderer.clear();
renderer.setRenderTarget(trails[1]);
renderer.clear();

let stateSource = initial;
let stateWrite = 0;
let trailRead = 0;
let stepCount = 0;
function advance() {
  const phase = Math.sin((stepCount % 5400) * 2 * Math.PI / 5400);
  stepUniforms.uAgents.value = stateSource;
  stepUniforms.uTrail.value = trails[trailRead].texture;
  stepUniforms.uAngle.value = (27.5 + 7.5 * phase) * Math.PI / 180;
  stepUniforms.uNoise.value.set(random(), random());
  stepCount++;

  quad.material = stepMaterial;
  renderer.setRenderTarget(states[stateWrite]);
  renderer.render(quadScene, camera);

  const nextTrail = 1 - trailRead;
  blurUniforms.uTrail.value = trails[trailRead].texture;
  quad.material = blurMaterial;
  renderer.setRenderTarget(trails[nextTrail]);
  renderer.render(quadScene, camera);

  depositUniforms.uAgents.value = states[stateWrite].texture;
  renderer.render(depositScene, camera);
  stateSource = states[stateWrite].texture;
  stateWrite = 1 - stateWrite;
  trailRead = nextTrail;
}

for (let i = 0; i < 32; i++) advance();
const interval = 1000 / 60;
let previousTime;
let accumulated = 0;
function animate(ms) {
  if (previousTime === undefined) previousTime = ms;
  accumulated = Math.min(
    accumulated + Math.max(0, ms - previousTime), 2 * interval
  );
  previousTime = ms;
  let steps = 0;
  while (accumulated + 0.00001 >= interval && steps < 2) {
    advance();
    accumulated -= interval;
    steps++;
  }
  displayUniforms.uTrail.value = trails[trailRead].texture;
  displayUniforms.uResolution.value.set(
    gl.drawingBufferWidth, gl.drawingBufferHeight
  );
  quad.material = displayMaterial;
  renderer.setRenderTarget(null);
  renderer.setViewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  renderer.render(quadScene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
