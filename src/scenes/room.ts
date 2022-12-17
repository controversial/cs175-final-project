import { gl } from '../context';
import { mat4, vec3 } from 'gl-matrix';
import { makeProgram } from '../shader';
import basicVSS from '../shaders/basic_vert.glsl';
import basicFSS from '../shaders/basic_frag.glsl';
import * as shapes from '../shapes';
import type { SceneContext } from 'renderer';

const program = makeProgram(gl, basicVSS, basicFSS) as WebGLProgram;
const vao = gl.createVertexArray();

/*********************/
/*       DATA        */
/*********************/

// mash instance data into a single buffer
// color (vec3) -> model matrix (mat4)
function buildInstances(colors: vec3[], matrices: mat4[]) {
  if (colors.length != matrices.length) throw new Error('colors.length != matrices.length');

  const count = colors.length;
  const INSTANCE_STRIDE = 19;
  const instances = new Float32Array(count * INSTANCE_STRIDE);
  for (let i = 0; i < count; i++) {
    instances.set(colors[i], i * INSTANCE_STRIDE + 0);
    instances.set(matrices[i], i * INSTANCE_STRIDE + 3);
  }
  return instances;
}

const N_CUBES = 1;
const N_INV_CUBES = 1;

const pedestal = mat4.create();
mat4.translate(pedestal, pedestal, [0, -2, 0]);
mat4.scale(pedestal, pedestal, [1, 2, 1]);

const roomInterior = mat4.create();
mat4.fromScaling(roomInterior, [7, 7, 7]);

const cubeInstances = buildInstances([[0, 0, 1]], [pedestal]);
const invertedCubeInstances = buildInstances([[1, 0, 0]], [roomInterior]);

const vertices = shapes.vertices;
const indices = shapes.indices;

/*********************/
/*      BUFFERS      */
/*********************/

const vertexBuffer = gl.createBuffer();
const indexBuffer = gl.createBuffer();
const instanceBuffer = gl.createBuffer();

/*********************/
/*     UNIFORMS      */
/*********************/

const uViewMatrix = gl.getUniformLocation(program, 'u_viewMatrix');
const uProjectionMatrix = gl.getUniformLocation(program, 'u_projectionMatrix');
const uTime = gl.getUniformLocation(program, 'u_time');

/*********************/
/*      ATTRIBS      */
/*********************/

const aPosition = gl.getAttribLocation(program, 'a_position');
const aNormal = gl.getAttribLocation(program, 'a_normal');
const aTexcoord = gl.getAttribLocation(program, 'a_texcoord');
const aColor = gl.getAttribLocation(program, 'a_color');
const aModelMatrix = gl.getAttribLocation(program, 'a_modelMatrix');

gl.bindVertexArray(vao);

// vertex attributes
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(aPosition);
gl.enableVertexAttribArray(aNormal);
gl.enableVertexAttribArray(aTexcoord);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 8 * 4, 0);
gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 8 * 4, 3 * 4);
gl.vertexAttribPointer(aTexcoord, 2, gl.FLOAT, false, 8 * 4, 6 * 4);

// instance attributes
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
// gl.bufferData(gl.ARRAY_BUFFER, invertedCubeInstances, gl.DYNAMIC_DRAW);

gl.enableVertexAttribArray(aColor);
gl.enableVertexAttribArray(aModelMatrix + 0);
gl.enableVertexAttribArray(aModelMatrix + 1);
gl.enableVertexAttribArray(aModelMatrix + 2);
gl.enableVertexAttribArray(aModelMatrix + 3);

gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 19 * 4, 0);
gl.vertexAttribPointer(aModelMatrix + 0, 4, gl.FLOAT, false, 19 * 4, (3 + 0) * 4);
gl.vertexAttribPointer(aModelMatrix + 1, 4, gl.FLOAT, false, 19 * 4, (3 + 4) * 4);
gl.vertexAttribPointer(aModelMatrix + 2, 4, gl.FLOAT, false, 19 * 4, (3 + 8) * 4);
gl.vertexAttribPointer(aModelMatrix + 3, 4, gl.FLOAT, false, 19 * 4, (3 + 12) * 4);

gl.vertexAttribDivisor(aColor, 1);
gl.vertexAttribDivisor(aModelMatrix + 0, 1);
gl.vertexAttribDivisor(aModelMatrix + 1, 1);
gl.vertexAttribDivisor(aModelMatrix + 2, 1);
gl.vertexAttribDivisor(aModelMatrix + 3, 1);

// indices
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

export function renderRoom(ctx: SceneContext) {
  gl.useProgram(program);

  gl.bindVertexArray(vao);
  gl.uniform1f(uTime, ctx.time * 0.001);
  gl.uniformMatrix4fv(uViewMatrix, false, ctx.camera.viewMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, ctx.camera.projectionMatrix);

  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, invertedCubeInstances, gl.DYNAMIC_DRAW);
  gl.drawElementsInstanced(gl.TRIANGLES, shapes.invertedCube.count, gl.UNSIGNED_SHORT, shapes.invertedCube.offset, N_INV_CUBES);

  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeInstances, gl.DYNAMIC_DRAW);

  gl.drawElementsInstanced(gl.TRIANGLES, shapes.cube.count, gl.UNSIGNED_SHORT, shapes.cube.offset, N_CUBES);
}
