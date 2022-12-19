#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D u_height;
uniform sampler2D u_normalMap;

in vec2 v_position;

out vec4 fragColor;

void main() {
  vec2 samplePos = vec2(fract(v_position.x * 2.0), v_position.y);

  float height = texture(u_height, samplePos).x;
  vec3 normal = texture(u_normalMap, samplePos).xyz;

  float which = floor(v_position.x * 2.0);

  vec3 color = mix(vec3(height + 0.5), vec3(normal * 10.0 + 0.5), which);
  fragColor = vec4(color, 1.0);

  fragColor.rgb *= smoothstep(0.5, 0.495, length(samplePos - vec2(0.5, 0.5)));
}
