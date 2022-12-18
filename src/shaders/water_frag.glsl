#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform vec3 u_lightPosition;
uniform vec3 u_eyePosition;
uniform sampler2D u_reflectionTexture;

in float should_draw;
in vec3 v_position;
in vec3 v_normal;

out vec4 outColor;

void main() {
  if (should_draw > 0.0) {
    discard;
  }

  vec3 incident_direction = normalize(v_position - u_eyePosition);
  vec3 reflected_direction = reflect(incident_direction, v_normal);

  // We need to do something with angles...?
  //float u = atan(reflected_direction.y, reflected_direction.x);
  //float v = atan(reflected_direction.z, reflected_direction.y);


  vec3 tex_color = texture(u_reflectionTexture, (v_position.xz + 0.9) * 0.5).xyz;
  //vec3 tex_color = texture(u_reflectionTexture, vec2(u, v)).xyz;

  outColor = vec4(tex_color, 0.3);
}