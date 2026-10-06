precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

// Monotonic luminous ramp: deep navy field → indigo → violet → rose amber → pale gold at the set's edge.
vec3 luminousRamp(float k) {
  vec3 navy = vec3(0.016, 0.024, 0.075);
  vec3 indigo = vec3(0.085, 0.12, 0.40);
  vec3 violet = vec3(0.50, 0.17, 0.66);
  vec3 amber = vec3(0.96, 0.46, 0.30);
  vec3 gold = vec3(1.0, 0.88, 0.62);
  vec3 color = mix(navy, indigo, smoothstep(0.0, 0.35, k));
  color = mix(color, violet, smoothstep(0.30, 0.62, k));
  color = mix(color, amber, smoothstep(0.58, 0.84, k));
  return mix(color, gold, smoothstep(0.82, 1.0, k));
}

void main() {
  // Normalize by the shorter axis so circles remain circular at every size.
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time * 0.11;
  float zoom = 1.0 + 0.16 * sin(t * 0.63);
  float angle = 0.10 * sin(t * 0.47) + t * 0.035;
  float cs = cos(angle);
  float sn = sin(angle);
  p = mat2(cs, -sn, sn, cs) * p / zoom;

  // A gentle moving domain warp keeps detail alive all the way to the edges.
  vec2 z = p * 2.25;
  z += 0.075 * vec2(sin(p.y * 5.4 + t), cos(p.x * 5.1 - t * 0.8));
  vec2 c = vec2(-0.745 + 0.025 * sin(t * 0.55), 0.186 + 0.022 * cos(t * 0.43));
  float smoothIteration = 0.0;
  float trap = 8.0;
  float escaped = 0.0;

  for (int i = 0; i < 64; i++) {
    float radiusSquared = dot(z, z);
    trap = min(trap, abs(z.x + 0.31 * sin(z.y * 2.0 + t)));
    if (radiusSquared > 64.0) {
      smoothIteration = float(i) + 1.0 - log2(max(log2(radiusSquared), 0.0001));
      escaped = 1.0;
      break;
    }
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
  }

  // Exterior: brightness rises toward the boundary (log of the smooth escape count), with soft cyclic bands for depth.
  float k = clamp(log(1.0 + smoothIteration) / log(1.0 + 40.0), 0.0, 1.0);
  vec3 exterior = luminousRamp(k) * (0.88 + 0.12 * cos(smoothIteration * 0.9 + t));
  float filament = exp(-trap * 18.0);
  exterior += filament * vec3(0.38, 0.62, 1.0) * (0.10 + 0.32 * k);

  // Interior: a deep, almost black indigo body whose orbit-trap veins carry faint violet and cyan light.
  float vein = exp(-trap * 14.0);
  vec3 interior = vec3(0.012, 0.010, 0.035) + vein * vec3(0.10, 0.06, 0.24) + vein * vein * vec3(0.05, 0.16, 0.22);

  vec3 color = mix(interior, exterior, escaped);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
