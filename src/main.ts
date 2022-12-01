import './styles/index.scss';
import { init as canvasInit } from './canvas';

console.log('Hello, world!');

canvasInit(document.getElementById('canvas') as HTMLCanvasElement);
