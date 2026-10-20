// Silver Morphogenesis — periodic square-grid refinement
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(width, height, false);
renderer.autoClear = false;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 1;
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
scene.add(quad);

const grid = 640;
const size = new THREE.Vector2(grid, grid);
const viewport = new THREE.Vector2(width, height);

function target() {
  return new THREE.WebGLRenderTarget(grid, grid, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
    depthBuffer: false,
    stencilBuffer: false
  });
}
const targets = [target(), target()];

let rngState = 0x6f23a9c1;
function random() {
  rngState += 0x6d2b79f5;
  let x = rngState;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}

const vertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const initial = new THREE.ShaderMaterial({
  uniforms: {
    uShift: { value: new THREE.Vector2(random(), random()) }
  },
  vertexShader: vertex,
  fragmentShader: `
uniform vec2 uShift;
varying vec2 vUv;
void main() {
  float seed = 0.0;
  for (int i = 0; i < 112; i++) {
    vec2 p = fract(uShift + (float(i) + 0.5) *
                   vec2(0.754877666, 0.569840291));
    vec2 delta = abs(vUv - p);
    delta = min(delta, 1.0 - delta);
    seed = max(seed, 1.0 - smoothstep(0.005, 0.012, length(delta)));
  }
  gl_FragColor = vec4(1.0 - 0.82 * seed, 0.82 * seed, 0.0, 1.0);
}`
});

const simulation = new THREE.ShaderMaterial({
  uniforms: {
    uState: { value: targets[0].texture },
    uSize: { value: size },
    uTime: { value: 0 },
    uSeed: { value: random() * 1000 }
  },
  vertexShader: vertex,
  fragmentShader: `
uniform sampler2D uState;
uniform vec2 uSize;
uniform float uTime, uSeed;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p + uSeed, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 px = 1.0 / uSize;
  vec2 c = texture2D(uState, vUv).rg;
  vec2 axis =
    texture2D(uState, vUv + vec2(px.x, 0.0)).rg +
    texture2D(uState, vUv - vec2(px.x, 0.0)).rg +
    texture2D(uState, vUv + vec2(0.0, px.y)).rg +
    texture2D(uState, vUv - vec2(0.0, px.y)).rg;
  vec2 diag =
    texture2D(uState, vUv + px).rg +
    texture2D(uState, vUv - px).rg +
    texture2D(uState, vUv + vec2(px.x, -px.y)).rg +
    texture2D(uState, vUv + vec2(-px.x, px.y)).rg;
  vec2 lap = 0.2 * axis + 0.05 * diag - c;

  float phase = 6.2831853 * uTime / 88.0;
  float x = 6.2831853 * vUv.x;
  float y = 6.2831853 * vUv.y;
  float land = 0.5 + 0.5 * cos(x + 0.36 * sin(y + phase));
  float worms = smoothstep(0.18, 0.51, land);
  float folds = smoothstep(0.52, 0.84, land);
  float feed = mix(mix(0.030, 0.037, worms), 0.026, folds);
  float kill = mix(mix(0.062, 0.060, worms), 0.055, folds);
  feed += 0.0008 * sin(y + 0.8 * phase);
  kill += 0.0012 * sin(x - y + phase);

  float reaction = c.r * c.g * c.g;
  float a = clamp(c.r + lap.r - reaction + feed * (1.0 - c.r), 0.0, 1.0);
  float b = clamp(c.g + 0.5 * lap.g + reaction -
                  (feed + kill) * c.g, 0.0, 1.0);

  if (fract(uTime / 6.5) < 0.055) {
    vec2 tiles = vec2(12.0);
    vec2 cell = floor(vUv * tiles);
    float epoch = floor(uTime / 6.5);
    vec2 jitter = vec2(
      hash(cell + vec2(epoch * 1.71, epoch * 0.73)),
      hash(cell + vec2(epoch * 0.43 + 19.0, epoch * 1.37))
    );
    vec2 p = (cell + 0.25 + 0.5 * jitter) / tiles;
    vec2 delta = abs(vUv - p);
    delta = min(delta, 1.0 - delta);
    float d = length(delta);
    if (d < 0.011) {
      float quiet = 1.0 - smoothstep(
        0.006, 0.03, texture2D(uState, p).g
      );
      float disk = quiet * (1.0 - smoothstep(0.003, 0.011, d));
      a = min(a, 1.0 - 0.8 * disk);
      b = max(b, 0.72 * disk);
    }
  }
  gl_FragColor = vec4(a, b, 0.0, 1.0);
}`
});

const display = new THREE.ShaderMaterial({
  uniforms: {
    uState: { value: targets[0].texture },
    uSize: { value: size },
    uViewport: { value: viewport }
  },
  vertexShader: vertex,
  fragmentShader: `
uniform sampler2D uState;
uniform vec2 uSize, uViewport;
varying vec2 vUv;

void main() {
  vec2 span = uViewport / max(uViewport.x, uViewport.y);
  vec2 uv = (vUv - 0.5) * span + 0.5;
  vec2 px = 1.0 / uSize;

  float b = texture2D(uState, uv).g;
  float left = texture2D(uState, uv - vec2(px.x, 0.0)).g;
  float right = texture2D(uState, uv + vec2(px.x, 0.0)).g;
  float down = texture2D(uState, uv - vec2(0.0, px.y)).g;
  float up = texture2D(uState, uv + vec2(0.0, px.y)).g;
  vec2 slope = vec2(right - left, up - down);

  vec3 normal = normalize(vec3(-12.0 * slope, 1.0));
  vec3 light = normalize(vec3(-0.58, 0.68, 0.53));
  vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
  float body = smoothstep(0.035, 0.31, b);
  float ridge = body * smoothstep(0.014, 0.066, length(slope));
  float diffuse = max(dot(normal, light), 0.0);
  float specular = pow(max(dot(normal, halfway), 0.0), 96.0);

  float silver = body * (0.035 + 0.35 * diffuse)
    + 0.20 * body * body * body
    + 0.18 * ridge * diffuse
    + 2.1 * specular * ridge * body;

  vec2 reach = 4.0 * px;
  float nearby = max(
    max(texture2D(uState, uv + vec2(reach.x, 0.0)).g,
        texture2D(uState, uv - vec2(reach.x, 0.0)).g),
    max(texture2D(uState, uv + vec2(0.0, reach.y)).g,
        texture2D(uState, uv - vec2(0.0, reach.y)).g)
  );
  float halo = smoothstep(0.12, 0.30, nearby)
    * (1.0 - smoothstep(0.03, 0.20, b));
  float dither = (fract(sin(dot(gl_FragCoord.xy,
    vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  float luminance = clamp(0.003 + silver + 0.045 * halo + dither,
                          0.0, 1.0);
  gl_FragColor = vec4(vec3(luminance), 1.0);
}`
});

quad.material = initial;
renderer.setRenderTarget(targets[0]);
renderer.render(scene, camera);

let read = 0;
let write = 1;
function frame(milliseconds) {
  simulation.uniforms.uTime.value = milliseconds * 0.001;
  quad.material = simulation;
  for (let step = 0; step < 8; step++) {
    simulation.uniforms.uState.value = targets[read].texture;
    renderer.setRenderTarget(targets[write]);
    renderer.render(scene, camera);
    const previous = read;
    read = write;
    write = previous;
  }

  viewport.set(width, height);
  display.uniforms.uState.value = targets[read].texture;
  quad.material = display;
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
