const canvas = document.getElementById('WebGLCanvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

if (!gl) {
  throw new Error('WebGL2 Not supported');
}

export { canvas, gl };
