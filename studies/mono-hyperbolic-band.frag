// Demonstration study — externally authored for the studio preview; not natively generated.
//
// mono-hyperbolic-band: the regular {7,3} tiling of the hyperbolic plane in
// the BAND model (frame height = band width, tiles shrink toward top/bottom).
// A pixel (x,y) becomes the hyperboloid point (sinh x, sin y, cosh x)/cos y and
// is folded by the (2,3,7) reflection group into its fundamental triangle.
// The drift is a hyperbolic translation along the band axis wrapped modulo
// PER = 2r+2R+e, a symmetry of the tiling, so the loop is exact at any time.
// Contract: u_resolution (px), u_time (seconds since page load); no textures.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;

const float PI = 3.1415927;
const float CA = 0.90096887, SA = 0.43388374;   // cos, sin of pi/7
const float CR = 1.15238244, SR = 0.57269999;   // cosh, sinh of centre-edge distance
const float CV = 1.19888019, SV = 0.66129699;   // cosh, sinh of centre-vertex distance
const float PER = 2.89814945;                   // translation period of the tiling

float asnh(float a) { return log(a + sqrt(a * a + 1.0)); }

// exact box-filter coverage of a line of half-width w at distance d, pixel size pw
float cov(float d, float w, float pw) {
  return max(min(d + 0.5 * pw, w) - max(d - 0.5 * pw, -w), 0.0) / pw;
}

void mainImage(out vec4 fc, in vec2 p) {
  float H = u_resolution.y;
  float v = p.y - 0.5 * H;
  float dl = (0.5 * H - abs(v)) * PI / H;           // pi/2 - |y|
  float cy = sin(dl);                               // cos y, exact at the rims
  float sy = cos(dl) * sign(v);                     // sin y
  float x = (p.x - 0.5 * u_resolution.x) * PI / H + mod(u_time * 0.14, PER);
  x = mod(x + 0.5 * PER, PER) - 0.5 * PER;           // exact symmetry: keeps folds shallow
  float ex = exp(x);
  vec3 P = vec3(ex - 1.0 / ex, 2.0 * sy, ex + 1.0 / ex) / (2.0 * cy);
  float pw = PI / (H * cy);                         // hyperbolic size of a pixel
  float dm = log((1.0 + abs(sy)) / cy);             // distance from the axis

  float par = 0.0;
  for (int i = 0; i < 44; i++) {
    float m = 0.0;
    if (P.y < 0.0) { P.y = -P.y; m = 1.0; }
    float a = SA * P.x - CA * P.y;
    if (a < 0.0) { P.x -= 2.0 * a * SA; P.y += 2.0 * a * CA; m = 1.0; }
    a = SR * P.z - CR * P.x;
    if (a < 0.0) { P.x += 2.0 * a * CR; P.z += 2.0 * a * SR; m = 1.0; }
    if (m < 0.5) break;
    par += m;
  }
  par = mod(par, 2.0);

  float dE = asnh(SR * P.z - CR * P.x);            // to the tile edge
  float dS = asnh(SA * P.x - CA * P.y);            // to the vertex spoke
  float dM = asnh(P.y);                            // to the edge-midpoint spoke
  float dC = asnh(length(P.xy));                   // to the tile centre
  float gV = P.z * CV - SV * (P.x * CA + P.y * SA) - 1.0;   // ~ vertex distance^2 / 2

  float ph = mod(u_time, 12.0) / 12.0;
  float wave = 0.5 + 0.5 * cos(6.2831853 * (dm * 0.30 - ph));
  float fd = 1.0 - smoothstep(0.10, 0.38, pw);     // detail fades where tiles reach pixel size
  float we = max(0.0075 * 586.0 / H, 0.55 * pw);
  float edge = cov(dE, we, pw);
  float spk = cov(dS, 0.55 * we, pw) * 0.42 + cov(dM, 0.5 * we, pw) * 0.22;
  float glow = exp(-dE * 9.0) * 0.34 + exp(-gV * 40.0) * 0.18 + exp(-dC * dC * 9.0) * 0.22;
  float ring = cov(abs(dC - 0.29), 0.45 * we, pw) * 0.20;
  float tone = 0.022 + 0.03 * par + glow * (0.55 + 0.7 * wave);
  float lum = tone + (spk + ring) * 0.55 + edge * (0.66 + 0.34 * wave);
  float avg = 0.20 + 0.14 * wave;
  lum = mix(avg, lum, fd);
  lum *= 0.80 + 0.20 * exp(-dm * dm * 0.06) + 0.30 * smoothstep(2.5, 6.0, dm);
  lum += 0.05 * exp(-dm * dm * 1.5) * fd;
  lum += (fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  fc = vec4(vec3(clamp(lum, 0.0, 1.0)), 1.0);
}
