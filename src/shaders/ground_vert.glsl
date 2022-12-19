#version 300 es

precision mediump sampler3D;

uniform mat4 view_matrix;
uniform mat4 projection_matrix;

uniform sampler3D noise_texture;

in vec3 a_position;
in vec3 a_normal;

out vec3 v_position;
out vec3 v_normal;

void main() 
{
  v_normal = a_normal.xyz;
  v_position = vec3(a_position.x * 200.0, a_position.y * 200.0 - 0.08, a_position.z * 200.0);
  gl_Position = projection_matrix * view_matrix * vec4(v_position, 1.0);
}