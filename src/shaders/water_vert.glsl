#version 300 es

precision mediump float;

in vec3 a_position;
in vec3 a_normal;

uniform mat4 model_matrix;
uniform mat4 view_matrix;
uniform mat4 projection_matrix;

uniform float u_radius;
uniform sampler2D u_waterHeight;
uniform sampler2D u_waterNormal;

out vec3 v_position;
out vec3 v_normal;

out vec3 v_tangent;
out vec3 v_bitangent;

out vec2 v_uv;

void main() {
  v_position = (model_matrix * vec4(a_position, 1.0)).xyz;
  v_uv = (v_position.xz / u_radius) * 0.5 + 0.5;
  v_position.y += texture(u_waterHeight, v_uv).r * 0.2;

  v_normal = normalize(a_normal);
  v_tangent = vec3(1.0, 0.0, 0.0);
  v_bitangent = cross(v_normal, v_tangent);

  gl_Position = projection_matrix * view_matrix * vec4(v_position, 1.0);
}
