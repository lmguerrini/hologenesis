// Circle Limit: Pentagons
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;

const float PI = 3.141592653589793;

float asinh1(float x) {
    return log(x + sqrt(1.0 + x * x));
}

vec2 renderSample(vec2 pixel, float shift, float vertex,
                  float tileCenter, vec2 circleCenter, float circleR2) {
    float radius = 0.46 * u_resolution.y;
    vec2 p = (pixel - 0.5 * u_resolution) / radius;
    float r2 = dot(p, p);
    float rimPx = (1.0 - sqrt(r2)) * radius;
    float rim = 0.80 * exp(-2.0 * rimPx * rimPx)
              + 0.09 * exp(-0.18 * rimPx * rimPx);

    if (r2 >= 1.0) {
        return vec2(rim, abs(rimPx) < 3.5 ? 1.0 : 0.0);
    }

    // Pixels per hyperbolic unit at the original position.
    float scale = 0.5 * radius * (1.0 - r2);
    if (scale < 0.85) {
        return vec2(0.095 + rim, 1.0);
    }

    // (z + s) / (1 + sz), with real s.
    float den = 1.0 + shift * p.x;
    float divisor = den * den + shift * shift * p.y * p.y;
    vec2 z = vec2(((p.x + shift) * den + shift * p.y * p.y) / divisor,
                  p.y * (1.0 - shift * shift) / divisor);

    float parity = 0.0;
    for (int i = 0; i < 40; ++i) {
        if (z.y < 0.0) {
            z.y = -z.y;
            parity = 1.0 - parity;
        }
        z.x = abs(z.x);
        vec2 q = z - circleCenter;
        float q2 = dot(q, q);
        if (q2 >= circleR2) break;
        z = circleCenter + (circleR2 / q2) * q;
    }

    float h = max(1.0 - dot(z, z), 1e-7);
    float edgePx = asinh1(2.0 * abs(z.y) / h) * scale;
    float cornerPx = 2.0 * asinh1(
        length(z - vec2(vertex, 0.0)) /
        sqrt(h * (1.0 - vertex * vertex))
    ) * scale;

    // The hyperbolic circle centered on the pentagon is tangent to
    // its edges at their midpoints. This is its exact disk-model locus.
    float incircleR = tileCenter / (1.0 + tileCenter * tileCenter);
    float ringPx = abs(length(z - vec2(0.0, incircleR)) - incircleR)
                 * (2.0 * scale / h);

    float fill = mix(0.06, 0.13, parity);
    float lineFade = smoothstep(0.35, 2.0, scale);

    float edge = 0.84 * exp(-1.4 * edgePx * edgePx)
               + 0.13 * exp(-0.15 * edgePx * edgePx);
    float corner = 0.70 * exp(-1.4 * cornerPx * cornerPx)
                 + 0.12 * exp(-0.20 * cornerPx * cornerPx);
    float jewel = 0.22 * exp(-2.4 * ringPx * ringPx)
                + 0.05 * exp(-0.22 * ringPx * ringPx);

    float value = clamp(fill + lineFade * (edge + corner + jewel)
                        + rim, 0.0, 1.0);
    float needsAA = 0.0;
    if (abs(rimPx) < 3.5 || edgePx < 2.8 ||
        cornerPx < 3.0 || ringPx < 2.5) needsAA = 1.0;
    return vec2(value, needsAA);
}

void main() {
    float qv = cos(PI / 5.0) / sin(PI / 4.0);
    float qp = cos(PI / 4.0) / sin(PI / 5.0);
    float vertex = sqrt((qv - 1.0) / (qv + 1.0));
    float tileCenter = sqrt((qp - 1.0) / (qp + 1.0));

    // The circle through (vertex,0) and (0,tileCenter) is
    // orthogonal to the unit rim when R² = |C|² - 1.
    vec2 circleCenter = vec2(
        (1.0 + vertex * vertex) / (2.0 * vertex),
        (1.0 + tileCenter * tileCenter) / (2.0 * tileCenter)
    );
    float circleR2 = dot(circleCenter, circleCenter) - 1.0;
    float edgeHalfLength = log(qv + sqrt(qv * qv - 1.0));

    // Four edge half-lengths: two whole edges in each 24-second loop.
    float phase = fract(u_time / 24.0);
    float e = exp(-4.0 * edgeHalfLength * phase);
    float shift = (1.0 - e) / (1.0 + e);

    vec2 center = renderSample(gl_FragCoord.xy, shift, vertex,
                               tileCenter, circleCenter, circleR2);
    float value = center.x;

    // Four rotated-grid samples at fine features.
    if (center.y > 0.5) {
        value = 0.25 * (
            renderSample(gl_FragCoord.xy + vec2(-0.112, -0.335),
                         shift, vertex, tileCenter, circleCenter, circleR2).x +
            renderSample(gl_FragCoord.xy + vec2( 0.335, -0.112),
                         shift, vertex, tileCenter, circleCenter, circleR2).x +
            renderSample(gl_FragCoord.xy + vec2(-0.335,  0.112),
                         shift, vertex, tileCenter, circleCenter, circleR2).x +
            renderSample(gl_FragCoord.xy + vec2( 0.112,  0.335),
                         shift, vertex, tileCenter, circleCenter, circleR2).x
        );
    }

    gl_FragColor = vec4(value * vec3(0.96, 0.98, 1.0), 1.0);
}
