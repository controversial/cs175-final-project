#version 300 es

precision highp float;

uniform float resolution;
uniform float z;

out vec4 frag_color;

// Dave_Hoskins - https://www.shadertoy.com/view/XdGfRR
#define UI3 uvec3(1597334673U, 3812015801U, 2798796415U)
#define UIF (1.0 / float(0xffffffffU))
vec3 hash_dh(vec3 p)
{
	uvec3 q = uvec3(ivec3(p)) * UI3;
	q = (q.x ^ q.y ^ q.z) * UI3;
	return vec3(q) * UIF;
}

vec3 hash_iq( vec3 p ) // replace this by something better
{
	p = vec3(dot(p, vec3(127.1, 311.7,  74.7)),
			     dot(p, vec3(269.5, 183.3, 246.1)),
			     dot(p, vec3(113.5, 271.9, 124.6)));

	return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise( in vec3 p, float freq )
{
    vec3 i = floor( p );
    vec3 f = fract( p );
	
	vec3 u = f*f*(3.0-2.0*f);

    return mix( mix( mix( dot( hash_iq( mod(i + vec3(0.0,0.0,0.0), freq) ), f - vec3(0.0,0.0,0.0) ), 
                          dot( hash_iq( mod(i + vec3(1.0,0.0,0.0), freq) ), f - vec3(1.0,0.0,0.0) ), u.x),
                     mix( dot( hash_iq( mod(i + vec3(0.0,1.0,0.0), freq) ), f - vec3(0.0,1.0,0.0) ), 
                          dot( hash_iq( mod(i + vec3(1.0,1.0,0.0), freq) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                mix( mix( dot( hash_iq( mod(i + vec3(0.0,0.0,1.0), freq) ), f - vec3(0.0,0.0,1.0) ), 
                          dot( hash_iq( mod(i + vec3(1.0,0.0,1.0), freq) ), f - vec3(1.0,0.0,1.0) ), u.x),
                     mix( dot( hash_iq( mod(i + vec3(0.0,1.0,1.0), freq) ), f - vec3(0.0,1.0,1.0) ), 
                          dot( hash_iq( mod(i + vec3(1.0,1.0,1.0), freq) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
}


// Inigo Quilez - https://iquilezles.org/articles/gradientnoise/
float gradientNoise(vec3 p, float frequency) {
  // 
  vec3 p_i = floor(p);
  vec3 p_f = fract(p);

  // Quintic interpolant
  vec3 u = p_f * p_f * p_f * (p_f * (p_f * 6.0 - 15.0) + 10.0);

  // Gradients
  vec3 ga = hash_iq(mod(p_i + vec3(0.0, 0.0, 0.0), frequency));
  vec3 gb = hash_iq(mod(p_i + vec3(1.0, 0.0, 0.0), frequency));
  vec3 gc = hash_iq(mod(p_i + vec3(0.0, 1.0, 0.0), frequency));
  vec3 gd = hash_iq(mod(p_i + vec3(1.0, 1.0, 0.0), frequency));
  vec3 ge = hash_iq(mod(p_i + vec3(0.0, 0.0, 1.0), frequency));
  vec3 gf = hash_iq(mod(p_i + vec3(1.0, 0.0, 1.0), frequency));
  vec3 gg = hash_iq(mod(p_i + vec3(0.0, 1.0, 1.0), frequency));
  vec3 gh = hash_iq(mod(p_i + vec3(1.0, 1.0, 1.0), frequency));

  // Projections
  float va = dot(ga, p_f - vec3(0.0, 0.0, 0.0));
  float vb = dot(gb, p_f - vec3(1.0, 0.0, 0.0));
  float vc = dot(gc, p_f - vec3(0.0, 1.0, 0.0));
  float vd = dot(gd, p_f - vec3(1.0, 1.0, 0.0));
  float ve = dot(ge, p_f - vec3(0.0, 0.0, 1.0));
  float vf = dot(gf, p_f - vec3(1.0, 0.0, 1.0));
  float vg = dot(gg, p_f - vec3(0.0, 1.0, 1.0));
  float vh = dot(gh, p_f - vec3(1.0, 1.0, 1.0));

  // Interpolation
  return va + 
         u.x * (vb - va) + 
         u.y * (vc - va) + 
         u.z * (ve - va) + 
         u.x * u.y * (va - vb - vc + vd) + 
         u.y * u.z * (va - vc - ve + vg) + 
         u.z * u.x * (va - vb - ve + vf) + 
         u.x * u.y * u.z * (-va + vb + vc - vd + ve - vf - vg + vh);
}

// Inigo Quilez - https://iquilezles.org/articles/fbm/
// 'hurst_exponent' should lie within the range [0, 1]
float gradientFbm(vec3 sample_point, float hurst_exponent)
{
  float gain = exp2(-hurst_exponent);
  float frequency = 4.0;
  float amplitude = 1.0;
  float value = 0.0;
  for (int i = 0; i < 4; i++)
  {
    value += amplitude * gradientNoise(frequency * sample_point, frequency);
    frequency *= 2.0;
    amplitude *= gain;
  }
  return value;
}

float worleyNoise(vec3 uvw, float num_points)
{
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
                vec3 point = neighbor_offset + hash_dh(neighbor);
                float dist = length(point - uvw_f);

                minimum_distance = min(minimum_distance, dist);
            }
        }
    }

    return minimum_distance;
}

float worleyFbm(vec3 sample_point, float frequency)
{
    return worleyNoise(sample_point * frequency      , frequency      ) * 0.625 +
           worleyNoise(sample_point * frequency * 2.0, frequency * 2.0) * 0.25  +
           worleyNoise(sample_point * frequency * 4.0, frequency * 4.0) * 0.125;
}

void main()
{
    vec3 sample_point = vec3(gl_FragCoord.xy, z) / resolution;

    // Inverted worley noise
    float worley_noise_4  = 1.0 - worleyFbm(sample_point, 4.0);
    float worley_noise_8  = 1.0 - worleyFbm(sample_point, 8.0);
    float worley_noise_12 = 1.0 - worleyFbm(sample_point, 12.0);

    float frequency = 4.00;
    float gradient_noise = gradientFbm(sample_point, 1.0);

    float gradient_worley_noise = mix(worley_noise_4, gradient_noise, 0.8);
    //frag_color = vec4(gradient_worley_noise, worley_noise_4, worley_noise_8, worley_noise_12);

    //gradient_worley_noise = pow(gradient_worley_noise, 1.5);
    frag_color = vec4(gradient_worley_noise, worley_noise_4, worley_noise_8, worley_noise_12);
}
