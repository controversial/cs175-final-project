import { gl } from '../context';
import screenQuadVSS from '../shaders/screenquad_vert.glsl';
import skyFragFSS from '../shaders/atmosphere/atmosphere_frag.glsl';
import { makeProgram } from '../shader';
import { vec3 } from 'gl-matrix';

const program = makeProgram(gl, screenQuadVSS, skyFragFSS) as WebGLProgram;
const vao = gl.createVertexArray() as WebGLVertexArrayObject;

const vertices = new Float32Array([
  -1, -1,    1, -1,    1, 1,
  -1, -1,    1,  1,   -1, 1,
]);

const vertexBuffer = gl.createBuffer() as WebGLBuffer;

const aPosition = gl.getAttribLocation(program, 'a_position');
const uTime = gl.getUniformLocation(program, 'u_time');
const uSunPos = gl.getUniformLocation(program, 'u_sunPos');
const uLookVector = gl.getUniformLocation(program, 'u_lookVector');
const sunPos = vec3.fromValues(3e10, 1e12, 1e11);

gl.bindVertexArray(vao);

gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

export function renderSkyQuad(time: number, lookVector: vec3) {
  gl.useProgram(program);
  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.uniform1f(uTime, time);
  gl.uniform3fv(uSunPos, sunPos);
  gl.uniform3fv(uLookVector, lookVector);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
