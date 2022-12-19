#version 300 es
precision mediump float;
precision mediump sampler2D;
precision highp sampler3D;

#include "./atmosphere/skyfunctions.glsl"

uniform float u_time;
uniform sampler2D u_colorTexture;
uniform sampler2D u_normalTexture;
uniform vec3 u_lightPosition;
uniform vec3 u_sunDirection;
uniform float u_sunIntensity;
uniform vec3 u_eyePosition;

in vec3 v_position; // world-space
in vec4 v_color;
in vec3 v_normal;
in vec3 v_tangent;
in vec3 v_bitangent;
in vec2 v_texcoord;

out vec4 outColor;

float linearFog(float dist)
{
  return clamp((90.0 - dist) / (90.0 - 50.0), 0.0, 1.0);
}

void main() {

  float fog = linearFog(length(u_eyePosition - v_position));

  mat3 tbn = mat3(v_tangent, v_bitangent, v_normal);
  vec3 light_direction = u_sunDirection;
  light_direction *= tbn;
  float light_dist = length(light_direction);
  light_direction = normalize(light_direction);

  vec3 normal = normalize(texture(u_normalTexture, v_texcoord).rgb * 2.0 - 1.0);
  float diffuse = clamp(dot(normal, light_direction), 0.0, 1.0);
  diffuse = 0.2 + diffuse * 0.8;

  vec3 base_color = texture(u_colorTexture, v_texcoord).rgb;
  vec3 sunDirection = vec3(-0.9355747103691101,
                            0.23053064942359924,
                            0.26749882102012634);
  vec3 other_color = SkyGetLightAtPoint(v_position, normal, sunDirection.xzy, vec3(0.8));
  if (other_color != vec3(1000)) {
    outColor = vec4(SkyGetBackgroundSkyColor(normal), 1);
    return;
  }
  base_color = other_color;

  vec3 sun_color = mix(vec3(.96, .55, .15), vec3(1.0, 1.0, 1.0), u_sunIntensity) * u_sunIntensity;

  outColor = vec4(pow(base_color, vec3(1.0 / 1.5)) * diffuse * sun_color, fog);
}
