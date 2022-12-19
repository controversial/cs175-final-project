import { gl } from '../context';
import { makeProgram } from '../shader';
import quadVSS from './shaders/quad_vert.glsl';
import quadFSS from './shaders/quad_frag.glsl';
import { bindSkyLookUpTextures, setSkyLookUpUniforms } from './skyfunctions';
import Camera from '../camera';
import { vec3 } from 'gl-matrix';

const program = makeProgram(gl, quadVSS, quadFSS) as WebGLProgram;
const vao = gl.createVertexArray() as WebGLVertexArrayObject;
const vertexBuffer = gl.createBuffer() as WebGLBuffer;
const vertices = new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]);

const aPosition = gl.getAttribLocation(program, 'a_position');

gl.bindVertexArray(vao);

gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

const uLookVector = gl.getUniformLocation(program, 'u_lookVector');
const uFov = gl.getUniformLocation(program, 'u_fov');
const uNear = gl.getUniformLocation(program, 'u_near');
const uFar = gl.getUniformLocation(program, 'u_far');
const uAspect = gl.getUniformLocation(program, 'u_aspect');
const uSunDirection = gl.getUniformLocation(program, 'u_sunDirection');
const uCamera = gl.getUniformLocation(program, 'u_camera');

const skyTables = bindSkyLookUpTextures(gl, program, gl.TEXTURE6, gl.TEXTURE8, gl.TEXTURE10);

export function renderQuad(camera: Camera, sunDirection: vec3) {
  gl.useProgram(program);
  gl.bindVertexArray(vao);

  setSkyLookUpUniforms(gl, program, skyTables);

  gl.uniform1f(uFov, camera.fieldOfView);
  gl.uniform1f(uAspect, camera.aspect);
  gl.uniform1f(uNear, camera.nearPlane);
  gl.uniform1f(uFar, camera.farPlane);
  gl.uniform3fv(uLookVector, camera.lookVector);
  gl.uniform3fv(uSunDirection, sunDirection);
  gl.uniform3fv(uCamera, camera.eyePosition);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
