import './styles/index.scss';

import Renderer from './renderer';

import { renderRoom } from './scenes/room';
// import { loadBirdbath, renderBirdbath } from './scenes/birdbath';
import { renderClouds } from './scenes/cloud';

const canvas = document.getElementById('canvas');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Failed to find canvas element');


const renderer = new Renderer(canvas);
renderer.addRenderStep(renderClouds);
renderer.addRenderStep(renderRoom);
renderer.start();


// Vite cleanup
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => { renderer.cleanup(); });
}
