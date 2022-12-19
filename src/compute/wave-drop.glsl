#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 v_position;

uniform vec2 u_resolution;
uniform vec2 u_dropPosition;
uniform float u_dropRadius;

uniform sampler2D u_height;

out float new_height;

void main() {
  vec2 dist = (v_position - u_dropPosition) / u_dropRadius;
  float inCircle = smoothstep(1.0, 0.99, length(dist));

  new_height = mix(
    texture(u_height, v_position).r, // outside circle, keep original height
    -0.5 * (1.0 - length(dist)), // inside circle, render little divet
    inCircle
  );
}
