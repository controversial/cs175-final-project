import './styles/index.scss';

import { gl, canvas } from './context';
import { manageCanvasSize } from './shader';
import * as camera from './camera';
import { renderRoom } from './scenes/room';
import { renderBirdbath } from './scenes/birdbath';
import { renderSkyQuad } from './scenes/screenquad';
import { renderClouds } from './scenes/cloud';

camera.attachCameraKeyControls();
manageCanvasSize(canvas, (w, h) => camera.updateAspect(w, h));

renderBirdbath(0, camera.viewMatrix, camera.projectionMatrix);

let previousTime = performance.now();

function drawScene(time: number) {
  const delta = time - previousTime;
  previousTime = time;
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  camera.orient(delta);

  renderClouds(time, canvas.width, canvas.height, camera.aspect, camera.fieldOfView, camera.eyePosition, camera.lookVector);

  renderRoom(time, camera.viewMatrix, camera.projectionMatrix);
  if (time == -1) renderSkyQuad(time, camera.lookVector);

  requestAnimationFrame(drawScene);
}

requestAnimationFrame(drawScene);
