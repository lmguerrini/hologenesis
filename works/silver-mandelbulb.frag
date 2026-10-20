// Silver Mandelbulb
// Refined from silver-mandelbulb.refined-3.frag (generated-shader-1-218f6a5f.frag)
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;

float bulb(vec3 c, float power) {
    vec3 z = c;
    float dr = 1.0;
    float r = 0.0;
    for (int i = 0; i < 9; i++) {
        r = length(z);
        if (r > 2.0) break;
        r = max(r, 0.000001);
        float theta = atan(length(z.xz), z.y + 0.00000001);
        float phi = atan(z.z, z.x + 0.00000001);
        float rp = pow(r, power - 1.0);
        dr = power * rp * dr + 1.0;
        float radius = rp * r;
        theta *= power;
        phi *= power;
        z = radius * vec3(
            sin(theta) * cos(phi),
            cos(theta),
            sin(theta) * sin(phi)
        ) + c;
    }
    return r > 2.0 ? max(0.5 * log(r) * r / dr, 0.0) : 0.0;
}

vec3 normalAt(vec3 p, float e, float power) {
    vec3 a = vec3( 1.0, -1.0, -1.0);
    vec3 b = vec3(-1.0, -1.0,  1.0);
    vec3 c = vec3(-1.0,  1.0, -1.0);
    vec3 d = vec3( 1.0,  1.0,  1.0);
    return normalize(
        a * bulb(p + e * a, power) +
        b * bulb(p + e * b, power) +
        c * bulb(p + e * c, power) +
        d * bulb(p + e * d, power)
    );
}

float softShadow(vec3 p, vec3 lightDir, float power) {
    float shade = 1.0;
    float t = 0.018;
    for (int i = 0; i < 12; i++) {
        if (t > 0.8) break;
        float d = bulb(p + t * lightDir, power);
        shade = min(shade, 12.0 * d / t);
        if (shade < 0.04) break;
        t += clamp(d, 0.014, 0.09);
    }
    return clamp(shade, 0.0, 1.0);
}

float ambientOcclusion(vec3 p, vec3 n, float power) {
    float ao = 1.0;
    for (int i = 0; i < 3; i++) {
        float h = 0.04 + 0.06 * float(i);
        ao -= 0.16 * max(0.0, 1.0 - bulb(p + n * h, power) / h);
    }
    return clamp(ao, 0.5, 1.0);
}

vec3 render(vec2 pixel) {
    float angle = 6.2831853 * u_time / 60.0;
    float power = 8.0 + sin(6.2831853 * u_time / 40.0);
    vec3 center = vec3(0.0, -0.08, 0.0);
    vec3 ro = center + vec3(
        4.7 * sin(angle),
        0.17 + 0.10 * sin(angle),
        4.7 * cos(angle)
    );
    vec3 forward = normalize(center - ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);
    vec2 uv = (pixel - 0.5 * u_resolution) / u_resolution.y;
    vec3 rd = normalize(1.52 * forward + uv.x * right + uv.y * up);
    float b = dot(ro, rd);
    float closest2 = dot(ro, ro) - b * b;
    float halo = 0.012 * exp(
        -15.0 * abs(sqrt(max(closest2, 0.0)) - 1.22)
    );
    vec3 background = vec3(0.0015 + halo);
    float sphere = b * b - dot(ro, ro) + 1.55 * 1.55;
    if (sphere < 0.0) return background;
    float span = sqrt(sphere);
    float t = max(0.0, -b - span);
    float farT = -b + span;
    bool hit = false;
    for (int i = 0; i < 112; i++) {
        if (t > farT) break;
        float d = bulb(ro + rd * t, power);
        if (d < 0.00055 + 0.00022 * t) {
            hit = true;
            break;
        }
        t += max(0.85 * d, 0.0008);
    }
    if (!hit) return background;
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p, 0.00085 + 0.00022 * t, power);
    vec3 viewDir = -rd;
    vec3 lightDir = normalize(
        -0.85 * right + 1.20 * up - 1.50 * forward
    );
    vec3 fillDir = normalize(
        0.75 * right - 0.55 * up - 0.90 * forward
    );
    float shadow = softShadow(p + 0.005 * n, lightDir, power);
    float ao = ambientOcclusion(p, n, power);
    float diffuse = max(dot(n, lightDir), 0.0);
    float fill = max(dot(n, fillDir), 0.0);
    float reflection = max(dot(reflect(-lightDir, n), viewDir), 0.0);
    float broad = pow(reflection, 12.0);
    float glint = pow(reflection, 48.0);
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    float silver = (0.25 + 0.42 * diffuse * shadow + 0.05 * fill)
                 * (0.70 + 0.30 * ao) * (1.0 - 0.25 * rim);
    float specular = (0.30 * broad + 0.90 * glint) * shadow;
    float sky = 0.027 * smoothstep(0.0, 0.8, n.y)
              * smoothstep(-0.1, 0.8, dot(reflect(rd, n), up));
    vec3 color = vec3(silver + specular)
               + sky * vec3(0.55, 0.73, 1.0);
    float peak = max(color.r, max(color.g, color.b));
    float rolled = peak > 0.75
        ? 1.0 - 0.25 * exp(-4.0 * (peak - 0.75))
        : peak;
    return color * (rolled / max(peak, 0.0001));
}

void main() {
    vec3 first = render(gl_FragCoord.xy + vec2(-0.25, 0.17));
    vec3 second = render(gl_FragCoord.xy + vec2(0.25, -0.17));
    gl_FragColor = vec4(0.5 * (first + second), 1.0);
}
