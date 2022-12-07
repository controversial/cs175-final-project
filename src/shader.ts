function loadShaderSource(filepath: string) {
  const req = new XMLHttpRequest();
  req.open('GET', filepath, false);
  req.send(null);
  return (req.status == 200) ? req.responseText : null;
}

function makeShader(
  gl: WebGL2RenderingContext,
  type: typeof gl.VERTEX_SHADER | typeof gl.FRAGMENT_SHADER,
  filepath: string,
) {
  const source = loadShaderSource(filepath);
  if (!source) throw new Error('Failed to load shader source');
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
  vertexShaderFilepath: string,
  fragmentShaderFilepath: string,
) {
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create programs');

  const vertexShader = makeShader(gl, gl.VERTEX_SHADER, vertexShaderFilepath);
  const fragmentShader = makeShader(gl, gl.FRAGMENT_SHADER, fragmentShaderFilepath);
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
