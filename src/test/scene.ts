import { canvas, gl } from '../context';
import Camera from '../camera';
import { vec3 } from 'gl-matrix';
import { renderQuad } from './quad';

const camera = new Camera(canvas);
const sunDirection = vec3.fromValues(-0.9355746877275466, 0.2305306495197055, 0.05);

updateCanvasSize();
camera.attachKeyControls();

function drawCall() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  camera.update(10);

  console.log(sunDirection);

  renderQuad(camera, sunDirection);
}

function draw() {
  drawCall();
  requestAnimationFrame(draw);
}

draw();

function updateCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio ?? 1);
  canvas.height = rect.height * (window.devicePixelRatio ?? 1);
  camera.updateAspect(canvas.width, canvas.height);
}
