#version 300 es

in vec3 a_position;
in vec3 a_normal;

uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

out vec3 v_position;
out vec3 v_normal;

void main() {
  v_position = (model_matrix * vec4(a_position, 1.0)).xyz;
  v_normal = a_normal;

  gl_Position = projection_matrix * view_matrix * vec4(v_position, 1.0);
}
