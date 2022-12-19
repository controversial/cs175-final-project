import './styles/index.scss';

import Renderer from './renderer';
import { canvas, gl } from './context';

import { loadBirdbath, renderBirdbath } from './scenes/birdbath';
import { loadWater, renderWater, updateWaves, waterHandleClick } from './scenes/water';
import { renderCloudsWithContext } from './scenes/cloud';
import { setupWorleyTexture } from './scenes/worley';
import { loadGround, renderGround } from './scenes/ground';

const renderer = new Renderer(canvas, gl);

setupWorleyTexture(64);

renderer.addRenderStep(renderCloudsWithContext);

Promise.all([loadGround(), loadBirdbath(), loadWater()]).then(() => {
  renderer.addRenderStep(renderGround);
  renderer.addRenderStep(renderBirdbath);
  renderer.addRenderStep(updateWaves, true);
  renderer.addRenderStep(renderWater);
  renderer.addEventListener('click', waterHandleClick);
});

renderer.addEventListener('wheel', (ctx, e) => {
  e.preventDefault();
  let zenithDegrees = ctx.zenithAngle * (180 / Math.PI);
  zenithDegrees += e.deltaY * 0.05;
  zenithDegrees = Math.max(zenithDegrees, -93);
  zenithDegrees = Math.min(zenithDegrees, 93);
  ctx.zenithAngle = zenithDegrees * (Math.PI / 180);

  // let azimuthDegrees = ctx.azimuthAngle * (180 / Math.PI);
  // azimuthDegrees -= e.deltaX * 0.05;
  // azimuthDegrees = Math.max(azimuthDegrees, -90);
  // azimuthDegrees = Math.min(azimuthDegrees, 90);
  // ctx.azimuthAngle = azimuthDegrees * (Math.PI / 180);
}, { passive: false });

renderer.start();

// Vite cleanup
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => { renderer.cleanup(); });
}
