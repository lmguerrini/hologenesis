// Demonstration study — externally authored for the studio preview; not natively generated.
//
// mono-chladni-cymatics: Chladni-plate standing waves on a rectangular plate
// (a = aspect, b = 1) filling the frame, with
//   u = cos(n pi x/a) cos(m pi y/b) - cos(m pi x/a) cos(n pi y/b).
// "Sand" gathers where |u|/|grad u| (distance to a nodal line) is small. Mode
// pairs (n,m) cross-fade on a 60 s cycle (wrapped with mod, so any u_time is valid).
// Contract: u_resolution (px), u_time (seconds since page load); no textures.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;

const float PI = 3.1415927;

vec2 mode(float i) {
  if (i < 0.5) return vec2(13.0, 5.0);
  if (i < 1.5) return vec2(18.0, 8.0);
  if (i < 2.5) return vec2(15.0, 7.0);
  if (i < 3.5) return vec2(16.0, 10.0);
  if (i < 4.5) return vec2(19.0, 9.0);
  return vec2(14.0, 6.0);
}

// vec3(u, du/dX, du/dY) of one mode in plate coordinates X, Y in [0,1]
vec3 plate(vec2 nm, vec2 q) {
  vec2 a = nm * PI;
  vec4 c = cos(vec4(a.x * q.x, a.y * q.y, a.y * q.x, a.x * q.y));
  vec4 s = sin(vec4(a.x * q.x, a.y * q.y, a.y * q.x, a.x * q.y));
  float u = c.x * c.y - c.z * c.w;
  return vec3(u, -a.x * s.x * c.y + a.y * s.z * c.w, -a.y * c.x * s.y + a.x * c.z * s.w);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void mainImage(out vec4 fc, in vec2 p) {
  vec2 R = u_resolution;
  vec2 q = p / R;
  float k = mod(u_time, 60.0) / 10.0;                 // six 10 s slots
  float i = floor(k);
  float f = smoothstep(0.55, 1.0, k - i);              // cross-fade in the last 45 %
  float j = mod(i + 1.0, 6.0);
  vec3 w = mix(plate(mode(i), q), plate(mode(j), q), f);
  float g = length(vec2(w.y / R.x, w.z / R.y)) + 1e-5;  // |grad u| per pixel
  float d = abs(w.x) / g;                               // distance to nodal line, px

  float h1 = hash(floor(p));
  float h2 = hash(floor(p) + 17.3);
  float tw = 0.5 + 0.5 * sin(6.2831853 * (h2 + 2.0 * mod(u_time, 5.0) / 5.0));
  float rho = exp(-d * d / 12.0);                       // sand density about the line
  float grain = step(h1, rho) * (0.45 + 0.55 * tw);
  float core = 1.0 - smoothstep(0.4, 1.8, d);
  float halo = exp(-d / 14.0) * 0.28 + exp(-d / 60.0) * 0.12;

  float shimmer = 0.5 + 0.5 * cos(6.2831853 * (abs(w.x) * 0.9 - mod(u_time, 8.0) / 8.0));
  float plateTone = 0.075 + 0.05 * smoothstep(0.0, 1.4, abs(w.x)) * (0.6 + 0.4 * shimmer);
  float lum = plateTone + halo * 0.9 + grain * 0.55 + core * 0.45;
  lum += (h1 - 0.5) * 0.012;
  fc = vec4(vec3(clamp(lum, 0.0, 1.0)), 1.0);
}
