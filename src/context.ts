const canvas = document.getElementById('WebGLCanvas') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;

if (!gl) {
  throw new Error('WebGL2 Not supported');
}

gl.hint(gl.FRAGMENT_SHADER_DERIVATIVE_HINT, gl.DONT_CARE);

export { canvas, gl };
