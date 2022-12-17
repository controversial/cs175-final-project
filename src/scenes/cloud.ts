import cloudVSS from '../shaders/screenquad_vert.glsl';
import cloudFSS from '../shaders/cloud_frag.glsl';
import type { SceneContext } from 'renderer';
import { makeProgram } from '../shader';
import { makeWorleyTexture } from './worley';
import { loadTexture } from '../texture';

import { gl } from '../context';

const cloudNoiseTexture = makeWorleyTexture(64);
const blueNoiseTexture = loadTexture('../../blue_noise_256.png');

const program = makeProgram(gl, cloudVSS, cloudFSS) as WebGLProgram;
const vao = gl.createVertexArray();
const vertexBuffer = gl.createBuffer();

const vertices = new Float32Array([
  -1, -1,    1, -1,    1, 1,
  -1, -1,    1,  1,   -1, 1,
]);

// uniforms
const uTime = gl.getUniformLocation(program, 'u_time');
const uScreenWidth = gl.getUniformLocation(program, 'u_screenWidth');
const uScreenHeight = gl.getUniformLocation(program, 'u_screenHeight');
const uAspectRatio = gl.getUniformLocation(program, 'u_aspectRatio');
const uFieldOfView = gl.getUniformLocation(program, 'u_fieldOfView');
const uEyePoint = gl.getUniformLocation(program, 'u_eyePoint');
const uLookVector = gl.getUniformLocation(program, 'u_lookVector');

const locCloudNoiseTexture = gl.getUniformLocation(program, 'cloud_noise_texture');
const locBlueNoiseTexture = gl.getUniformLocation(program, 'blue_noise_texture');

// attributes
const aPosition = gl.getAttribLocation(program, 'a_position');

gl.bindVertexArray(vao);

gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

export function renderClouds(ctx: SceneContext) {
  console.log('rendering clouds');
  gl.useProgram(program);
  gl.bindVertexArray(vao);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, cloudNoiseTexture);
  gl.uniform1i(locCloudNoiseTexture, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, blueNoiseTexture);
  gl.uniform1i(locBlueNoiseTexture, 1);

  gl.uniform1f(uTime, ctx.time);
  gl.uniform1f(uScreenWidth, ctx.size[0]);
  gl.uniform1f(uScreenHeight, ctx.size[1]);
  gl.uniform1f(uAspectRatio, ctx.size[0] / ctx.size[1]);
  gl.uniform1f(uFieldOfView, ctx.camera.fieldOfView);
  gl.uniform3fv(uEyePoint, ctx.camera.eyePosition, 0, 3);
  gl.uniform3fv(uLookVector, ctx.camera.lookVector, 0, 3);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

