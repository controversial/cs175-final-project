#version 300 es

in vec3 a_position;
in vec3 a_normal;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform float u_time;

out float should_draw;
out vec3 v_position;
out vec3 v_normal;

void main() {

  v_position = a_position + vec3(0, 2.9, 0);

  should_draw = length(v_position.xz) > 1.0 ? 1.0 : 0.0;

  gl_Position = u_projectionMatrix * u_viewMatrix * vec4(v_position, 1.0);
  
  v_position = a_position;
  v_normal =  a_normal;
}
