import './styles/index.scss';

import Renderer from './renderer';
import { canvas, gl } from './context';

import { loadBirdbath, renderBirdbath } from './scenes/birdbath';
import { loadWater, renderWater } from './scenes/water';
import { renderCloudsWithContext } from './scenes/cloud';
import { renderSkyTexture, setupSkyTexture } from './scenes/sky-texture';

const renderer = new Renderer(canvas, gl);

setupSkyTexture(renderer.sceneContext);
renderer.addRenderStep(renderSkyTexture);

renderer.addRenderStep(renderCloudsWithContext);
Promise.all([loadBirdbath(), loadWater()]).then(() => {
  renderer.addRenderStep(renderBirdbath);
  renderer.addRenderStep(renderWater);
});
renderer.start();

// Vite cleanup
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => { renderer.cleanup(); });
}
