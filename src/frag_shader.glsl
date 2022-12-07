#version 300 es

precision highp float;

uniform vec2 resolution;
uniform float frame;

out vec4 frag_color;

const float num_tiles = 10.0;

/*
vec2 random (vec2 uv) {
    return fract(sin(vec2(dot(uv, vec2(127.1, 311.7)), dot(uv, vec2(269.5, 183.3)))) * 43758.5453);
}
*/

vec3 random3(vec3 p) {
    return fract(sin(vec3(
            dot(p, vec3(127.1, 311.7, 103.3)),
            dot(p, vec3(269.5, 183.3, 224.7)),
            dot(p, vec3(214.3, 129.4, 183.9)))) * 43758.5453);
}

float worleyNoise(vec3 uvw) {

    vec3 uvw_i = floor(uvw);
    vec3 uvw_f = fract(uvw);

    float minimum_distance = 1.0;

    for (int z = -1; z <= 1; z++) {
        for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {

                // Relative grid location of neighboring cell
                vec3 neighbor_offset = vec3(float(x), float(y), float(z));
                vec3 neighbor = mod(uvw_i + neighbor_offset, num_tiles);

                // Distance to point in neighboring cell
                vec3 point = neighbor_offset + random3(neighbor);
                float dist = length(point - uvw_f);

                minimum_distance = min(minimum_distance, dist);
            }
        }
    }

    return minimum_distance;
}

float worleyFbm(vec3 uvw, float base_frequency) {
    return worleyNoise(uvw * base_frequency      ) * 0.625 +
           worleyNoise(uvw * base_frequency * 2.0) * 0.25  +
           worleyNoise(uvw * base_frequency * 4.0) * 0.125;
}

void main() {

    vec3 uvw = vec3(gl_FragCoord.xy / resolution, frame / 10000.0) * num_tiles;

    float noise = worleyFbm(uvw, 1.0);

    frag_color = vec4(vec3(1.0 - noise), 1.0);
}

