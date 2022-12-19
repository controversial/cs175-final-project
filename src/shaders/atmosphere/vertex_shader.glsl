#version 300 es

uniform mat4 model_from_view;
uniform mat4 view_from_clip;
in vec4 vertex;
out vec3 view_ray;
void main() {
    mat3 rotate_90_x = mat3(
      1.0,  0.0, 0.0,
      0.0,  0.0, 1.0,
      0.0, -1.0, 0.0
    );
    view_ray = (model_from_view * vec4(rotate_90_x * (view_from_clip * vertex).xyz, 0.0)).xyz;
    gl_Position = vertex;
    view_ray = (model_from_view * vec4((view_from_clip * vertex).xyz, 0)).xyz;
}
