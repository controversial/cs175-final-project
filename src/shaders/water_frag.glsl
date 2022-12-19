#version 300 es

precision mediump float;
precision mediump sampler3D;

uniform float time;
uniform vec3 sun_direction;
uniform float sun_intensity;
uniform vec3 eye_position;
uniform sampler3D cloud_noise_texture;

uniform sampler2D u_waterHeight;
uniform sampler2D u_waterNormal;
uniform float u_radius;

#include "cloud_functions.glsl"
#include "skyfunctions.glsl"

in vec3 v_position;
in vec3 v_normal;
in vec3 v_tangent;
in vec3 v_bitangent;
in vec2 v_uv;


out vec4 outColor;

float linearFog2(float dist)
{
  return clamp((90.0 - dist) / (90.0 - 50.0), 0.0, 1.0);
}

void main() {
  vec3 dx = dFdx(v_position);
  vec3 dy = dFdy(v_position);
  vec3 normal = normalize(cross(dx, dy));

  //mat3 tbn = mat3(v_tangent, v_bitangent, v_normal);
  //mat3 inv_tbn = inverse(tbn);

  //vec3 normal = texture(u_waterNormal, v_uv).xyz;

  vec3 ray_origin = v_position;
  vec3 ray_direction = normalize(reflect(v_position - eye_position, normal));

  vec3 sky_color = SkyGetBackgroundSkyColor(eye_position, ray_direction, sun_direction);
  sky_color = CorrectGamma(sky_color).rgb;

  float fog = linearFog2(length(eye_position - v_position));
  vec3 color = marchClouds(sky_color, v_position, ray_direction, 0.1);

  outColor = vec4(color, 0.4 * fog);
}
