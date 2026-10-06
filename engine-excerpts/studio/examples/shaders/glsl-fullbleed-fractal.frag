#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

float lum(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 palette(float x) {
  vec3 c = mix(vec3(0.24, 0.15, 0.90), vec3(0.90, 0.15, 0.72), smoothstep(0.00, 0.32, x));
  c = mix(c, vec3(1.00, 0.58, 0.10), smoothstep(0.30, 0.56, x));
  c = mix(c, vec3(0.14, 0.82, 0.55), smoothstep(0.56, 0.80, x));
  return mix(c, vec3(0.24, 0.15, 0.90), smoothstep(0.80, 1.00, x));
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
  float ln = log2(1.0 + max(n, 1.0));
  float de = 0.25 * sqrt(r2 / max(dot(dz, dz), 1e-20)) * log(max(r2, 2.0)) * escaped;
  float px = zoom / span;

  // Hue follows the large-scale potential depth, so the palette cycles several times across any
  // view; the broad stripe fields tilt each band so all four colour families get real estate.
  float hueT = fract(0.85 * ln + 0.55 * (st - 0.5) + 0.30 * (e2 - 0.5) + 0.06 * sin(t * 0.021));
  vec3 base = palette(hueT);

  // Contrasty combed stripes, crests keep the full jewel colour, troughs sink to a saturated
  // shadow of the same hue (never black), which supplies the deep inter-stripe shadow. A slow
  // diagonal wash breathes through the comb so no field reads as a flat fill.
  float wash = 0.5 + 0.5 * sin(46.0 * p.x + 34.0 * p.y + 3.0 * st + t * 0.05);
  float washHi = 0.5 + 0.5 * sin(74.0 * p.x + 55.0 * p.y + 3.0 * st + t * 0.03);
  float comb = 0.62 * e1 + 0.38 * e2;
  float rings = 0.5 + 0.5 * sin(38.0 * ln + 4.0 * st);
  float ringsHi = 0.5 + 0.5 * sin(52.0 * ln + 9.0 * st);
  float s1 = clamp(comb * 0.68 + rings * 0.26 + 0.12 * (wash - 0.5) + 0.06 * (ringsHi - 0.5), 0.0, 1.0);
  float bright = smoothstep(0.24, 0.88, s1);
  vec3 shade = base * ((0.085 + 0.026 * e2 + 0.03 * rings + 0.024 * ringsHi + 0.055 * washHi) / max(lum(base), 1e-3));
  vec3 col = mix(shade, base, bright);
  col += base * pow(bright, 5.0) * (0.16 + 0.12 * ringsHi);
  col *= 0.88 + 0.22 * washHi;

  // Luminous boundary, crest-gated coloured fringe, then a beaded white-gold core that only
  // reaches full brilliance in the last fraction of a pixel, so no wide pale fill forms.
  float edge = clamp(1.0 - de / (1.5 * px), 0.0, 1.0);
  float fringe = edge * edge * (3.0 - 2.0 * edge);
  col *= 1.0 + 0.55 * fringe * fringe * bright;
  float bead = 0.75 + 0.25 * smoothstep(0.30, 0.80, s1);
  col = mix(col, vec3(0.98, 0.90, 0.68) * (0.95 + 0.05 * sin(46.0 * st)), bead * pow(edge, 3.0));

  // Interior, jewel tones whose brightness spans a wide band across the comb, orbit-trap veins,
  // trap bands from the final orbit angle and a slow sheen, so basins never read as flat fills.
  float veinC = exp(-trapC * 9.0);
  float veinL = exp(-trapL * 15.0);
  float aIn = atan(z.y, z.x);
  float bandT = 0.5 + 0.5 * sin(44.0 * trapC + 8.0 * st + 3.0 * aIn);
  float sheen = 0.5 + 0.5 * sin(84.0 * p.x + 61.0 * p.y + 5.0 * st + t * 0.05);
  vec3 jewel = mix(vec3(0.44, 0.17, 0.70), vec3(0.78, 0.15, 0.55), smoothstep(0.10, 0.60, st));
  jewel = mix(jewel, vec3(0.10, 0.50, 0.62), smoothstep(0.55, 0.95, e1));
  float f = clamp(0.45 * smoothstep(0.25, 0.80, comb) + 0.55 * veinC + 0.30 * veinL + 0.12 * bandT, 0.0, 1.0);
  vec3 inside = jewel * (0.36 + 0.85 * f + 0.16 * (sheen - 0.5));
  inside += vec3(1.0, 0.86, 0.60) * pow(veinC, 5.0) * 0.35 + vec3(0.92, 0.42, 0.62) * pow(veinL, 4.0) * 0.30;

  col = mix(inside, col, escaped);
  col = mix(vec3(lum(col)), col, 1.22);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
