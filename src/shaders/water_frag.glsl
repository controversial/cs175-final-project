#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform vec3 u_lightPosition;

in float should_draw;
in vec3 v_position;
in vec3 v_normal;

out vec4 outColor;

void main() {
  if (should_draw > 0.0) {
    discard;
  }
  outColor = vec4(0.2, 0.2, 0.9, 0.3);
}