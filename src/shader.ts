function makeShader(
  gl: WebGL2RenderingContext,
  type: typeof gl.VERTEX_SHADER | typeof gl.FRAGMENT_SHADER,
  source: string,
) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) return shader;

  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}


export function makeProgram(
  gl: WebGL2RenderingContext,
  vertexShaderSource: string,
  fragmentShaderSource: string,
) {
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create programs');

  const vertexShader = makeShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = makeShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  if (!vertexShader || !fragmentShader) throw new Error('Failed to create shaders');

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) return program;

  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

export function manageCanvasSize(canvas: HTMLCanvasElement, callback?: (arg0: number, arg1: number) => void) {
  // Keep the logical size of the canvas in sync with its physical size
  const updateCanvasSize = () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio ?? 1);
    canvas.height = rect.height * (window.devicePixelRatio ?? 1);
    if (callback) callback(canvas.width, canvas.height);
  };
  const resizeObserver = new ResizeObserver(updateCanvasSize);
  resizeObserver.observe(canvas);

  return () => resizeObserver.disconnect();
}
