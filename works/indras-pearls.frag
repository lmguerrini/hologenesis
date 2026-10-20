// Indra's Pearls
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

float pearlField(vec2 z, float pixelSize) {
    if (z.y < 0.0 || z.y > 2.0) return 0.0;

    float scale = 1.0;
    float parity = 0.0;
    float distanceToSet = 1.0e8;

    for (int i = 0; i < 80; i++) {
        // b(z) = z + 2: reduce to one repeating cell.
        z.x -= 2.0 * floor((z.x + 1.0) * 0.5);

        vec2 upper = z - vec2(0.0, 2.0);
        float lowerRadius2 = dot(z, z);
        float upperRadius2 = dot(upper, upper);

        if (lowerRadius2 >= 1.0 && upperRadius2 >= 1.0) {
            float gap = min(sqrt(lowerRadius2) - 1.0,
                            sqrt(upperRadius2) - 1.0);
            distanceToSet = gap * scale;
            break;
        }

        // The separation line is y = 1. Apply a below it,
        // and a inverse above it.
        if (z.y < 1.0) {
            float r2 = max(lowerRadius2, 1.0e-12);
            z = vec2(z.x, -z.y) / r2 + vec2(0.0, 2.0);
            scale *= r2;
        } else {
            float r2 = max(upperRadius2, 1.0e-12);
            z = vec2(upper.x, -upper.y) / r2;
            scale *= r2;
        }

        parity = 1.0 - parity;

        // Further pearls are smaller than a pixel.
        if (scale < 0.18 * pixelSize) {
            distanceToSet = 0.0;
            break;
        }
    }

    if (distanceToSet > 1.0e7) distanceToSet = 0.0;

    float d = distanceToSet / pixelSize;
    float coverage = min(1.0, scale / (1.2 * pixelSize));
    float filament = 0.80 * exp(-3.0 * d * d);
    float glow = 0.14 * exp(-0.22 * d * d);
    float graphite = mix(0.012, 0.022, parity);

    return min(1.0, graphite + coverage * (filament + glow));
}

void main() {
    float phase = mod(u_time, 40.0) / 40.0;
    float zoom = 1.0 + 0.015 * cos(6.28318530718 * phase);
    float pixelSize = 2.16 * zoom / u_resolution.y;
    float pan = 2.0 * phase;
    vec2 offset = vec2(0.23, 0.31);

    vec2 p0 = (gl_FragCoord.xy - 0.5 * u_resolution - offset) * pixelSize;
    vec2 p1 = (gl_FragCoord.xy - 0.5 * u_resolution + offset) * pixelSize;
    p0 += vec2(pan, 1.0);
    p1 += vec2(pan, 1.0);

    float silver = 0.5 * (
        pearlField(p0, pixelSize) +
        pearlField(p1, pixelSize)
    );
    gl_FragColor = vec4(vec3(silver), 1.0);
}
