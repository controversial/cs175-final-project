#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform float u_time;
uniform sampler2D u_colorTexture;
uniform sampler2D u_normalTexture;
uniform vec3 u_lightPosition;

in vec3 v_position; // world-space
in vec4 v_color;
in vec3 v_normal;
in vec2 v_texcoord;

out vec4 outColor;

void main() {

  vec3 normal = v_normal + texture(u_normalTexture, v_texcoord).rgb * 2.0 - 1.0;

  vec3 light_direction = normalize(u_lightPosition - v_position);

  float diffuse = clamp(dot(normal, light_direction), 0.0, 1.0);

  outColor = vec4(texture(u_colorTexture, v_texcoord).rgb * diffuse, 1.0);
}