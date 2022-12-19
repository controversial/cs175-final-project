#version 300 es
precision highp float;

uniform vec3 u_lookVector;
uniform float u_aspect;
uniform float u_near;
uniform float u_far;
uniform float u_fov;

uniform vec3 u_sunDirection;
uniform vec3 u_camera;

in vec2 v_position;
out vec4 outColor;

vec3 GetRayDirection() {
  float h = u_near * tan(u_fov / 2.0);
  float w = h * u_aspect;
  float a = -w + 2.0 * w * (v_position.x * 0.5 + 0.5);
  float b = -h + 2.0 * h * (v_position.y * 0.5 + 0.5);
  vec3 u = normalize(cross(u_lookVector, vec3(0.0, 1.0, 0.0)));
  vec3 v = normalize(cross(u, u_lookVector));
  vec3 q = u_near * u_lookVector;
  vec3 s = q + (a * u) + (b * v);
  return normalize(s);
}

#include "skyfunctions.glsl"

void main() {
  vec3 rayDirection = GetRayDirection();
  vec3 skyColor = SkyGetBackgroundSkyColor(u_camera, rayDirection, u_sunDirection.xzy);
  outColor = CorrectGamma(skyColor);
}