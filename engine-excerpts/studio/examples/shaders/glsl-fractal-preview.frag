precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

vec3 luminousPalette(float value) {
  const vec3 phase = vec3(0.08, 0.34, 0.62);
  const vec3 amplitude = vec3(0.48, 0.46, 0.50);
  const vec3 offset = vec3(0.50, 0.51, 0.50);
  const vec3 frequency = vec3(1.00, 0.92, 1.08);
  return offset + amplitude * cos(6.28318 * (frequency * value + phase));
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

  for (int i = 0; i < 40; i++) {
    float radiusSquared = dot(z, z);
    trap = min(trap, abs(z.x + 0.31 * sin(z.y * 2.0 + t)));
    if (radiusSquared > 64.0) {
      smoothIteration = float(i) + 1.0 - log2(max(log2(radiusSquared), 0.0001));
      escaped = 1.0;
      break;
    }
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
  }

  float bands = smoothIteration * 0.105;
  float filament = exp(-trap * 15.0);
  float interior = 1.0 - escaped;
  vec3 color = luminousPalette(bands + 0.035 * sin(p.x * 19.0 + p.y * 13.0 + t));
  color *= 0.24 + 0.76 * escaped;
  color += vec3(0.07, 0.015, 0.12) * interior;
  color += filament * vec3(0.18, 0.45, 0.72) * (0.25 + 0.75 * escaped);
  color += (0.5 + 0.5 * cos(t + p.y * 8.0)) * 0.035 * vec3(0.35, 0.55, 0.72);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
