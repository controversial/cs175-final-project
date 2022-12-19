#version 300 es
precision mediump float;
precision mediump sampler2D;
precision highp sampler3D;

#include "../test/shaders/skyfunctions.glsl"

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

float CalcExposure(vec3 sunDirection) {
  return mix(2.2, 0.6, sunDirection.y * sunDirection.y);
}

void main() {

  float fog = linearFog(length(u_eyePosition - v_position));
  mat3 tbn = mat3(v_tangent, v_bitangent, v_normal);
  vec3 normal = tbn * normalize(texture(u_normalTexture, v_texcoord).rgb * 2.0 - 1.0);
  vec3 base_color = texture(u_colorTexture, v_texcoord).rgb;
  vec3 light_color = SkyGetLightAtPoint(v_position, normal, u_sunDirection, vec3(1.1, 1, 1) * base_color);
  light_color = CorrectGamma(light_color, CalcExposure(u_sunDirection));
  outColor = vec4(light_color, fog);
}
