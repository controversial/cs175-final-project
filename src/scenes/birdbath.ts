import birdBathVSS from '../shaders/birdbath_vert.glsl';
import birdBathFSS from '../shaders/birdbath_frag.glsl';
import { mat4 } from 'gl-matrix';
import { makeProgram } from '../shader';
import { WebIO } from '@gltf-transform/core';
import type { SceneContext } from '../renderer';

import { gl } from '../context';


const program = makeProgram(gl, birdBathVSS, birdBathFSS) as WebGLProgram;
const vertexBuffer = gl.createBuffer();
const indexBuffer = gl.createBuffer();

// data
const modelMatrix = mat4.create();

// uniform locations
const uModelMatrix = gl.getUniformLocation(program, 'u_modelMatrix');
const uViewMatrix = gl.getUniformLocation(program, 'u_viewMatrix');
const uProjectionMatrix = gl.getUniformLocation(program, 'u_projectionMatrix');
const uTime = gl.getUniformLocation(program, 'u_time');

// attribute locations
const aPosition = gl.getAttribLocation(program, 'a_position');
const aNormal = gl.getAttribLocation(program, 'a_normal');
const aTexcoord = gl.getAttribLocation(program, 'a_texcoord');

let indexCount: number | undefined;
const vao = gl.createVertexArray();
let loaded = false;

async function fetchBirdbath() {
  console.log('loading birdbath');
  const io = new WebIO({ credentials: 'include' });
  const doc = await io.read('/assets/birdbath.glb');
  console.log('loaded birdbath');
  // Get vertex data
  const mesh = doc.getRoot().listMeshes()[0];
  const primitive = mesh.listPrimitives()[0];
  const positionAccessor = primitive.getAttribute('POSITION');
  const normalAccessor = primitive.getAttribute('NORMAL');
  const texcoordAccessor = primitive.getAttribute('TEXCOORD_0');
  if (!positionAccessor || !normalAccessor || !texcoordAccessor) throw new Error('missing attributes in birdbath model');
  const positionData = positionAccessor.getArray();
  const normalData = normalAccessor.getArray();
  const texcoordData = texcoordAccessor.getArray();
  if (positionAccessor.getType() !== 'VEC3' || normalAccessor.getType() !== 'VEC3' || texcoordAccessor.getType() !== 'VEC2') throw new Error('unexpected attribute types in birdbath model');
  if (!positionData || !normalData || !texcoordData) throw new Error('could not get data for birdbath model');

  // Get indices
  const indexAccessor = primitive.getIndices();
  if (!indexAccessor) throw new Error('missing indices in birdbath model');
  const indexData = indexAccessor.getArray();
  if (!indexData) throw new Error('could not get data for birdbath indices');

  // Get textures (base color and normal map)
  const material = primitive.getMaterial();
  if (!material) throw new Error('missing material in birdbath model');
  const baseColorTexture = material.getBaseColorTexture();
  const normalTexture = material.getNormalTexture();
  if (!baseColorTexture || !normalTexture) throw new Error('missing textures in birdbath model');
  const baseColorTextureData = baseColorTexture.getImage();
  const normalTextureData = normalTexture.getImage();
  const baseColorTextureSize = baseColorTexture.getSize();
  const normalTextureSize = normalTexture.getSize();
  if (!baseColorTextureData || !normalTextureData || !baseColorTextureSize || !normalTextureSize) throw new Error('could not get data from birdbath textures');

  return {
    positionData,
    normalData,
    texcoordData,
    indexData,
    baseColorTexture: {
      data: baseColorTextureData,
      size: baseColorTextureSize,
    },
    normalTexture: {
      data: normalTextureData,
      size: normalTextureSize,
    },
    indexCount: indexData.length,
  };
}

function setupVAO(data: Awaited<ReturnType<typeof fetchBirdbath>>) {
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  gl.enableVertexAttribArray(aPosition);
  gl.enableVertexAttribArray(aNormal);
  gl.enableVertexAttribArray(aTexcoord);
  // 3 floats for position, 3 floats for normal, 2 floats for texcoord
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 8 * 4, 0 * 4);
  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 8 * 4, 3 * 4);
  gl.vertexAttribPointer(aTexcoord, 2, gl.FLOAT, false, 8 * 4, 6 * 4);

  if (data.positionData.length / 3 !== data.normalData.length / 3 || data.positionData.length / 3 !== data.texcoordData.length / 2) throw new Error('unexpected data length');

  // Pack positionData, normalData, textureData together
  const vertexData = new Float32Array(data.positionData.length + data.normalData.length + data.texcoordData.length);
  let positionIdx = 0;
  let normalIdx = 0;
  let texcoordIdx = 0;

  while (positionIdx < data.positionData.length) {
    // Add 3 elements from position array
    vertexData[positionIdx + normalIdx + texcoordIdx] = data.positionData[positionIdx];
    vertexData[positionIdx + 1 + normalIdx + texcoordIdx] = data.positionData[positionIdx + 1];
    vertexData[positionIdx + 2 + normalIdx + texcoordIdx] = data.positionData[positionIdx + 2];
    positionIdx += 3;
    // Add 3 elements from normal array
    vertexData[positionIdx + normalIdx + texcoordIdx] = data.normalData[normalIdx];
    vertexData[positionIdx + normalIdx + 1 + texcoordIdx] = data.normalData[normalIdx + 1];
    vertexData[positionIdx + normalIdx + 2 + texcoordIdx] = data.normalData[normalIdx + 2];
    normalIdx += 3;
    // Add 2 elements from texcoord array
    vertexData[positionIdx + normalIdx + texcoordIdx] = data.texcoordData[texcoordIdx];
    vertexData[positionIdx + normalIdx + texcoordIdx + 1] = data.texcoordData[texcoordIdx + 1];
    texcoordIdx += 2;
  }

  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  // Setup index buffer
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indexData, gl.STATIC_DRAW);
}

export async function loadBirdbath() {
  const data = await fetchBirdbath();
  setupVAO(data);
  indexCount = data.indexCount;
  console.log('vertex count', indexCount);
  loaded = true;
}


export function renderBirdbath(ctx: SceneContext) {
  if (!loaded) {
    console.warn('Birdbath not loaded yet');
    return;
  }

  gl.useProgram(program);
  gl.bindVertexArray(vao);

  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
  gl.uniformMatrix4fv(uViewMatrix, false, ctx.camera.viewMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, ctx.camera.projectionMatrix);
  gl.uniform1f(uTime, ctx.time);

  gl.drawElements(gl.TRIANGLES, indexCount ?? 0, gl.UNSIGNED_SHORT, 0);
}
