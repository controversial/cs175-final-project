import './styles/index.scss';
import { init as canvasInit } from './canvas';

canvasInit(document.getElementById('canvas') as HTMLCanvasElement);
