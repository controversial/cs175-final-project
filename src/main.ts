import './styles/index.scss';

import Renderer from './renderer';
import { canvas, gl } from './context';

import { renderRoom } from './scenes/room';
import { loadBirdbath, renderBirdbath } from './scenes/birdbath';
import { loadWater, renderWater } from './scenes/water';
import { renderClouds } from './scenes/cloud';

const renderer = new Renderer(canvas, gl);
renderer.addRenderStep(renderClouds);
renderer.addRenderStep(renderRoom);
loadBirdbath().then(() => {
  renderer.addRenderStep(renderBirdbath);
  loadWater().then(() => renderer.addRenderStep(renderWater));
});
renderer.start();

// Vite cleanup
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => { renderer.cleanup(); });
}
