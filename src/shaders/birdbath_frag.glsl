#version 300 es
precision mediump float;

uniform float u_time;
in vec4 v_color;
in vec3 v_normal;
in vec2 v_texcoord;
out vec4 outColor;

void main() {
  outColor = vec4(v_normal * .5 + .5, 1);
}