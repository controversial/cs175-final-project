#version 300 es

precision highp float;

uniform float resolution;
uniform float z;
uniform float num_points;

out vec4 frag_color;

// Dave_Hoskins - https://www.shadertoy.com/view/XdGfRR
#define UI3 uvec3(1597334673U, 3812015801U, 2798796415U)
#define UIF (1.0 / float(0xffffffffU))
vec3 hash33(vec3 p)
{
	uvec3 q = uvec3(ivec3(p)) * UI3;
	q = (q.x ^ q.y ^ q.z) * UI3;
	return vec3(q) * UIF;
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
                vec3 neighbor = mod(uvw_i + neighbor_offset, num_points);

                // Distance to point in neighboring cell
                vec3 point = neighbor_offset + hash33(neighbor);
                float dist = length(point - uvw_f);

                minimum_distance = min(minimum_distance, dist);
            }
        }
    }

    return minimum_distance;
}

float worleyFbm(vec3 uvw, float base_frequency)
{
    return worleyNoise(uvw * base_frequency      ) * 0.625 +
           worleyNoise(uvw * base_frequency * 2.0) * 0.25  +
           worleyNoise(uvw * base_frequency * 4.0) * 0.125;
}

void main()
{
    vec3 uvw = vec3(gl_FragCoord.xy, z) * num_points / resolution;

    float noise = worleyFbm(uvw, 1.0);

    frag_color = vec4(vec3(1.0 - noise), 1.0);
}
