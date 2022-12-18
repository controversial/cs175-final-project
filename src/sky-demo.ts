import Camera from './camera';

import { canvas, gl } from './context';
import { RenderSkyTexture, sunDirection } from './scenes/sky';

function updateCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio ?? 1);
  canvas.height = rect.height * (window.devicePixelRatio ?? 1);
}

export function debugDrawSky(camera: Camera) {
  updateCanvasSize();
  camera.attachKeyControls();
  let prevTime = 0;

  function draw(time: number) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    const deltaTime = time - prevTime;
    prevTime = time;
    camera.update(deltaTime);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    RenderSkyTexture(camera, sunDirection);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

debugDrawSky(new Camera(canvas));


