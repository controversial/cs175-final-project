#version 300 es

precision highp float;
precision highp sampler3D;

uniform float time;
uniform float screen_width;
uniform float screen_height;

// Camera parameters
uniform float aspect_ratio;
uniform float field_of_view;
uniform vec3 eye_position;
uniform vec3 look_direction;
const float near = 0.001; // TODO: near and far should probably be passed in
const float far = 200.0;
const float inverse_near = 1.0 / near;
const float inverse_far = 1.0 / far;

uniform sampler3D cloud_noise_texture;
uniform sampler2D blue_noise_texture;

const int MAX_STEPS = 8;
const int MAX_LIGHT_STEPS = 2;
const float STEP_SIZE = 10.0;

const float CLOUD_PLANE = 10.0;
const float CLOUD_BOTTOM = CLOUD_PLANE + 1.0;
const float CLOUD_TOP = CLOUD_BOTTOM + 50.0;
const float CLOUD_FADE = 20.0;
const float CLOUD_SPEED = 0.00001;

const float ABSORPTION = 0.1;

const float GOLDEN_RATIO_FRACT = 0.61803398875;

out vec4 out_color;

vec3 rayDirection(vec2 frag_coord)
{
  float h = near * tan(field_of_view / 2.0);
  float w = h * aspect_ratio;

  float a = -w + 2.0 * w * (frag_coord.x / screen_width);
  float b = -h + 2.0 * h * (frag_coord.y / screen_height);

  vec3 u = normalize(cross(look_direction, vec3(0.0, 1.0, 0.0)));
  vec3 v = normalize(cross(u, look_direction));
  vec3 q = near * look_direction;

  vec3 s = q + (a * u) + (b * v);

  return normalize(s);
}

float map(float value, float min1, float max1, float min2, float max2)
{
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

float cloudDensity(vec3 sample_point)
{
  vec4 cloud_noise = texture(cloud_noise_texture, sample_point * 0.01 + time * CLOUD_SPEED);
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
  // TODO: Temporary.
  vec3 sky_color = vec3(0.2, 0.2, 0.8);

  // Ray parameters.
  vec3 ray_direction = rayDirection(gl_FragCoord.xy);
  vec3 ray_origin = eye_position;

  // All clouds lie above this plane, so we start raymarching from there.
  float distance_to_cloud_plane = cloudPlaneDistance(eye_position, ray_direction);
  ray_origin += distance_to_cloud_plane * ray_direction;

  // Use blue noise to offset ray origin to reduce banding.
  float blue_noise = texture(blue_noise_texture, 512.0 * vec2(gl_FragCoord.x / screen_width, gl_FragCoord.y / screen_height)).r;
  blue_noise = fract(blue_noise * GOLDEN_RATIO_FRACT * time * 0.01);
  ray_origin += (blue_noise * STEP_SIZE) * ray_direction;

  // March the scene.
  vec4 result = volumeMarch(ray_origin, ray_direction, STEP_SIZE);
  
  // Final color should be (background_color * out_color.a + out_color.rgb)
  out_color = vec4(sky_color * result.w + result.rgb, 1.0);

  // Hacky-depth, unnecessary if we assume clouds are rendered before other scene objects.
  gl_FragDepth = ((1.0 / distance_to_cloud_plane) - inverse_near) / (inverse_far - inverse_near);
}
