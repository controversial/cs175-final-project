export function init(canvas: HTMLCanvasElement) {
  // Keep the logical size of the canvas in sync with its physical size
  const updateCanvasSize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  };
  const resizeObserver = new ResizeObserver(updateCanvasSize);
  resizeObserver.observe(canvas);

  // Get canvas drawing context
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set up render loop
  let frame: number;
  const draw = () => {
    // Draw a colorful rectangle
    ctx.fillStyle = `hsl(${(Date.now() / 10) % 360}, 100%, 50%)`;
    ctx.fillRect(100, 100, 100, 100);

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
