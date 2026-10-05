precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

void main() {
  vec2 uv = gl_FragCoord.xy / max(u_resolution, vec2(1.0));
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float t = u_time * 0.35;

  // Moving interference (plasma) field built from four travelling waves.
  float wave = sin(p.x * 6.0 + t);
  wave += sin(p.y * 5.0 - t * 0.8);
  wave += sin((p.x + p.y) * 4.5 + t * 1.3);
  wave += sin(length(p) * 9.0 - t * 1.7);
  float field = wave * 0.25;

  // Smooth gradient base with bright interference ridges and dark valleys.
  vec3 dark = vec3(0.016, 0.039, 0.055);
  vec3 mid = vec3(0.078, 0.318, 0.337);
  vec3 bright = vec3(0.741, 0.965, 0.925);
  vec3 color = mix(dark, mid, 0.5 + 0.5 * sin(uv.x * 3.14159 + field));
  color = mix(color, bright, smoothstep(0.55, 0.95, field));

  // Fine detail — a thin grid that drifts slowly across the whole frame.
  vec2 gridUv = uv * vec2(24.0, 14.0) + vec2(t * 0.05, t * 0.03);
  vec2 cell = abs(fract(gridUv) - 0.5);
  float line = 1.0 - smoothstep(0.0, 0.045, min(cell.x, cell.y));
  color += line * vec3(0.10, 0.16, 0.18);

  // A bright band sweeping the full width on a slow fixed cycle.
  float bandPhase = fract(uv.y * 0.5 + 0.5 - t * 0.12);
  float bandDistance = (bandPhase - 0.5) * 9.0;
  float band = exp(-bandDistance * bandDistance);
  color += band * vec3(0.55, 0.63, 0.50);

  // Soft corner falloff keeps dark regions present in every frame.
  color *= 1.0 - 0.45 * min(dot(p, p), 1.0);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
