#version 300 es

uniform mat4 view_matrix;
uniform mat4 projection_matrix;

in vec4 a_position;

out vec2 v_position;

void main() 
{
  gl_Position = projection_matrix * view_matrix * vec4(a_position.xyz * 200.0, 1.0);
  v_position = a_position.xy;
}