// Wave height: 1024x1024 texture
// Enforces 0 outside a radius of 0.5

import waveStepFrag from './wave-step.glsl';
import dropFrag from './wave-drop.glsl';
import noopVert from './noop-vert.glsl';

import { gl } from '../context';
import { makeProgram } from '../shader';

export const WAVE_FIELD_SIZE_PX = 100;
const DECAY = 0.005;
const DT = 60;
const DX = 1;
const C = 0.3; // wave propagation speed

const emptyField = new Float32Array(WAVE_FIELD_SIZE_PX * WAVE_FIELD_SIZE_PX).fill(0);


export default class WaveSim {
  waterHeightTexture: WebGLTexture;
  previousWaterHeightTexture: WebGLTexture;
  private tempTexture: WebGLTexture;
  program: WebGLProgram;
  dropProgram: WebGLProgram;
  vao: WebGLVertexArrayObject;
  framebuffer: WebGLFramebuffer;

  constructor() {
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) throw new Error('EXT_color_buffer_float not supported');

    // Create textures for wave height data (one for current and one for previous)
    const waterHeightTexture = gl.createTexture();
    if (!waterHeightTexture) throw new Error('couldn’t create water height texture');
    this.waterHeightTexture = waterHeightTexture;
    gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, WAVE_FIELD_SIZE_PX, WAVE_FIELD_SIZE_PX, 0, gl.RED, gl.FLOAT, emptyField);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    const previousWaterHeightTexture = gl.createTexture();
    if (!previousWaterHeightTexture) throw new Error('couldn’t create previous water height texture');
    this.previousWaterHeightTexture = previousWaterHeightTexture;
    gl.bindTexture(gl.TEXTURE_2D, this.previousWaterHeightTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, WAVE_FIELD_SIZE_PX, WAVE_FIELD_SIZE_PX, 0, gl.RED, gl.FLOAT, emptyField);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    // Create a temporary texture for rendering
    const tempTexture = gl.createTexture();
    if (!tempTexture) throw new Error('couldn’t create temp texture');
    this.tempTexture = tempTexture;
    gl.bindTexture(gl.TEXTURE_2D, this.tempTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, WAVE_FIELD_SIZE_PX, WAVE_FIELD_SIZE_PX, 0, gl.RED, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    // Create framebuffer
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error('couldn’t create framebuffer');
    this.framebuffer = framebuffer;

    // Create programs
    const program = makeProgram(gl, noopVert, waveStepFrag);
    if (!program) throw new Error('couldn’t create program');
    this.program = program;

    const dropProgram = makeProgram(gl, noopVert, dropFrag);
    if (!dropProgram) throw new Error('couldn’t create drop program');
    this.dropProgram = dropProgram;

    // Create VAO
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('couldn’t create VAO');
    this.vao = vao;

    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) throw new Error('couldn’t create vertex buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 3, -1, -1, 3, -1]), gl.STATIC_DRAW);

    gl.bindVertexArray(this.vao);
    const aPosition = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  }

  /** Run the wave simulation for a step */
  step(timeDelta: DOMHighResTimeStamp) {
    const uHeight = gl.getUniformLocation(this.program, 'u_height'); // sampler2d
    const uPrevHeight = gl.getUniformLocation(this.program, 'u_prevHeight'); // sampler2d
    const uResolution = gl.getUniformLocation(this.program, 'u_resolution'); // vec2
    const uAlpha = gl.getUniformLocation(this.program, 'u_alpha'); // float
    const uDecay = gl.getUniformLocation(this.program, 'u_decay'); // float

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, WAVE_FIELD_SIZE_PX, WAVE_FIELD_SIZE_PX);

    // Pass uniforms
    gl.uniform1i(uHeight, 0);
    gl.uniform1i(uPrevHeight, 1);
    gl.uniform2f(uResolution, WAVE_FIELD_SIZE_PX, WAVE_FIELD_SIZE_PX);
    gl.uniform1f(uAlpha, (C * DT * timeDelta / DX) ** 2);
    gl.uniform1f(uDecay, DECAY);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.previousWaterHeightTexture);

    // Swap textures
    const temp = this.waterHeightTexture;
    this.waterHeightTexture = this.previousWaterHeightTexture;
    this.previousWaterHeightTexture = temp;
    // Note: now, the “active texture” is the texture that was formerly the “previous” water height
    // texture, but will now be the “current” water height texture post-swap
    // At this point, waterHeightTexture refers to a texture that contains the previous water height,
    // but we’re going to switch it out

    // Set up framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    // Render to temp texture
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tempTexture, 0);
    // Swap temp texture for the current water height texture
    const temp2 = this.waterHeightTexture;
    this.waterHeightTexture = this.tempTexture;
    this.tempTexture = temp2;

    // Clear
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Unbind
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /** Add a drop at a given (0, 1) position on *both* the current and previous field */
  addDrop(x: number, y: number, radius: number) {
    const uDropPosition = gl.getUniformLocation(this.dropProgram, 'u_dropPosition'); // vec2
    const uDropRadius = gl.getUniformLocation(this.dropProgram, 'u_dropRadius'); // float
    const uResolution = gl.getUniformLocation(this.dropProgram, 'u_resolution'); // vec2
    const uHeight = gl.getUniformLocation(this.dropProgram, 'u_height'); // sampler2d

    gl.useProgram(this.dropProgram);
    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, WAVE_FIELD_SIZE_PX, WAVE_FIELD_SIZE_PX);

    // Pass uniforms
    gl.uniform2f(uDropPosition, x, y);
    gl.uniform1f(uDropRadius, radius);
    gl.uniform2f(uResolution, WAVE_FIELD_SIZE_PX, WAVE_FIELD_SIZE_PX);

    // We’ll put input textures in TEXTURE0
    gl.uniform1i(uHeight, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer); // we’ll draw to the framebuffer

    // Render drop to prev height
    gl.bindTexture(gl.TEXTURE_2D, this.previousWaterHeightTexture); // input: previous water height texture
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tempTexture, 0); // write to temp texture
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // Swap temp and previous water height textures
    const temp = this.previousWaterHeightTexture;
    this.previousWaterHeightTexture = this.tempTexture;
    this.tempTexture = temp;

    // Render drop to current height
    gl.bindTexture(gl.TEXTURE_2D, this.waterHeightTexture); // input: water height texture
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tempTexture, 0); // write to temp texture
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // Swap temp and water height textures
    const temp2 = this.waterHeightTexture;
    this.waterHeightTexture = this.tempTexture;
    this.tempTexture = temp2;

    // Unbind
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}
