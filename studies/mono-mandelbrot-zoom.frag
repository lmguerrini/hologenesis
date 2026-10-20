// Demonstration study — externally authored for the studio preview; not natively generated.
//
// mono-mandelbrot-zoom — a seamless looping zoom into the seahorse-valley
// spirals of the Mandelbrot set, anchored near
// -0.743643887037151 + 0.131825904205330 i.
//
// The zoom runs on a log scale, zoom = exp(2.5 * fract(t/40)), and the loop
// seam is hidden by crossfading two layers half a loop out of phase: each
// layer resets while its weight is exactly zero. Maximum zoom stays near
// 12x, far from any float-precision cliff, so highp (or even mediump)
// remains exact.
//
// Shading: graphite smooth-iteration bands, silver orbit-trap rings
// (distance to a circle of radius 0.6 trapped along the orbit), a deep
// black interior, and fine white edge highlights from the distance
// estimate. Monochrome with a whisper of cold blue-grey in the highlights.

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

const float MAX_ITER   = 256.0;     // iteration budget (hard cap, <= 256)
const int   LOOP_MAX   = 256;       // constant loop bound required by ES 1.0
const float BAILOUT_R2 = 65536.0;   // |z|^2 escape radius (256^2)
const float LOOP_T     = 40.0;      // seconds per zoom loop
const float ZOOM_LOG   = 2.5;       // e^2.5 ~ 12.2x per loop
const float BASE_SPAN  = 2.4;       // complex span of the longer side at zoom 1
const vec2  ANCHOR     = vec2(-0.74364388703715, 0.13182590420533);
const vec2  FRAME_OFF  = vec2(0.10, 0.30); // dive converges on ANCHOR, held off-centre:
                                           // lifts the frame out of the valley so the
                                           // exterior bands and rings carry the upper frame

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

mat2 rot2(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, s, -s, c);
}

// Mandelbrot escape field from c.
//   x : smooth iteration count  (-1.0 if c is inside the set)
//   y : exterior distance estimate
//   z : minimum | |z| - 0.6 | over the orbit (circle orbit trap)
vec3 mandelField(vec2 c) {
    vec2 z  = vec2(0.0);
    vec2 dz = vec2(0.0);            // d(z_{n+1})/dc = 2 z_n dz_n + 1
    float trap = 1e9;
    float m2 = 0.0;
    float n = -1.0;
    for (int i = 0; i < LOOP_MAX; i++) {
        if (float(i) >= MAX_ITER) break;
        dz = 2.0 * vec2(z.x * dz.x - z.y * dz.y, z.x * dz.y + z.y * dz.x) + vec2(1.0, 0.0);
        z  = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        m2 = dot(z, z);
        trap = min(trap, abs(sqrt(m2) - 0.6));
        if (m2 > BAILOUT_R2) { n = float(i); break; }
    }
    if (n < 0.0) return vec3(-1.0, 0.0, 0.0);
    float m  = sqrt(m2);
    float mu = n + 4.0 - log2(log2(m2));       // smooth iteration count
    float de = m * log(m) / max(length(dz), 1e-20);
    return vec3(mu, de, trap);
}

// One zoom layer at loop phase ph in [0,1). px is one pixel in complex units.
vec3 shadeLayer(vec2 uv, float ph, float pxLonger) {
    float zoom = exp(ZOOM_LOG * ph);
    float span = BASE_SPAN / zoom;
    float px   = pxLonger * span;

    // gentle roll: per-layer phase plus a seamless global drift
    vec2 p = rot2(0.35 * ph + 0.007 * u_time) * uv;
    vec2 c = ANCHOR + (p + FRAME_OFF) * span;

    vec3 M = mandelField(c);
    if (M.x < 0.0) return vec3(0.0);           // deep black interior

    float t = clamp(M.x / MAX_ITER, 0.0, 1.0);

    // graphite smooth-iteration bands with a faint fine stratification
    float bandTone = pow(t, 1.35);
    float strat = smoothstep(0.35, 0.65, fract(M.x * 0.18));
    float body = 0.120 + 0.34 * bandTone + 0.050 * strat * bandTone;

    // silver orbit-trap rings, living only where the field is deep
    float silver = exp(-M.z * 15.0) * smoothstep(0.04, 0.45, t);

    // fine white edge highlight hugging the set boundary
    float edge = exp(-M.y / (1.5 * px));

    float l = body + 0.36 * silver * (0.30 + 0.70 * bandTone) + 1.1 * edge;
    vec3 tint = mix(vec3(1.0), vec3(0.93, 0.96, 1.0),
                    clamp(0.40 * silver + 0.30 * edge, 0.0, 1.0));
    return vec3(l) * tint;
}

void main() {
    float longer = max(u_resolution.x, u_resolution.y);
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / longer;  // centred, longer-side units
    float pxLonger = 1.0 / longer;

    // two layers, half a loop apart; each is faded to zero when it wraps
    float ph1 = fract(u_time / LOOP_T);
    float ph2 = fract(u_time / LOOP_T + 0.5);
    float d = abs(ph1 - 0.5) * 2.0;             // 0 mid-loop, 1 at layer-1 seam
    float w = smoothstep(0.55, 0.95, d);        // weight of layer 2

    vec3 c1 = shadeLayer(uv, ph1, pxLonger);
    vec3 c2 = (w > 0.001) ? shadeLayer(uv, ph2, pxLonger) : vec3(0.0);
    vec3 col = mix(c1, c2, w);

    // vignette for depth
    float vig = 1.0 - 0.45 * smoothstep(0.30, 0.78, length(uv));
    col *= vig;

    // fine grain against banding in the graphite
    col += (hash21(gl_FragCoord.xy) - 0.5) * 0.010;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
