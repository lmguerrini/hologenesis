// Quaternion Julia
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

float juliaDE(vec3 p, vec4 c) {
    vec4 q = vec4(p, 0.0);
    vec4 dq = vec4(1.0, 0.0, 0.0, 0.0);
    float r2 = dot(q, q);

    for (int i = 0; i < 12; i++) {
        if (r2 > 16.0) break;

        dq = 2.0 * vec4(
            q.x * dq.x - dot(q.yzw, dq.yzw),
            q.x * dq.yzw + dq.x * q.yzw + cross(q.yzw, dq.yzw)
        );
        q = vec4(
            q.x * q.x - dot(q.yzw, q.yzw),
            2.0 * q.x * q.yzw
        ) + c;
        r2 = dot(q, q);
    }

    if (r2 <= 16.0) return 0.0;
    float r = sqrt(r2);
    return 0.5 * r * log(r) / max(length(dq), 0.00001);
}

vec3 surfaceNormal(vec3 p, vec4 c, float e) {
    vec3 a = vec3( 1.0, -1.0, -1.0);
    vec3 b = vec3(-1.0, -1.0,  1.0);
    vec3 d = vec3(-1.0,  1.0, -1.0);
    vec3 f = vec3( 1.0,  1.0,  1.0);
    return normalize(
        a * juliaDE(p + e * a, c) +
        b * juliaDE(p + e * b, c) +
        d * juliaDE(p + e * d, c) +
        f * juliaDE(p + e * f, c)
    );
}

void main() {
    float phase = 6.2831853 * u_time / 80.0;
    vec4 c = vec4(-0.2, 0.6, 0.2, 0.2)
           + 0.175 * vec4(cos(phase), sin(phase),
                           cos(2.0 * phase), sin(3.0 * phase));

    float angle = 6.2831853 * u_time / 70.0;
    vec3 ro = vec3(4.3 * sin(angle), 0.42, 4.3 * cos(angle));
    vec3 forward = normalize(-ro);
    vec3 right = normalize(cross(forward, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, forward);

    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.62 * forward);

    float b = dot(ro, rd);
    float h = b * b - dot(ro, ro) + 2.89;
    if (h < 0.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    float t = max(0.0, -b - sqrt(h));
    float farT = -b + sqrt(h);
    bool hit = false;

    for (int i = 0; i < 112; i++) {
        if (t > farT) break;
        float dist = juliaDE(ro + t * rd, c);
        if (dist < 0.0009 * (1.0 + 0.15 * t)) {
            hit = true;
            break;
        }
        t += max(0.82 * dist, 0.001);
    }

    if (!hit) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    vec3 p = ro + t * rd;
    vec3 n = surfaceNormal(p, c, 0.0014 * (1.0 + 0.12 * t));
    vec3 v = normalize(ro - p);

    float occlusion = 0.0;
    for (int i = 1; i <= 3; i++) {
        float distance = 0.045 * float(i);
        occlusion += max(0.0, distance - juliaDE(p + n * distance, c))
                   / distance;
    }
    float ao = clamp(1.0 - 0.32 * occlusion, 0.35, 1.0);

    vec3 key = normalize(-0.65 * right + 0.9 * up + 0.65 * v);
    vec3 fill = normalize(0.3 * right - 0.8 * up + 0.25 * v);
    vec3 reflection = reflect(-v, n);
    vec3 softbox = normalize(-0.6 * right + 0.65 * up + 0.4 * v);

    float diffuse = smoothstep(-0.25, 0.75, dot(n, key));
    float lowerLight = smoothstep(-0.3, 0.8, dot(n, fill));
    float environment = smoothstep(-0.6, 0.85, reflection.y);
    float sheen = pow(max(dot(n, normalize(key + v)), 0.0), 64.0);
    float broadSheen = pow(max(dot(n, normalize(key + v)), 0.0), 18.0);
    float reflectedLight = pow(max(dot(reflection, softbox), 0.0), 22.0);
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);

    float silver = ao * (0.035 + 0.24 * diffuse
                      + 0.10 * lowerLight + 0.25 * environment)
                 + 0.78 * sheen + 0.35 * broadSheen
                 + 0.28 * reflectedLight + 0.42 * rim;
    silver = pow(clamp(silver, 0.0, 1.0), 0.78);

    gl_FragColor = vec4(vec3(silver), 1.0);
}
