import { makeProgram as makeProgram } from './shader';
import vertexShaderSource from './vert_passthrough.glsl';
import fragmentShaderSource from './frag_worley.glsl';

export function makeWorleyTexture(
  gl: WebGL2RenderingContext,
  numPoints: number,
  size: number,
) {
  // Initialize texture
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, texture);
  gl.texImage3D(
    gl.TEXTURE_3D,
    0,
    gl.RGBA,
    size,
    size,
    size,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
  );
    
  // TODO: Are these the best parameters for this situation?
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  // Initialize framebuffer
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  // Initialize shader
  const shader = makeProgram(gl, vertexShaderSource, fragmentShaderSource);
  if (shader == null) {
    gl.deleteTexture(texture);
    return null;
  }
  const locZ = gl.getUniformLocation(shader, 'z');
  const locResolution = gl.getUniformLocation(shader, 'resolution');
  const locNumPoints = gl.getUniformLocation(shader, 'num_points');

  // Initialize VBO and VAO
  const vertices = [ // full-screen quad
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

  // Render to texture
  gl.viewport(0, 0, size, size);
  gl.useProgram(shader);
  gl.uniform1f(locNumPoints, numPoints);
  gl.uniform1f(locResolution, size);
  for (let i = 0; i < size; i++) {
    gl.framebufferTextureLayer(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      texture,
      0,
      i
    );
    gl.uniform1f(locZ, i);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // Clean up
  gl.deleteProgram(shader);
  gl.deleteFramebuffer(framebuffer);

  return texture;
}

