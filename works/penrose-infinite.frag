// Penrose Infinite
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;

const float PI = 3.141592653589793;
const float PHI = 1.618033988749895;

float cross2(vec2 a, vec2 b) {
    return a.x * b.y - a.y * b.x;
}

bool contains(vec2 p, vec2 a, vec2 b, vec2 c) {
    float s = sign(cross2(b - a, c - a));
    float e0 = s * cross2(b - a, p - a);
    float e1 = s * cross2(c - b, p - b);
    float e2 = s * cross2(a - c, p - c);
    return min(e0, min(e1, e2)) >= -0.0000001;
}

float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 v = b - a;
    return length(p - a - v * clamp(dot(p - a, v) / dot(v, v), 0.0, 1.0));
}

float silver(vec2 p, vec2 a, vec2 b, vec2 c, float kind, float pixel) {
    float side = length(b - a);
    float sidePx = side / pixel;
    float edge = min(segmentDistance(p, a, b),
                     segmentDistance(p, a, c)) / pixel;
    float arc = abs(length(p - a) - 0.5 * side) / pixel;

    float edgeWidth = min(1.0, sidePx / 8.0);
    float arcWidth = 2.6 * edgeWidth;
    float edgeCoverage = min(1.0, edgeWidth);
    float arcCoverage = min(1.0, arcWidth);

    float edgeCore = edgeCoverage *
        (1.0 - smoothstep(0.10, 0.75 * edgeWidth, edge));
    float edgeGlow = edgeCoverage *
        (1.0 - smoothstep(0.0, 2.8, edge));
    float arcCore = arcCoverage *
        (1.0 - smoothstep(max(0.0, 0.5 * arcWidth - 0.4),
                          0.5 * arcWidth + 0.4, arc));
    float arcGlow = arcCoverage *
        (1.0 - smoothstep(0.0, 4.2, arc));

    float graphite = kind < 0.5 ? 0.080 : 0.110;
    return clamp(graphite + 0.62 * edgeCore + 0.14 * edgeGlow
                          + 0.82 * arcCore  + 0.14 * arcGlow, 0.0, 1.0);
}

float mosaic(vec2 p, float pixel, float phase) {
    float sector = PI / 5.0;
    float index = mod(floor((atan(p.y, p.x) + 0.5 * sector) / sector), 10.0);
    float lo = (index - 0.5) * sector;
    float hi = (index + 0.5) * sector;
    vec2 ray0 = vec2(cos(lo), sin(lo));
    vec2 ray1 = vec2(cos(hi), sin(hi));
    if (mod(index, 2.0) < 1.0) {
        vec2 swapRay = ray0;
        ray0 = ray1;
        ray1 = swapRay;
    }

    // Ten thick Robinson triangles form the central sun.
    vec2 a = ray0 / PHI;
    vec2 b = ray1;
    vec2 c = vec2(0.0);
    float kind = 1.0;

    float progression = 2.0 * phase;
    bool secondHalf = progression >= 1.0;
    float fine = 0.0;
    float coarse = 0.0;

    // Four fewer descents make the rhombus edges about 6.85 times larger.
    for (int level = 0; level < 8; level++) {
        vec2 oldA = a;
        vec2 oldB = b;
        vec2 oldC = c;
        if (kind < 0.5) {
            vec2 cut = oldA + (oldB - oldA) / PHI;
            if (contains(p, oldC, cut, oldB)) {
                a = oldC;
                b = cut;
                c = oldB;
            } else {
                a = cut;
                b = oldC;
                c = oldA;
                kind = 1.0;
            }
        } else {
            vec2 q = oldB + (oldA - oldB) / PHI;
            vec2 r = oldB + (oldC - oldB) / PHI;
            if (contains(p, r, oldC, oldA)) {
                a = r;
                b = oldC;
                c = oldA;
            } else if (contains(p, q, r, oldB)) {
                a = q;
                b = r;
                c = oldB;
            } else {
                a = r;
                b = q;
                c = oldA;
                kind = 0.0;
            }
        }

        if (level == 5 && secondHalf)
            coarse = silver(p, a, b, c, kind, pixel);
        if (level == 6) {
            float value = silver(p, a, b, c, kind, pixel);
            if (secondHalf) fine = value;
            else coarse = value;
        }
        if (level == 7 && !secondHalf)
            fine = silver(p, a, b, c, kind, pixel);
    }

    // Two substitutions equal one inflation by phi squared and a 36° turn.
    return mix(fine, coarse, smoothstep(0.0, 1.0, fract(progression)));
}

void main() {
    float phase = fract(u_time / 20.0);
    float angle = phase * PI / 5.0;
    float zoom = pow(PHI, 2.0 * phase);
    mat2 rotation = mat2(cos(angle), sin(angle),
                         -sin(angle), cos(angle));
    float pixel = zoom / (8.0 * u_resolution.y);

    float light = 0.0;
    for (int sampleIndex = 0; sampleIndex < 4; sampleIndex++) {
        float x = mod(float(sampleIndex), 2.0) - 0.5;
        float y = floor(float(sampleIndex) / 2.0) - 0.5;
        vec2 offset = vec2(0.433 * x - 0.250 * y,
                           0.250 * x + 0.433 * y);
        vec2 p = rotation *
            ((gl_FragCoord.xy + offset - 0.5 * u_resolution)
             / u_resolution.y) * (zoom / 8.0);
        light += mosaic(p, pixel, phase);
    }

    gl_FragColor = vec4(vec3(light * 0.25), 1.0);
}
