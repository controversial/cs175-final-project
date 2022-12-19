#version 300 es

precision highp float;
precision highp sampler2D;

// Adapted from https://github.com/amandaghassaei/gpu-io/blob/main/examples/wave2d/index.js

in vec2 v_position;

uniform sampler2D u_height;
uniform sampler2D u_prevHeight;
uniform vec2 u_resolution;
uniform float u_alpha; // wave propagation speed
uniform float u_decay;

out float new_height;

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
  // Compute the discrete Laplacian on the height
  float current_height = texture(u_height, v_position).x;
  float prev_height = texture(u_prevHeight, v_position).x;
  vec2 px = 1.0 / u_resolution;
  float n = sampleCircle(u_height, v_position + vec2(0, px.y));
  float s = sampleCircle(u_height, v_position - vec2(0, px.y));
  float e = sampleCircle(u_height, v_position + vec2(px.x, 0));
  float w = sampleCircle(u_height, v_position - vec2(px.x, 0));
  // Solve discrete wave equation
  float laplacian = n + s + e + w - 4.0 * current_height;
  // Add a decay factor slightly less than 1 to dampen
  new_height = (1.0 - u_decay) * (u_alpha * laplacian + 2.0 * current_height - prev_height);
  new_height = circleMask(v_position) * new_height;
}
