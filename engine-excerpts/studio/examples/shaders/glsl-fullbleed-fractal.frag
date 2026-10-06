#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

float tri(float x) {
  return abs(2.0 * fract(0.5 * x) - 1.0);
}

vec3 ramp(float t) {
  vec3 col = mix(vec3(0.085, 0.055, 0.20), vec3(0.30, 0.09, 0.55), smoothstep(0.02, 0.34, t));
  col = mix(col, vec3(0.88, 0.17, 0.40), smoothstep(0.32, 0.56, t));
  col = mix(col, vec3(1.0, 0.56, 0.12), smoothstep(0.54, 0.80, t));
  return mix(col, vec3(1.0, 0.78, 0.34), smoothstep(0.80, 1.02, t));
}

void main() {
  float span = max(u_resolution.x, u_resolution.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / span;
  float t = u_time;
  float zoom = 0.0065 * exp(-0.42 * (0.5 - 0.5 * cos(t * 0.06)));
  float a = 0.3 * sin(t * 0.035);
  p = mat2(cos(a), -sin(a), sin(a), cos(a)) * p;
  vec2 c = vec2(-0.7436439, 0.1318259) + vec2(0.0004 * sin(t * 0.05), 0.0003 * cos(t * 0.04)) + p * zoom;

  vec2 z = vec2(0.0);
  vec2 dz = vec2(0.0);
  float trapC = 1e9;
  float trapL = 1e9;
  // Full-history stripe average (broad swirls) plus decayed averages that emphasise the late
  // orbit, whose stripes stay fine out into the outer field where plain averages wash out.
  float sum1 = 0.0;
  float count = 0.0;
  float e1 = 0.5;
  float e2 = 0.5;
  float n = 0.0;
  float escaped = 0.0;
  float r2 = 0.0;
  for (int i = 0; i < 300; i++) {
    dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x) + vec2(1.0, 0.0);
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    r2 = dot(z, z);
    trapC = min(trapC, abs(length(z - vec2(0.25, 0.0)) - 0.32));
    trapL = min(trapL, abs(z.y));
    if (r2 > 1.0e6) {
      escaped = 1.0;
      n = float(i) + 1.0 - log2(log2(r2) * 0.5);
      break;
    }
    float ang = atan(z.y, z.x);
    sum1 += 0.5 + 0.5 * sin(5.0 * ang + t * 0.11);
    e1 = mix(e1, 0.5 + 0.5 * sin(15.0 * ang + 2.4 + t * 0.07), 0.05);
    e2 = mix(e2, 0.5 + 0.5 * sin(30.0 * ang - 1.7), 0.032);
    count += 1.0;
  }

  float st = sum1 / max(count, 1.0);
  float de = escaped > 0.5 ? 0.25 * sqrt(r2 / max(dot(dz, dz), 1e-20)) * log(r2) : 0.0;
  float px = zoom / span;
  float edge = clamp(1.0 - de / (3.0 * px), 0.0, 1.0);
  float glow = edge * edge * (3.0 - 2.0 * edge);
  float ln = log2(1.0 + n);
  float rings = 0.5 + 0.5 * sin(42.0 * ln + 2.0 * st);

  // Exterior: curated ramp over depth and the stripe fields, teal band in the stripe troughs.
  float k = tri(0.5 * st + 0.42 * e1 + 0.24 * ln + 0.2 * e2 + 0.2 * sin(t * 0.021));
  vec3 col = ramp(k);
  float band = smoothstep(0.42, 0.28, e1) * smoothstep(0.06, 0.22, e1);
  vec3 teal = vec3(0.08, 0.55, 0.62) * (0.5 + 0.7 * e2);
  col = mix(col, teal, band * 0.7);
  // Brightness follows the fine stripes: deep indigo shadows between luminous stripe crests.
  vec3 shade = vec3(0.09, 0.055, 0.21);
  col = mix(shade, col, 0.16 + 0.48 * smoothstep(0.15, 0.9, e1) + 0.22 * rings);
  col += vec3(1.0, 0.82, 0.55) * (0.13 * pow(e1, 3.0));

  // Smooth warm edge glow takes over from the iteration colour within ~3 px of the set.
  vec3 gold = vec3(1.0, 0.80, 0.45);
  col = mix(col, gold * (0.68 + 0.46 * st), min(glow * 1.3, 1.0));
  col += gold * pow(glow, 6.0) * 0.55;
  col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, 1.3);

  // Interior: deep jewel tones with orbit-trap veins, never flat black.
  float veinC = exp(-trapC * 9.0);
  float veinL = exp(-trapL * 15.0);
  vec3 jewel = mix(vec3(0.17, 0.09, 0.38), vec3(0.05, 0.34, 0.42), clamp(veinL * 1.3, 0.0, 1.0));
  vec3 inside = jewel * (0.62 + 0.38 * veinC);
  inside += vec3(1.0, 0.82, 0.55) * pow(veinC, 5.0) * 0.4 + vec3(0.9, 0.36, 0.5) * pow(veinL, 4.0) * 0.3;

  col = mix(inside, col, escaped);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
