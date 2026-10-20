// Impossible Cubes: the {4,3,5} Honeycomb
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

float md(vec4 a, vec4 b) {
    return dot(a.xyz, b.xyz) - a.w * b.w;
}

float hc(float x) {
    float e = exp(x);
    return 0.5 * (e + 1.0 / e);
}

float hs(float x) {
    float e = exp(x);
    return 0.5 * (e - 1.0 / e);
}

bool reflectIfOutside(inout vec4 p, inout vec4 d, vec4 n) {
    float side = md(p, n);
    if (side <= 0.0) return false;
    p -= 2.0 * side * n;
    d -= 2.0 * md(d, n) * n;
    return true;
}

void normalizeRay(inout vec4 p, inout vec4 d) {
    p *= inversesqrt(max(1e-8, -md(p, p)));
    d += md(p, d) * p;
    d *= inversesqrt(max(1e-8, md(d, d)));
}

void main() {
    float q = (1.0 + sqrt(5.0)) * 0.25;
    float t = sqrt(2.0 * q * q - 1.0);

    // Unit Minkowski normals with Coxeter angles 4, 3, 5.
    vec4 n0 = vec4(1.0, 0.0, 0.0, 0.0);
    vec4 n1 = vec4(-sqrt(0.5), 0.5, -0.5, 0.0);
    vec4 n2 = vec4(0.0, 0.0, 1.0, 0.0);
    vec4 n3 = vec4(0.0, -q, -q, t);

    vec4 C = vec4(0.0, 0.0, 0.0, 1.0);
    vec4 axis = vec4(0.0, -sqrt(0.5), -sqrt(0.5), 0.0);
    vec4 right = vec4(1.0, 0.0, 0.0, 0.0);
    vec4 up = vec4(0.0, sqrt(0.5), -sqrt(0.5), 0.0);

    // C-to-F distance; two such lengths carry one cell centre to the next.
    float slope = t / (sqrt(2.0) * q);
    float cf = 0.5 * log((1.0 + slope) / (1.0 - slope));
    float cycle = mod(u_time, 24.0) / 24.0;
    float travel = cycle * 2.0 * cf;
    float sway = 6.28318530718 * cycle;

    vec4 p = C * hc(travel) + axis * hs(travel);
    vec4 forward = C * hs(travel) + axis * hc(travel);
    vec2 screen = (2.0 * gl_FragCoord.xy - u_resolution.xy)
                / u_resolution.y;
    vec4 d = forward
           + (1.1 * screen.x + 0.045 * sin(sway)) * right
           + (1.1 * screen.y + 0.030 * sin(sway + 1.3)) * up;
    d *= inversesqrt(md(d, d));
    reflectIfOutside(p, d, n3);
    normalizeRay(p, d);

    // n2 and edgeB are an orthonormal basis normal to each cube edge.
    vec4 edgeB = (n3 + q * n2) / sqrt(1.0 - q * q);

    // V is the simplex vertex on m1, m2 and m3.
    float z = t / q;
    float vertexW = inversesqrt(1.0 - 1.5 * z * z);
    vec4 V = vec4(-z * vertexW * sqrt(0.5),
                  -z * vertexW, 0.0, vertexW);

    float halfEdgeCosh = sqrt((1.0 - z * z)
                            / (1.0 - 1.5 * z * z));
    float edgeLength = 2.0 * log(halfEdgeCosh
                         + sqrt(halfEdgeCosh * halfEdgeCosh - 1.0));
    float radius = 0.03 * edgeLength;
    float coreWidth2 = hs(radius) * hs(radius);
    float haloWidth2 = hs(3.0 * radius) * hs(3.0 * radius);
    float knotWidth = hc(2.4 * radius) - 1.0;
    float faceWidth = hs(0.04);

    float stepC = hc(0.1);
    float stepS = hs(0.1);
    float fogStep = exp(-0.1 / 2.5);
    float s = 0.0;
    float fog = 1.0;
    float beams = 0.0;
    float knots = 0.0;
    float panes = 0.0;

    for (int i = 0; i < 80; i++) {
        if (s >= 8.0) break;

        // Squared sinh of the exact distance to m2 intersect m3.
        float ea = md(p, n2);
        float eb = md(p, edgeB);
        float edgeR2 = ea * ea + eb * eb;
        float cr = edgeR2 / coreWidth2;
        float hr = edgeR2 / haloWidth2;
        float core = 1.0 / (1.0 + cr * cr);
        float halo = 1.0 / (1.0 + hr * hr);

        // cosh(distance to V) = -<p,V>.
        float vr = max(0.0, -md(p, V) - 1.0) / knotWidth;
        float knot = 1.0 / (1.0 + vr * vr);

        // |<p,n3>| is sinh of the exact distance to the face plane.
        float fr = abs(md(p, n3)) / faceWidth;
        float pane = 1.0 / (1.0 + fr * fr * fr * fr);

        beams += fog * (0.21 * core + 0.008 * halo);
        knots += fog * 0.12 * knot;
        panes += fog * 0.0025 * pane;

        vec4 nextP = p * stepC + d * stepS;
        d = p * stepS + d * stepC;
        p = nextP;

        // Fold the geodesic through the Coxeter mirrors.
        for (int j = 0; j < 16; j++) {
            bool crossed = false;
            if (reflectIfOutside(p, d, n0)) crossed = true;
            if (reflectIfOutside(p, d, n1)) crossed = true;
            if (reflectIfOutside(p, d, n2)) crossed = true;
            if (reflectIfOutside(p, d, n3)) crossed = true;
            if (!crossed) break;
        }
        normalizeRay(p, d);
        s += 0.1;
        fog *= fogStep;
    }

    float silver = 1.0 - exp(-2.2 * (beams + knots));
    float gray = clamp(pow(silver, 0.82) + min(panes, 0.035),
                       0.0, 1.0);
    gl_FragColor = vec4(vec3(gray), 1.0);
}
