import { gl } from '../context';

import { SceneContext } from '../renderer';
import { makeProgram } from '../shader';

import groundVSS from '../shaders/ground_vert.glsl';
import groundFSS from '../shaders/ground_frag.glsl';
import { loadTextureRgb } from '../texture';

import { WebIO } from '@gltf-transform/core';

const vao = gl.createVertexArray();
const vertexBuffer = gl.createBuffer();
const indexBuffer = gl.createBuffer();

const program = makeProgram(gl, groundVSS, groundFSS) as WebGLProgram;
const uniformLocationViewMatrix = gl.getUniformLocation(program, 'view_matrix');
const uniformLocationProjectionMatrix = gl.getUniformLocation(program, 'projection_matrix');
const uniformLocationGrassTexture = gl.getUniformLocation(program, 'grass_texture');
const uniformLocationSunDirection = gl.getUniformLocation(program, 'sun_direction');
const uniformLocationSunIntensity = gl.getUniformLocation(program, 'sun_intensity');

const grassTexture = loadTextureRgb(gl, '/grass.jpg');

let indexCount: number | undefined;
let loaded = false;

async function fetchGround() {
  console.log('loading ground');
  const io = new WebIO({ credentials: 'include' });
  const doc = await io.read('/assets/ground.glb');
  console.log('loaded ground');
  // Get vertex data
  const mesh = doc.getRoot().listMeshes()[0];
  const primitive = mesh.listPrimitives()[0];
  const positionAccessor = primitive.getAttribute('POSITION');
  const normalAccessor = primitive.getAttribute('NORMAL');
  if (!positionAccessor || !normalAccessor) throw new Error('missing attributes in ground model');
  const positionData = positionAccessor.getArray();
  const normalData = normalAccessor.getArray();
  if (positionAccessor.getType() !== 'VEC3' || normalAccessor.getType() !== 'VEC3') throw new Error('unexpected attribute types in ground model');
  if (!positionData || !normalData) throw new Error('could not get data for ground model');

  // Get indices
  const indexAccessor = primitive.getIndices();
  if (!indexAccessor) throw new Error('missing indices in ground model');
  const indexData = indexAccessor.getArray();
  if (!indexData) throw new Error('could not get data for ground indices');

  return {
    positionData,
    normalData,
    indexData,
    indexCount: indexData.length,
  };
}

function setupVAO(data: Awaited<ReturnType<typeof fetchGround>>) {
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  // 3 floats for position, 3 floats for normal, 2 floats for texcoord
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 6 * 4, 0 * 4);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 6 * 4, 3 * 4);

  if (data.positionData.length / 3 !== data.normalData.length / 3) throw new Error('unexpected data length');

  // Pack positionData, normalData, textureData together
  const vertexData = new Float32Array(data.positionData.length + data.normalData.length);
  let positionIdx = 0;
  let normalIdx = 0;

  while (positionIdx < data.positionData.length) {
    // Add 3 elements from position array
    vertexData[positionIdx + normalIdx] = data.positionData[positionIdx];
    vertexData[positionIdx + 1 + normalIdx] = data.positionData[positionIdx + 1];
    vertexData[positionIdx + 2 + normalIdx] = data.positionData[positionIdx + 2];
    positionIdx += 3;
    // Add 3 elements from normal array
    vertexData[positionIdx + normalIdx] = data.normalData[normalIdx];
    vertexData[positionIdx + normalIdx + 1] = data.normalData[normalIdx + 1];
    vertexData[positionIdx + normalIdx + 2] = data.normalData[normalIdx + 2];
    normalIdx += 3;
  }

  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  // Setup index buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indexData, gl.STATIC_DRAW);
}

export async function loadGround() {
  const data = await fetchGround();
  setupVAO(data);
  indexCount = data.indexCount;
  console.log('vertex count', indexCount);
  loaded = true;
}


export function renderGround(ctx: SceneContext) {
  if (!loaded) {
    console.warn('Ground not loaded yet');
    return;
  }

  console.log('rendering ground');
  gl.useProgram(program);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, grassTexture);
  gl.uniform1i(uniformLocationGrassTexture, 0);

  gl.uniform1f(uniformLocationSunIntensity, ctx.sunIntensity ?? 0.0);
  gl.uniform3fv(uniformLocationSunDirection, ctx.sunDirection ?? [0, 1, 0], 0, 3);
  gl.uniformMatrix4fv(uniformLocationViewMatrix, false, ctx.camera.viewMatrix);
  gl.uniformMatrix4fv(uniformLocationProjectionMatrix, false, ctx.camera.projectionMatrix);

  gl.bindVertexArray(vao);
  gl.drawElements(gl.TRIANGLES, indexCount ?? 0, gl.UNSIGNED_SHORT, 0);
}

