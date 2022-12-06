
import { makeProgram as makeShader } from './shader';

const vertices = [
    -1.0, -1.0, 0.0, 1.0,
     1.0, -1.0, 0.0, 1.0,
     1.0,  1.0, 0.0, 1.0,
    -1.0, -1.0, 0.0, 1.0,
     1.0,  1.0, 0.0, 1.0,
    -1.0,  1.0, 0.0, 1.0
];

export function init(canvas: HTMLCanvasElement) {
  // Keep the logical size of the canvas in sync with its physical size
  const updateCanvasSize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  };
  const resizeObserver = new ResizeObserver(updateCanvasSize);
  resizeObserver.observe(canvas);

  // Get OpenGL context
  const gl = canvas.getContext('webgl2');
  if (!gl) return;

  // Initialize viewport to canvas size
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Set clear color to a nice shade of green
  gl.clearColor(0.2, 0.8, 0.4, 1.0);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);

  // Draws a pink rectangle
  const passthrough_shader = makeShader(gl, 'src/vert_shader.c', 'src/frag_shader.c');

  // Set up render loop
  let frame: number;
  const draw = () => {

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindVertexArray(vao);
    gl.useProgram(passthrough_shader);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Schedule next frame
    frame = requestAnimationFrame(draw);
  };
  // Start render loop
  frame = requestAnimationFrame(draw);

  // Clean up on Vite HMR
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    });
  }
}

