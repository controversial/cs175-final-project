import cloudVertexShaderSource from '../shaders/screenquad_vert.glsl';
import cloudFragmentShaderSource from '../shaders/cloud_frag.glsl';
import { makeProgram } from '../shader';
import { worleyTexture as cloudNoiseTexture } from './worley';
import { loadTextureNoMipmaps } from '../texture';

import { gl } from '../context';
import { SceneContext } from 'renderer';
import { vec3 } from 'gl-matrix';

import { bindSkyLookUpTextures, setSkyLookUpUniforms } from '../skyfunctions';

const blueNoiseTexture = loadTextureNoMipmaps(gl, '../../blue_noise_256.png');

// Setup cloud shader program
const program = makeProgram(gl, cloudVertexShaderSource, cloudFragmentShaderSource) as WebGLProgram;
const uniformLocationTime = gl.getUniformLocation(program, 'time');
const uniformLocationScreenWidth = gl.getUniformLocation(program, 'screen_width');
const uniformLocationScreenHeight = gl.getUniformLocation(program, 'screen_height');
const uniformLocationAspectRatio = gl.getUniformLocation(program, 'aspect_ratio');
const uniformLocationFieldOfView = gl.getUniformLocation(program, 'field_of_view');
const uniformLocationEyePosition = gl.getUniformLocation(program, 'eye_position');
const uniformLocationLookDirection = gl.getUniformLocation(program, 'look_direction');
const uniformLocationSunDirection = gl.getUniformLocation(program, 'sun_direction');
const uniformLocationSunIntensity = gl.getUniformLocation(program, 'sun_intensity');
const uniformLocationCloudNoiseTexture = gl.getUniformLocation(program, 'cloud_noise_texture');
const uniformLocationBlueNoiseTexture = gl.getUniformLocation(program, 'blue_noise_texture');

// Sky
const skyTextures = bindSkyLookUpTextures(gl, program, gl.TEXTURE7, gl.TEXTURE8, gl.TEXTURE9);


// Setup buffers
const vao = gl.createVertexArray() as WebGLVertexArrayObject;
const vbo = gl.createBuffer() as WebGLBuffer;
const vertices = new Float32Array([
  -1, -1,    1, -1,    1, 1,
  -1, -1,    1,  1,   -1, 1,
]);
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

export function renderClouds(time: number, width: number, height: number, aspectRatio: number, fieldOfView: number, eyePosition: vec3, lookDirection: vec3, sunDirection: vec3, sunIntensity: number) {
  // console.log('rendering clouds');

  gl.useProgram(program);
  gl.bindVertexArray(vao);

  setSkyLookUpUniforms(gl, program, skyTextures);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, cloudNoiseTexture);
  gl.uniform1i(uniformLocationCloudNoiseTexture, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, blueNoiseTexture);
  gl.uniform1i(uniformLocationBlueNoiseTexture, 1);

  gl.uniform1f(uniformLocationTime, time);
  gl.uniform1f(uniformLocationScreenWidth, width);
  gl.uniform1f(uniformLocationScreenHeight, height);
  gl.uniform1f(uniformLocationAspectRatio, aspectRatio);
  gl.uniform1f(uniformLocationFieldOfView, fieldOfView);
  gl.uniform3fv(uniformLocationEyePosition, eyePosition, 0, 3);
  gl.uniform3fv(uniformLocationLookDirection, lookDirection, 0, 3);
  gl.uniform3fv(uniformLocationSunDirection, sunDirection, 0, 3);
  gl.uniform1f(uniformLocationSunIntensity, sunIntensity);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

export function renderCloudsWithContext(ctx: SceneContext) {
  renderClouds(ctx.time, ctx.size[0], ctx.size[1], ctx.camera.aspect, ctx.camera.fieldOfView, ctx.camera.eyePosition, ctx.camera.lookVector, ctx.sunDirection ?? [0, 1, 0], ctx.sunIntensity ?? 0);
}
