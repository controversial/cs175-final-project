import { gl } from '../context';

import { SceneContext } from '../renderer';
import { makeProgram } from '../shader';

import groundVSS from '../shaders/ground_vert.glsl';
import groundFSS from '../shaders/ground_frag.glsl';

const vao = gl.createVertexArray();
const vbo = gl.createBuffer();

const program = makeProgram(gl, groundVSS, groundFSS) as WebGLProgram;
const uniformLocationViewMatrix = gl.getUniformLocation(program, 'view_matrix');
const uniformLocationProjectionMatrix = gl.getUniformLocation(program, 'projection_matrix');

export function setupGround() {
  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  const vertices = new Float32Array([
    -0.5, 0.0, -0.5, 1.0,
    0.5, 0.0, 0.5, 1.0,
    0.5, 0.0, -0.5, 1.0,

    -0.5, 0.0, -0.5, 1.0,
    -0.5, 0.0, 0.5, 1.0,
    0.5, 0.0, 0.5, 1.0,
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
}


export function renderGround(ctx: SceneContext) {
  console.log('rendering ground');
  gl.useProgram(program);
  gl.uniformMatrix4fv(uniformLocationViewMatrix, false, ctx.camera.viewMatrix);
  gl.uniformMatrix4fv(uniformLocationProjectionMatrix, false, ctx.camera.projectionMatrix);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

