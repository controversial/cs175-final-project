#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D u_height;
uniform sampler2D u_prevHeight;

in vec2 v_position;

out vec4 fragColor;

void main() {
  vec2 samplePos = vec2(fract(v_position.x * 2.0), v_position.y);

  float a = texture(u_prevHeight, samplePos).x;
  float b = texture(u_height, samplePos).x;

  float which = floor(v_position.x * 2.0);
  float val = mix(a, b, which) + 0.5;

  fragColor = vec4(val, val, val, 1.0);

  fragColor.rgb *= smoothstep(0.5, 0.495, length(samplePos - vec2(0.5, 0.5)));
}
