import './styles/index.scss';

import Renderer from './renderer';
import { canvas, gl } from './context';

import { loadBirdbath, renderBirdbath } from './scenes/birdbath';
import { loadWater, renderWater, updateWaves, waterHandleClick } from './scenes/water';
import { renderCloudsWithContext } from './scenes/cloud';
import { setupWorleyTexture } from './scenes/worley';
import { loadGround, renderGround } from './scenes/ground';
import { updateSunParameters } from './scenes/sky';

const renderer = new Renderer(canvas, gl);

setupWorleyTexture(64);

renderer.addRenderStep(updateSunParameters);
renderer.addRenderStep(renderCloudsWithContext);
Promise.all([loadGround(), loadBirdbath(), loadWater()]).then(() => {
  renderer.addRenderStep(renderGround);
  renderer.addRenderStep(renderBirdbath);
  renderer.addRenderStep(updateWaves, true);
  renderer.addRenderStep(renderWater);
  renderer.addClickListener(waterHandleClick);
});

renderer.start();

// Vite cleanup
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => { renderer.cleanup(); });
}
