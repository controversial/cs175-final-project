#version 300 es

in vec4 a_position;
in vec3 a_normal;
in vec2 a_texcoord;
in vec4 a_color;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec3 u_lightPos;

out vec3 v_normal;
out vec2 v_texcoord;
out vec4 v_color;

void main() {
  mat4 modelView = u_viewMatrix * u_modelMatrix;
  gl_Position = u_projectionMatrix * modelView * a_position;
  v_normal = normalize((u_modelMatrix * vec4(a_normal, 0)).xyz);
  v_texcoord = a_texcoord;
  v_color = a_color;
}
