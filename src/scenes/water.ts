import waterVSS from '../shaders/water_vert.glsl';
import waterFSS from '../shaders/water_frag.glsl';
import { makeProgram } from '../shader';
import { WebIO } from '@gltf-transform/core';
import { gl } from '../context';
import type { SceneContext } from '../renderer';
import { worleyTexture as cloudNoiseTexture } from './worley';
import { vec2, vec3, mat4 } from 'gl-matrix';
import WaveSim from '../compute/waves';
import { bindSkyLookUpTextures, setSkyLookUpUniforms } from '../test/skyfunctions';

const program = makeProgram(gl, waterVSS, waterFSS) as WebGLProgram;

const skyTextures = bindSkyLookUpTextures(gl, program, gl.TEXTURE7, gl.TEXTURE8, gl.TEXTURE9);

const vao = gl.createVertexArray();
const vertexBuffer = gl.createBuffer();
const indexBuffer = gl.createBuffer();

// attribute locations
const aPosition = gl.getAttribLocation(program, 'a_position');
const aNormal = gl.getAttribLocation(program, 'a_normal');

// uniform locations
const uTime = gl.getUniformLocation(program, 'time');
const uModelMatrix = gl.getUniformLocation(program, 'model_matrix');
const uViewMatrix = gl.getUniformLocation(program, 'view_matrix');
const uProjectionMatrix = gl.getUniformLocation(program, 'projection_matrix');
const uEyePosition = gl.getUniformLocation(program, 'eye_position');
const uCloudNoiseTexture = gl.getUniformLocation(program, 'cloud_noise_texture');
const uSunDirection = gl.getUniformLocation(program, 'sun_direction');
const uSunIntensity = gl.getUniformLocation(program, 'sun_intensity');

const uRadius = gl.getUniformLocation(program, 'u_radius');
const uWaterHeight = gl.getUniformLocation(program, 'u_waterHeight');
const uWaterColor = gl.getUniformLocation(program, 'u_waterNormal');

const modelMatrix = mat4.create();
mat4.translate(modelMatrix, modelMatrix, [0, 2.9, 0]);

let indexCount: number | undefined;
let radius = 0;
let loaded = false;

const waves = new WaveSim();
// window.waves = waves;

async function fetchWater() {
  console.log('loading water');
  const io = new WebIO({ credentials: 'include' });
  const doc = await io.read('/assets/water-surface.glb');
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
    const x = data.positionData[positionIdx];
    const y = data.positionData[positionIdx + 1];
    const z = data.positionData[positionIdx + 2];
    vertexData[positionIdx + normalIdx] = x;
    vertexData[positionIdx + 1 + normalIdx] = y;
    vertexData[positionIdx + 2 + normalIdx] = z;
    positionIdx += 3;
    // Update best radius
    radius = Math.max(radius, x * x + z * z);
    // Add 3 elements from normal array
    vertexData[positionIdx + normalIdx] = data.normalData[normalIdx];
    vertexData[positionIdx + normalIdx + 1] = data.normalData[normalIdx + 1];
    vertexData[positionIdx + normalIdx + 2] = data.normalData[normalIdx + 2];
    normalIdx += 3;
  }
  radius = Math.sqrt(radius);

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


export function updateWaves(_: SceneContext, timeDelta: DOMHighResTimeStamp) {
  waves.step(Math.min(timeDelta / 1000, 1 / 30));
}


export function renderWater(ctx: SceneContext) {
  if (!loaded) {
    console.warn('Water not loaded yet');
    return;
  }

  gl.useProgram(program);
  gl.bindVertexArray(vao);

  setSkyLookUpUniforms(gl, program, skyTextures);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, cloudNoiseTexture);
  gl.uniform1i(uCloudNoiseTexture, 0);

  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
  gl.uniformMatrix4fv(uViewMatrix, false, ctx.camera.viewMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, ctx.camera.projectionMatrix);
  gl.uniform1f(uTime, ctx.time);
  gl.uniform3fv(uEyePosition, ctx.camera.eyePosition);
  gl.uniform3fv(uSunDirection, ctx.sunDirection ?? [0, 1, 0], 0, 3);
  gl.uniform1f(uSunIntensity, ctx.sunIntensity ?? 0.0);

  gl.uniform1f(uRadius, radius);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, waves.waterHeightTexture);
  gl.uniform1i(uWaterHeight, 1);

  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, waves.waterNormalTexture);
  gl.uniform1i(uWaterColor, 2);

  gl.drawElements(gl.TRIANGLES, indexCount ?? 0, gl.UNSIGNED_SHORT, 0);
}

export function waterHandleClick(ctx: SceneContext, event: MouseEvent) {
  const ray = ctx.camera.getRayFromScreenCoords(event.clientX, event.clientY);

  const inverseModelMatrix = mat4.create();
  mat4.invert(inverseModelMatrix, modelMatrix);
  const localRay = ray.transform(inverseModelMatrix);
  // Find intersection with XZ plane
  // ray.origin.y + ray.direction.y * t = 0  =>  t = -ray.origin.y / ray.direction.y
  const t = -localRay.origin[1] / localRay.direction[1];

  const intersection = vec3.create();
  vec3.scaleAndAdd(intersection, localRay.origin, localRay.direction, t);
  // Check if intersection is within radius
  const inRadius = (intersection[0] ** 2 + intersection[2] ** 2 <= (radius * 0.975) ** 2);

  if (t < 0 || !inRadius) {
    console.log('miss');
    return;
  }

  const coords = vec2.fromValues(intersection[0], intersection[2]);
  const uv = vec2.scaleAndAdd(vec2.create(), vec2.fromValues(0.5, 0.5), coords, (1 / radius) * 0.5);
  waves.addDrop(uv[0], uv[1], 0.1);
}
