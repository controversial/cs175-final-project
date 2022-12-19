import { makeProgram } from '../shader';
import { canvas, gl } from '../context';
import noopVert from './noop-vert.glsl';
import demoFrag from './waves-demo-frag.glsl';
import WaveSim from './waves';

function updateCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio ?? 1);
  canvas.height = rect.height * (window.devicePixelRatio ?? 1);
}

const program = makeProgram(gl, noopVert, demoFrag);
if (!program) throw new Error('Failed to create program');

// Set up geometry
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 3, -1, -1, 3, -1]), gl.STATIC_DRAW);

// Bind vertex data to `a_position` attribute
const aPosition = gl.getAttribLocation(program, 'a_position');
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

// Get uniform locations
const uHeight = gl.getUniformLocation(program, 'u_height');
const uPrevHeight = gl.getUniformLocation(program, 'u_prevHeight');

const waves = new WaveSim();


function wavesDemo() {
  updateCanvasSize();

  let previousTime = performance.now();
  function draw(time: DOMHighResTimeStamp) {
    const dt = (time - previousTime) / 1000;
    previousTime = time;

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(program);
    // Bind position attribute
    gl.bindVertexArray(vao);
    // Bind texture uniforms
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, waves.waterHeightTexture);
    gl.uniform1i(uHeight, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, waves.previousWaterHeightTexture);
    gl.uniform1i(uPrevHeight, 1);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Advance
    waves.step(dt);

    // On to the next frame
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

wavesDemo();

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = 1 - (e.clientY - rect.top) / rect.height;
  waves.addDrop((x * 2) % 1, y, 0.1);
});
