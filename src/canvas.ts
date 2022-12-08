import { makeProgram as makeProgram } from './shader';
import { makeWorleyTexture as makeWorleyTexture } from './worley';
import vertexShaderSrc from './vert_passthrough.glsl';
import fragmentShaderSrc from './frag_quad.glsl';


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

  // Initialize VBO and VAO
  const vertices = [
    -1.0, -1.0, 0.0, 1.0,
    1.0, -1.0, 0.0, 1.0,
    1.0,  1.0, 0.0, 1.0,
    -1.0, -1.0, 0.0, 1.0,
    1.0,  1.0, 0.0, 1.0,
    -1.0,  1.0, 0.0, 1.0,
  ];
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);

  // Generate 3D Worley noise texture
  const worleySize = 128;
  const worleyNumPoints = 4;
  const worleyRepeatTex = 1;
  const worleyTex = makeWorleyTexture(gl, worleyNumPoints, worleySize);

  // Initialize shader
  const shader = makeProgram(gl, vertexShaderSrc, fragmentShaderSrc);
  if (shader == null) return;
  const locTex = gl.getUniformLocation(shader, 'tex');
  const locResolution = gl.getUniformLocation(shader, 'resolution');
  const locZ = gl.getUniformLocation(shader, 'z');
  const locTile = gl.getUniformLocation(shader, 'tile');

  // Make sure OpenGL is in correct state
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.bindTexture(gl.TEXTURE_3D, worleyTex);

  // Set up render loop
  let frame: number;
  const draw = () => {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindVertexArray(vao);
    gl.useProgram(shader);
    gl.uniform1i(locTex, 0);
    gl.uniform2f(locResolution, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(locZ, frame / worleySize);
    gl.uniform1f(locTile, worleyRepeatTex);
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

