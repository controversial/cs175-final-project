#version 300 es

precision highp float;
precision highp sampler3D;

uniform float u_time;
uniform float u_screenWidth;
uniform float u_screenHeight;
uniform float u_aspectRatio;
uniform float u_fieldOfView;
uniform vec3 u_eyePoint;
uniform vec3 u_lookVector;

uniform sampler3D cloud_noise_texture;
uniform sampler2D blue_noise_texture;

const float near = 0.001;
const float invNear = 1.0 / near;
const float far = 200.0;
const float invFar = 1.0 / far;

const int MAX_STEPS = 8;
const int MAX_LIGHT_STEPS = 2;

const float CLOUD_PLANE = 10.0;
const float CLOUD_BOTTOM = CLOUD_PLANE + 1.0;
const float CLOUD_TOP = CLOUD_BOTTOM + 50.0;
const float CLOUD_FADE = 20.0;

const float GOLDEN_RATIO_FRACT = 0.61803398875;

const float ABSORPTION = 0.1;

out vec4 out_color;

vec3 rayDirection(vec2 frag_coord)
{
  float h = near * tan(u_fieldOfView / 2.0);
  float w = h * u_aspectRatio;

  float a = -w + 2.0 * w * (frag_coord.x / u_screenWidth);
  float b = -h + 2.0 * h * (frag_coord.y / u_screenHeight);

  vec3 u = normalize(cross(u_lookVector, vec3(0.0, 1.0, 0.0)));
  vec3 v = normalize(cross(u, u_lookVector));
  vec3 q = near * u_lookVector;

  vec3 s = q + (a * u) + (b * v);

  return normalize(s);
}

float map(float value, float min1, float max1, float min2, float max2)
{
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float cloudDensity(vec3 sample_point)
{
  vec4 cloud_noise = texture(cloud_noise_texture, sample_point * 0.01 + u_time * 0.00001);
  float density = cloud_noise.r - 0.04 * cloud_noise.g - 0.02 * cloud_noise.b - 0.01 * cloud_noise.a;
  
  float bottom_fade = map(sample_point.y, CLOUD_BOTTOM, CLOUD_BOTTOM + CLOUD_FADE, 0.0, 1.0);
  bottom_fade = clamp(bottom_fade, 0.0, 1.0);

  float top_fade = map(sample_point.y, CLOUD_TOP - CLOUD_FADE, CLOUD_TOP, 0.0, 1.0);
  top_fade = clamp(top_fade, 0.0, 1.0);

  return density * bottom_fade;
}

float lightMarch(vec3 ray_origin, vec3 ray_direction, float depth_step)
{
  float transmittance = 1.0; 
  float depth = 0.0;
  for (int i = 0; i < MAX_LIGHT_STEPS; i++)
  {
    vec3 sample_point = ray_origin + depth * ray_direction;
    float density = cloudDensity(sample_point);
    float absorption = ABSORPTION * density;

    // Beer's law
    transmittance *= exp(-absorption * depth_step);

    depth += depth_step;
  }
  return transmittance;
}

// Assumes ray_origin is inside clouds and ray_direction is upwards
vec4 volumeMarch(vec3 ray_origin, vec3 ray_direction, float depth_step)
{
  float transmittance = 1.0;

  float depth = 0.0;
  vec3 color = vec3(0.0);

  for (int i = 0; i < MAX_STEPS; i++)
  {
    vec3 sample_point = ray_origin + depth * ray_direction;

    float density = cloudDensity(sample_point);
    float absorption = ABSORPTION * density;

    // Beer's law
    transmittance *= exp(-absorption * depth_step);

    // Lighting
    vec3 light_color = vec3(1.5, 0.8, 0.8);
    vec3 light_position = vec3(5.0, 100.0, 10.0);
    vec3 light_direction = normalize(light_position - sample_point);
    float light_intensity = lightMarch(sample_point, light_direction, depth_step);

    // Update
    color += transmittance * depth_step * absorption * light_intensity;
    depth += depth_step;
  }
  return vec4(color, transmittance);
}

// Assumes ray_origin is below clouds and ray_direction is upwards
float cloudPlaneDistance(vec3 ray_origin, vec3 ray_direction)
{
  float distance_to_plane = (CLOUD_PLANE - ray_origin.y) / ray_direction.y;
  return distance_to_plane;
}

void main() {
  float step_size = 10.0;
  vec3 sky_color = vec3(0.2, 0.2, 0.8);

  vec3 ray_direction = rayDirection(gl_FragCoord.xy);

  float distance_to_cloud_plane = cloudPlaneDistance(u_eyePoint, ray_direction);

  float blue_noise = texture(blue_noise_texture, 512.0 * vec2(gl_FragCoord.x / u_screenWidth, gl_FragCoord.y / u_screenHeight)).r;
  blue_noise = fract(blue_noise * GOLDEN_RATIO_FRACT * u_time * 0.01);
  float ray_offset = distance_to_cloud_plane + blue_noise * step_size;

  vec3 ray_origin = u_eyePoint + ray_offset * ray_direction;

  vec4 result = volumeMarch(ray_origin, ray_direction, step_size);
  
  out_color = vec4(sky_color * result.w + result.rgb, 1.0);

  gl_FragDepth = ((1.0 / distance_to_cloud_plane) - invNear) / (invFar - invNear);
}
