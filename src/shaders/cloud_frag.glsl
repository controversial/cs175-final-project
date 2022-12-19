#version 300 es

precision highp float;
precision highp sampler3D;

uniform float time;
uniform float screen_width;
uniform float screen_height;
uniform vec3 sun_direction;

float sun_intensity = 1.0;

// Camera parameters
uniform float aspect_ratio;
uniform float field_of_view;
uniform vec3 eye_position;
uniform vec3 look_direction;

uniform sampler3D cloud_noise_texture;
uniform sampler2D blue_noise_texture;
uniform sampler2D sky_texture;

#include "cloud_functions.glsl"

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

void main() {
  vec4 sky_sample = texture(sky_texture, vec2(gl_FragCoord.x / screen_width, gl_FragCoord.y / screen_height));
  vec3 sky_color = sky_sample.rgb;
  sun_intensity = sky_sample.a;

  // Ray parameters.
  vec3 ray_direction = rayDirection(gl_FragCoord.xy);
  vec3 ray_origin = eye_position;

  // Use blue noise to offset ray origin to reduce banding.
  float blue_noise = texture(blue_noise_texture, 50.0 * vec2(gl_FragCoord.x / screen_width, gl_FragCoord.y / screen_height)).r;

  vec3 color = marchClouds(sky_color, ray_origin, ray_direction, blue_noise * STEP_SIZE);
  out_color = vec4(color, 1.0);

  // Let models get rendered in front. This is not the correct way to do this.
  gl_FragDepth = 0.9999999;
}
