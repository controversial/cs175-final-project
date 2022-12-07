#version 300 es

precision mediump sampler3D;
precision highp float;

out vec4 frag_color;

uniform float z;
uniform float tile;
uniform vec2 resolution;
uniform sampler3D tex;

void main() {

    vec3 uvw = vec3(gl_FragCoord.xy / resolution, z) * tile;
    frag_color = texture(tex, uvw);
}

