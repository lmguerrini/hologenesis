// Demonstration study — externally authored for the studio preview; not natively generated.
//
// mono-recursive-cathedral: the inside of an endless Menger lattice (cells of
// edge 2, cross-shaped carvings refined to 5 levels), flown through along one
// corridor. Distance-estimated sphere tracing with detail that fades out where
// it would drop below a pixel, headlamp + top key light, ambient occlusion,
// rim glow and fog to black. The lattice has period 2, so the camera's z wraps
// modulo 2 and the glide is seamless at any u_time.
// Contract: u_resolution (px), u_time (seconds since page load); no textures.
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 u_resolution;
uniform float u_time;

float map(vec3 p, float t) {
  vec3 q = mod(p + 1.0, 2.0) - 1.0;
  float d = max(abs(q.x), max(abs(q.y), abs(q.z))) - 1.0;
  float s = 1.0, fp = t * 0.0011 + 0.0002;
  for (int m = 0; m < 5; m++) {
    vec3 a = mod(q * s, 2.0) - 1.0;
    s *= 3.0;
    vec3 r = abs(1.0 - 3.0 * abs(a));
    d = max(d, (min(max(r.x, r.y), min(max(r.y, r.z), max(r.z, r.x))) - 1.0) / s);
    if (2.0 / s < fp) break;
  }
  return d;
}

vec3 normal(vec3 p, float e, float t) {
  vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * map(p + k.xyy * e, t) + k.yyx * map(p + k.yyx * e, t) +
                   k.yxy * map(p + k.yxy * e, t) + k.xxx * map(p + k.xxx * e, t));
}

void mainImage(out vec4 fc, in vec2 fragCoord) {
  float T = u_time;
  vec3 ro = vec3(0.06 * sin(T * 0.11), 0.05 * sin(T * 0.083 + 1.7), mod(T * 0.30, 2.0));
  float yw = 0.16 * sin(T * 0.071 + 0.6), pt = 0.10 * sin(T * 0.053 + 2.0);
  vec3 fw = normalize(vec3(sin(yw), sin(pt), cos(yw)));
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  vec2 uv = (fragCoord - 0.5 * u_resolution) / u_resolution.y;
  vec3 rd = normalize(fw * 1.05 + rt * uv.x + up * uv.y);
  float pix = 1.0 / (u_resolution.y * 1.05);

  float t = 0.0, glow = 0.0, h = 1.0;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    h = map(ro + rd * t, t);
    glow += 0.0016 / (0.003 + h * h * 8.0 + 0.1 * t * pix);
    if (h < 0.5 * pix * t) { hit = true; break; }
    t += h * 0.92;
    if (t > 30.0) break;
  }

  float lum = 0.0;
  if (hit) {
    vec3 p = ro + rd * t;
    float e = max(0.6 * pix * t, 0.0006);
    vec3 n = normal(p, e, t);
    float ao = 0.0, sc = 1.0;
    for (int i = 1; i < 6; i++) {
      float dd = 0.02 * float(i * i);
      ao += sc * (dd - map(p + n * dd, t));
      sc *= 0.62;
    }
    ao = clamp(1.0 - 1.6 * ao, 0.0, 1.0);
    vec3 lp = ro + up * 0.10 - rt * 0.05;
    vec3 l = lp - p;
    float dl = length(l);
    vec3 lv = l / dl;
    float cone = 0.12 + 0.88 * pow(max(dot(-lv, fw), 0.0), 3.0);
    float wave = 0.80 + 0.20 * sin(6.2831853 * (p.z - mod(T, 10.0) * 0.1));
    float att = cone * wave / (1.0 + 0.8 * dl * dl);
    float sh = 1.0, st = 0.03 + 0.02 * t;
    for (int i = 0; i < 20; i++) {
      float hh = map(p + n * 0.002 + lv * st, t + st);
      sh = min(sh, 7.0 * hh / st);
      st += clamp(hh, 0.012, 0.25);
      if (st > dl || sh < 0.02) break;
    }
    sh = clamp(sh, 0.0, 1.0);
    sh = sh * sh * (3.0 - 2.0 * sh);
    float dif = max(dot(n, lv), 0.0) * att * (0.15 + 0.85 * sh);
    float spc = pow(max(dot(n, normalize(lv - rd)), 0.0), 40.0) * att * sh;
    float key = 0.5 + 0.5 * n.y;
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
    lum = ao * ao * (0.02 + 0.07 * key) * (0.4 + 0.6 * wave) + 4.0 * dif * ao * ao + 0.9 * spc * ao + 0.22 * rim * ao * exp(-0.4 * t);
    lum *= exp(-t * 0.10);
  }
  lum += 0.60 * glow / 96.0 * exp(-0.05 * t);
  lum = pow(lum / (1.0 + 0.5 * lum), 1.3) * 1.9;
  lum += (fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  fc = vec4(vec3(clamp(lum, 0.0, 1.0)), 1.0);
}
