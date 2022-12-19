#version 300 es

precision mediump float;
precision mediump sampler2D;
precision mediump sampler3D;

in vec3 v_position;
in vec3 v_normal;

uniform sampler2D grass_texture;

uniform float sun_intensity;
uniform vec3 sun_direction;

out vec4 out_color;

void main()
{
  float diffuse = clamp(dot(v_normal, sun_direction), 0.0, 1.0);

  vec4 tex_color = texture(grass_texture, v_position.xz);

  vec3 sun_color = mix(vec3(.96, .55, .15), vec3(1.0, 1.0, 1.0), sun_intensity) * sun_intensity;

  out_color = vec4(tex_color.rgb * diffuse * sun_color, 1.0);
}