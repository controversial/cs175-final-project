#version 300 es

in vec4 a_position;
in vec3 a_normal;
in vec2 a_texcoord;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

out vec3 v_position;
out vec3 v_normal;
out vec2 v_texcoord;

void main() {
  mat4 modelView = u_viewMatrix * u_modelMatrix;
  gl_Position = u_projectionMatrix * modelView * a_position;
  
  v_position = (u_modelMatrix * a_position).xyz;
  v_normal = normalize((u_modelMatrix * vec4(a_normal, 0)).xyz);
  v_texcoord = a_texcoord;
}
