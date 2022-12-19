import { gl } from '../context';
import { makeProgram as makeProgram } from '../shader';

import vertexShaderSource from '../shaders/screenquad_vert.glsl';
import fragmentShaderSource from '../shaders/worley_frag.glsl';

export const worleyTexture = gl.createTexture();

export function setupWorleyTexture(size: number) {
  // Initialize texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_3D, worleyTexture);
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

  // Set texture parameters
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  // Initialize framebuffer
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  // Initialize shader
  const shader = makeProgram(gl, vertexShaderSource, fragmentShaderSource) as WebGLShader;
  const locZ = gl.getUniformLocation(shader, 'z');
  const locResolution = gl.getUniformLocation(shader, 'resolution');

  // Initialize VBO and VAO
  const vertices = new Float32Array([
    -1, -1,    1, -1,    1, 1,
    -1, -1,    1,  1,   -1, 1,
  ]);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Render to texture
  gl.viewport(0, 0, size, size);
  gl.useProgram(shader);
  gl.uniform1f(locResolution, size);
  for (let i = 0; i < size; i++) {
    gl.framebufferTextureLayer(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      worleyTexture,
      0,
      i
    );
    gl.uniform1f(locZ, i);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // Clean up
  gl.deleteProgram(shader);
  gl.deleteFramebuffer(framebuffer);
}

