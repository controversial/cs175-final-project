#version 300 es
precision mediump float;
precision mediump sampler2D;

uniform vec3 u_lightPosition;
uniform vec3 u_eyePosition;
uniform sampler2D u_reflectionTexture;
uniform float u_screenWidth;
uniform float u_screenHeight;

in float should_draw;
in vec3 v_position;
in vec3 v_normal;

out vec4 outColor;

void main() {
  if (should_draw > 0.0) {
    discard;
  }

  vec2 uv = vec2(gl_FragCoord.x / u_screenWidth, -gl_FragCoord.y / u_screenHeight);
  vec3 tex_color = texture(u_reflectionTexture, uv).xyz;

  outColor = vec4(tex_color, 0.2);
}