import { gl, canvas } from './context';
import { resizeCanvasToDisplaySize } from './shader';
import * as camera from './camera';
import { renderRoom } from './scenes/room';
import { renderBirdbath } from './scenes/birdbath';
import { renderSkyQuad } from './scenes/screenquad';

resizeCanvasToDisplaySize(canvas);
camera.attachCameraKeyControls();

renderBirdbath(0, camera.viewMatrix, camera.projectionMatrix);

function drawScene(time: number) {
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  camera.orient();

  renderRoom(time, camera.viewMatrix, camera.projectionMatrix);
  if (time == -1)
    renderSkyQuad(time, camera.lookVector);

  requestAnimationFrame(drawScene);
}

requestAnimationFrame(drawScene);
