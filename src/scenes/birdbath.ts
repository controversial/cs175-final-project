import birdBathVSS from '../shaders/birdbath_vert.glsl';
import birdBathFSS from '../shaders/birdbath_frag.glsl';
import { mat4 } from 'gl-matrix';
import { makeProgram } from '../shader';
import { gl } from '../context';
import { WebIO } from '@gltf-transform/core';

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

export async function loadBirdbath() {
  console.log('loading birdbath');
  const io = new WebIO({ credentials: 'include' });
  const doc = await io.read('/assets/birdbath.glb');
  console.log('loaded birdbath', doc);
  // Get vertex data
  const mesh = doc.getRoot().listMeshes()[0];
  const primitive = mesh.listPrimitives()[0];
  const positionAccessor = primitive.getAttribute('POSITION');
  const normalAccessor = primitive.getAttribute('NORMAL');
  const texcoordAccessor = primitive.getAttribute('TEXCOORD_0');
  if (!positionAccessor || !normalAccessor || !texcoordAccessor) throw new Error('missing attributes in birdbath model');
  const positionData = positionAccessor.getArray();
  const normalData = normalAccessor.getArray();
  const textureData = texcoordAccessor.getBuffer();
  if (!positionData || !normalData || !textureData) throw new Error('could not get data for birdbath model');

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
    textureData,
    baseColorTexture: {
      data: baseColorTextureData,
      size: baseColorTextureSize,
    },
    normalTexture: {
      data: normalTextureData,
      size: normalTextureSize,
    },
  };
}

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
