import cloudVertexShaderSource from '../shaders/screenquad_vert.glsl';
import cloudFragmentShaderSource from '../shaders/cloud_frag.glsl';
import { vec3 } from 'gl-matrix';
import { makeProgram } from '../shader';
import { makeWorleyTexture } from './worley';
import { loadTexture } from '../texture';

import { gl } from '../context';
import { SceneContext } from 'renderer';

const cloudNoiseTexture = makeWorleyTexture(gl, 64);
const blueNoiseTexture = loadTexture(gl, '../../blue_noise_256.png');

// Setup cloud shader program
const program = makeProgram(gl, cloudVertexShaderSource, cloudFragmentShaderSource) as WebGLProgram;
const uniformLocationTime = gl.getUniformLocation(program, 'time');
const uniformLocationScreenWidth = gl.getUniformLocation(program, 'screen_width');
const uniformLocationScreenHeight = gl.getUniformLocation(program, 'screen_height');
const uniformLocationAspectRatio = gl.getUniformLocation(program, 'aspect_ratio');
const uniformLocationFieldOfView = gl.getUniformLocation(program, 'field_of_view');
const uniformLocationEyePosition = gl.getUniformLocation(program, 'eye_position');
const uniformLocationLookDirection = gl.getUniformLocation(program, 'look_direction');
const uniformLocationCloudNoiseTexture = gl.getUniformLocation(program, 'cloud_noise_texture');
const uniformLocationBlueNoiseTexture = gl.getUniformLocation(program, 'blue_noise_texture');

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

export function renderClouds(ctx: SceneContext) {
  console.log('rendering clouds');

  gl.useProgram(program);
  gl.bindVertexArray(vao);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, cloudNoiseTexture);
  gl.uniform1i(uniformLocationCloudNoiseTexture, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, blueNoiseTexture);
  gl.uniform1i(uniformLocationBlueNoiseTexture, 1);

  gl.uniform1f(uniformLocationTime, ctx.time);
  gl.uniform1f(uniformLocationScreenWidth, ctx.size[0]);
  gl.uniform1f(uniformLocationScreenHeight, ctx.size[1]);
  gl.uniform1f(uniformLocationAspectRatio, ctx.camera.aspect);
  gl.uniform1f(uniformLocationFieldOfView, ctx.camera.fieldOfView);
  gl.uniform3fv(uniformLocationEyePosition, ctx.camera.eyePosition, 0, 3);
  gl.uniform3fv(uniformLocationLookDirection, ctx.camera.lookVector, 0, 3);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

