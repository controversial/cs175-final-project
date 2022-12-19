#version 300 es

precision highp float;
precision highp sampler2D;

// Adapted from https://github.com/amandaghassaei/gpu-io/blob/main/examples/wave2d/index.js

in vec2 v_position;

uniform vec2 u_resolution;
uniform sampler2D u_height;

out vec3 out_normal;

/* Fade to 0 outside of circular area */
float circleMask(vec2 uv) {
  float radius = length(uv - vec2(0.5, 0.5));
  return smoothstep(0.5, 0.495, radius);
}

/* Samples a texture but it returns 0 outside of the circular area */
float sampleCircle(sampler2D tex, vec2 uv) {
  return circleMask(uv) * texture(tex, uv).x;
}

void main() {
  vec2 px = 1.0 / u_resolution;
  float n = sampleCircle(u_height, v_position + vec2(0, px.y));
  float s = sampleCircle(u_height, v_position - vec2(0, px.y));
  float e = sampleCircle(u_height, v_position + vec2(px.x, 0));
  float w = sampleCircle(u_height, v_position - vec2(px.x, 0));
  vec2 normal = vec2(w - e, s - n) / 2.0;
  normal *= min(0.0075 / length(normal), 1.0);
  out_normal = normalize(vec3(normal, 1.0));
}
