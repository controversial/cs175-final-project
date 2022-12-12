import birdBathVSS from '../shaders/birdbath_vert.glsl';
import birdBathFSS from '../shaders/birdbath_frag.glsl';
import { mat4 } from 'gl-matrix';
import { makeProgram } from '../shader';
import { gl } from '../context';

const program = makeProgram(gl, birdBathVSS, birdBathFSS) as WebGLProgram;
const vao = gl.createVertexArray();
const vertexBuffer = gl.createBuffer();
const indexBuffer = gl.createBuffer();

const vertices = new Float32Array([]);
const indices = new Uint16Array([]);

// data
const modelMatrix = mat4.create();

// uniforms
const uModelMatrix = gl.getUniformLocation(program, 'u_modelMatrix');
const uViewMatrix = gl.getUniformLocation(program, 'u_viewMatrix');
const uProjectionMatrix = gl.getUniformLocation(program, 'u_projectionMatrix');
const uTime = gl.getUniformLocation(program, 'u_time');

// attributes
const aPosition = gl.getAttribLocation(program, 'a_position');
const aNormal = gl.getAttribLocation(program, 'a_normal');
const aTexcoord = gl.getAttribLocation(program, 'a_texcoord');

gl.bindVertexArray(vao);

gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

gl.enableVertexAttribArray(aPosition);
gl.enableVertexAttribArray(aNormal);
gl.enableVertexAttribArray(aTexcoord);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 8 * 4, 0 * 4);
gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 8 * 4, 3 * 4);
gl.vertexAttribPointer(aTexcoord, 3, gl.FLOAT, false, 8 * 4, 6 * 4);

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

export function renderBirdbath(time: number, viewMatrix: mat4, projectionMatrix: mat4) {
  console.log('rendering birdbath');
  gl.useProgram(program);
  gl.bindVertexArray(vao);

  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
  gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
  gl.uniform1f(uTime, time);

  gl.drawArrays(gl.TRIANGLES, 0, vertices.length);
}
