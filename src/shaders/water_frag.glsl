#version 300 es

precision mediump float;
precision mediump sampler3D;

uniform float time;
uniform vec3 sun_direction;
uniform vec3 eye_position;
uniform sampler3D cloud_noise_texture;

float sun_intensity = 1.0;

#include "cloud_functions.glsl"

in vec3 v_position;
in vec3 v_normal;

out vec4 outColor;

void main() {
  vec3 ray_origin = v_position;
  vec3 ray_direction = normalize(reflect(v_position - eye_position, vec3(0.0, 1.0, 0.0)));

  vec3 sky_color = vec3(0.2, 0.2, 0.8); // TODO: correct sky color

  vec3 color = marchClouds(sky_color, v_position, ray_direction, 0.1);
  outColor = vec4(color, 0.4);
}
