import './styles/index.scss';

import Renderer from './renderer';
import { canvas, gl } from './context';

import { renderRoom } from './scenes/room';
// import { loadBirdbath, renderBirdbath } from './scenes/birdbath';
import { renderClouds } from './scenes/cloud';

const renderer = new Renderer(canvas, gl);
renderer.addRenderStep(renderClouds);
renderer.addRenderStep(renderRoom);
renderer.start();

// Vite cleanup
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => { renderer.cleanup(); });
}
