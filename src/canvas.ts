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

  // Set up render loop
  let frame: number;
  const draw = () => {

    gl.clear(gl.COLOR_BUFFER_BIT);

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
