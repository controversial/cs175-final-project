import { gl } from '../context';
import { SceneContext } from '../renderer';
import { RenderSkyWithContext } from './sky';

export const skyTexture = gl.createTexture();
const framebuffer = gl.createFramebuffer();

export function setupSkyTexture(ctx: SceneContext) {
  gl.bindTexture(gl.TEXTURE_2D, skyTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    ctx.size[0],
    ctx.size[1],
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
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, skyTexture, 0);
}

export function renderSkyTexture(ctx: SceneContext) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.clear(gl.COLOR_BUFFER_BIT);
  RenderSkyWithContext(ctx);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
