#version 300 es

in vec3 a_position;
in vec3 a_normal;

uniform mat4 view_matrix;
uniform mat4 projection_matrix;

out float should_draw;
out vec3 v_position;
out vec3 v_normal;

void main() {
  should_draw = length(a_position.xz) > 1.0 ? 1.0 : 0.0;

  v_position = a_position + vec3(0, 2.9, 0);
  v_normal = a_normal;

  gl_Position = projection_matrix * view_matrix * vec4(v_position, 1.0);
}
