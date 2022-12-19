import waterVSS from '../shaders/water_vert.glsl';
import waterFSS from '../shaders/water_frag.glsl';
import { makeProgram } from '../shader';
import { WebIO } from '@gltf-transform/core';
import { gl } from '../context';
import type { SceneContext } from '../renderer';
import { makeWorleyTexture } from './worley';

const cloudNoiseTexture = makeWorleyTexture(gl, 64);

const program = makeProgram(gl, waterVSS, waterFSS) as WebGLProgram;

const vao = gl.createVertexArray();
const vertexBuffer = gl.createBuffer();
const indexBuffer = gl.createBuffer();

// attribute locations
const aPosition = gl.getAttribLocation(program, 'a_position');
const aNormal = gl.getAttribLocation(program, 'a_normal');

// uniform locations
const uTime = gl.getUniformLocation(program, 'time');
const uViewMatrix = gl.getUniformLocation(program, 'view_matrix');
const uProjectionMatrix = gl.getUniformLocation(program, 'projection_matrix');
const uEyePosition = gl.getUniformLocation(program, 'eye_position');
const uniformLocationCloudNoiseTexture = gl.getUniformLocation(program, 'cloud_noise_texture');

let indexCount: number | undefined;
let loaded = false;

async function fetchWater() {
  console.log('loading water');
  const io = new WebIO({ credentials: 'include' });
  const doc = await io.read('/assets/water.glb');
  console.log('loaded water');
  // Get vertex data
  const mesh = doc.getRoot().listMeshes()[0];
  const primitive = mesh.listPrimitives()[0];
  const positionAccessor = primitive.getAttribute('POSITION');
  const normalAccessor = primitive.getAttribute('NORMAL');
  if (!positionAccessor || !normalAccessor) throw new Error('missing attributes in water model');
  const positionData = positionAccessor.getArray();
  const normalData = normalAccessor.getArray();
  if (positionAccessor.getType() !== 'VEC3' || normalAccessor.getType() !== 'VEC3') throw new Error('unexpected attribute types in water model');
  if (!positionData || !normalData) throw new Error('could not get data for water model');

  // Get indices
  const indexAccessor = primitive.getIndices();
  if (!indexAccessor) throw new Error('missing indices in water model');
  const indexData = indexAccessor.getArray();
  if (!indexData) throw new Error('could not get data for water indices');

  return {
    positionData,
    normalData,
    indexData,
    indexCount: indexData.length,
  };
}

function setupVAO(data: Awaited<ReturnType<typeof fetchWater>>) {
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  gl.enableVertexAttribArray(aPosition);
  gl.enableVertexAttribArray(aNormal);
  // 3 floats for position, 3 floats for normal, 2 floats for texcoord
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 6 * 4, 0 * 4);
  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 6 * 4, 3 * 4);

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
    vertexData[positionIdx + normalIdx] = data.normalData[normalIdx + 1];
    vertexData[positionIdx + normalIdx] = data.normalData[normalIdx + 2];
    normalIdx += 3;
  }

  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  // Setup index buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indexData, gl.STATIC_DRAW);
}

export async function loadWater() {
  const data = await fetchWater();
  setupVAO(data);
  indexCount = data.indexCount;
  console.log('vertex count', indexCount);
  loaded = true;
}

export function renderWater(ctx: SceneContext) {
  if (!loaded) {
    console.warn('Water not loaded yet');
    return;
  }

  gl.useProgram(program);
  gl.bindVertexArray(vao);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, cloudNoiseTexture);
  gl.uniform1i(uniformLocationCloudNoiseTexture, 0);

  gl.uniformMatrix4fv(uViewMatrix, false, ctx.camera.viewMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, ctx.camera.projectionMatrix);
  gl.uniform1f(uTime, ctx.time);
  gl.uniform3fv(uEyePosition, ctx.camera.eyePosition);

  gl.drawElements(gl.TRIANGLES, indexCount ?? 0, gl.UNSIGNED_SHORT, 0);
}
