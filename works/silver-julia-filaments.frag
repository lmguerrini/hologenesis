// Silver Julia Filaments
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

float juliaDistance(vec2 z, vec2 c) {
    vec2 dz = vec2(1.0, 0.0);
    float invScale = 1.0;

    for (int i = 0; i < 180; i++) {
        dz = 2.0 * vec2(
            z.x * dz.x - z.y * dz.y,
            z.x * dz.y + z.y * dz.x
        );
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        float r2 = dot(z, z);
        if (r2 > 65536.0) {
            float r = sqrt(r2);
            return r * log(r) * invScale / max(length(dz), 1e-15);
        }

        if (max(abs(dz.x), abs(dz.y)) > 1e12) {
            dz *= 1e-12;
            invScale *= 1e-12;
        }
    }
    return -1.0;
}

float emission(float d, float width) {
    if (d < 0.0) return 0.0;
    float q = min(d / width, 100.0);
    float core = 0.96 * exp(-q * q);
    float glow = 0.11 * exp(-0.055 * q * q);
    float haze = 0.022 * exp(-q / 17.0);
    return core + glow + haze;
}

vec2 plane(vec2 pixel, float span, float cs, float sn) {
    vec2 p = (pixel / u_resolution - 0.5) * span;
    return vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y);
}

void main() {
    float theta = 6.28318530718 * mod(u_time, 100.0) / 100.0;
    vec2 v = vec2(cos(theta), sin(theta));
    vec2 v2 = vec2(v.x * v.x - v.y * v.y, 2.0 * v.x * v.y);

    // A smooth outward normal offset, rounded gently at the cardioid cusp.
    vec2 c = 0.5 * v - 0.25 * v2
           + 0.014 * (v - v2)
           + vec2(0.011 * pow(0.5 + 0.5 * v.x, 16.0), 0.0);

    float angle = 0.045 * sin(theta + 0.8)
                + 0.018 * sin(2.0 * theta - 0.3);
    float zoom = 1.0 + 0.018 * sin(theta - 0.4)
                      + 0.008 * sin(3.0 * theta + 0.6);
    float span = 2.85 / zoom;
    float width = 0.9 * span / sqrt(u_resolution.x * u_resolution.y);
    float cs = cos(angle);
    float sn = sin(angle);

    float centerD = juliaDistance(
        plane(gl_FragCoord.xy, span, cs, sn), c
    );

    float light = 0.0;
    float charcoal = 0.0;

    if (centerD > 24.0 * width) {
        light = emission(centerD, width);
    } else {
        for (int i = 0; i < 4; i++) {
            vec2 grid = vec2(
                mod(float(i), 2.0),
                floor(float(i) * 0.5)
            ) - 0.5;
            vec2 offset = vec2(
                0.8660254 * grid.x - 0.5 * grid.y,
                0.5 * grid.x + 0.8660254 * grid.y
            );
            float d = juliaDistance(
                plane(gl_FragCoord.xy + offset, span, cs, sn), c
            );
            light += emission(d, width);
            if (d < 0.0) charcoal += 0.008;
        }
        light *= 0.25;
        charcoal *= 0.25;
    }

    light *= 0.98 + 0.02 * sin(theta + 0.5);
    float silver = clamp(light + charcoal, 0.0, 1.0);
    gl_FragColor = vec4(vec3(silver), 1.0);
}
