
const int MAX_STEPS = 8;
const int MAX_LIGHT_STEPS = 2;
const float STEP_SIZE = 10.0;
const float RECURSIVE = 1.0;
const float CLOUD_PLANE = 10.0;
const float CLOUD_BOTTOM = CLOUD_PLANE + 1.0;
const float CLOUD_TOP = CLOUD_BOTTOM + 50.0;
const float CLOUD_FADE = 10.0;
const float CLOUD_SPEED = 0.00001;
const float ABSORPTION = 0.3;

const float near = 0.001; // TODO: near and far should probably be passed in
const float far = 200.0;
const float inverse_near = 1.0 / near;
const float inverse_far = 1.0 / far;

float cloudDensity(vec3 sample_point)
{
  vec4 cloud_noise = texture(cloud_noise_texture, sample_point * 0.01 + time * CLOUD_SPEED);
  float density = cloud_noise.r - 0.04 * cloud_noise.g - 0.02 * cloud_noise.b - 0.01 * cloud_noise.a;

  float bottom_fade = smoothstep(sample_point.y - CLOUD_BOTTOM, 0.0, CLOUD_FADE);
  float top_fade = smoothstep(CLOUD_TOP - sample_point.y, 0.0, CLOUD_FADE);

  return density * bottom_fade * top_fade;
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

// Assumes ray_origin is inside clouds
vec4 volumeMarch(vec3 ray_origin, vec3 ray_direction, float depth_step)
{
  float transmittance = 1.0;

  float depth = 0.0;
  vec3 color = vec3(0.0);

  for (int i = 0; i < MAX_STEPS; i++)
  {
    vec3 sample_point = ray_origin + depth * ray_direction;

    if (sample_point.y > CLOUD_BOTTOM && sample_point.y < CLOUD_TOP)
    {
      float density = cloudDensity(sample_point);
      float absorption = ABSORPTION * density;

      // Beer's law
      transmittance *= exp(-absorption * depth_step);

      // Lighting
      vec3 light_color = vec3(1.0, 1.0, 1.0) * sun_intensity;
      float light_intensity = RECURSIVE > 0.0 ? lightMarch(sample_point, normalize(sun_direction), depth_step) : 1.0;

      // Update
      color += transmittance * depth_step * absorption * light_color * light_intensity;
      depth += depth_step;
    }
    else
    {
      depth = far;
      break;
    }
  }
  return vec4(color, transmittance);
}

float rayOffset(vec3 ray_origin, vec3 ray_direction)
{
  float ray_offset = 0.0;

  float below_clouds = ray_origin.y < CLOUD_BOTTOM ? 1.0 : 0.0;
  float looking_up = ray_direction.y > 0.0 ? 1.0 : 0.0;
  ray_offset += looking_up * below_clouds * ((CLOUD_BOTTOM - ray_origin.y) / ray_direction.y);

  float above_clouds = ray_origin.y > CLOUD_TOP ? 1.0 : 0.0;
  float looking_down = ray_direction.y < 0.0 ? 1.0 : 0.0;
  ray_offset += looking_down * above_clouds * ((CLOUD_TOP - ray_origin.y) / ray_direction.y);

  return ray_offset;
} 

float linearFog(float ray_offset)
{
  return clamp((far - ray_offset) / (far - near), 0.0, 1.0);
}

vec3 marchClouds(vec3 sky_color, vec3 ray_origin, vec3 ray_direction, float ray_offset)
{
  ray_offset += rayOffset(ray_origin, ray_direction);
  ray_origin += ray_offset * ray_direction;

  float fog = linearFog(ray_offset);

  vec4 result = volumeMarch(ray_origin, ray_direction, STEP_SIZE);

  vec3 color = sky_color * result.a + result.rgb;

  return mix(sky_color, color, fog);
}
