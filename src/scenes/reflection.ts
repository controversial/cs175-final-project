import { SceneContext } from '../renderer';
import { gl } from '../context';
import { renderClouds } from './cloud';
import { vec3 } from 'gl-matrix';

export const reflectionTexture = gl.createTexture();
const size = 256;

const framebuffer = gl.createFramebuffer();

function setupTexture() {
  gl.bindTexture(gl.TEXTURE_2D, reflectionTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    size,
    size,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, reflectionTexture, 0);
}
setupTexture();

export function renderReflectionTexture(ctx: SceneContext) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.viewport(0, 0, size, size);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const eyePosition: vec3 = [
    ctx.camera.eyePosition[0],
    -(ctx.camera.eyePosition[1] - 2.8),
    ctx.camera.eyePosition[2],
  ];

  const lookDirection: vec3 = [
    ctx.camera.lookVector[0],
    -ctx.camera.lookVector[1],
    ctx.camera.lookVector[2],
  ];

  renderClouds(ctx.time, size, size, 1.0, 2.00, eyePosition, lookDirection);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, ctx.size[0], ctx.size[1]);
}
