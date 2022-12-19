import { gl } from '../context';
import { makeProgram } from '../shader';
import vertexShaderSource from '../shaders/atmosphere/vertex_shader.glsl';
import fragmentShaderSource from '../shaders/atmosphere/fragment_texture.glsl';
import { vec2, vec3, mat3 } from 'gl-matrix';
import type Camera from '../camera';
import { SceneContext } from '../renderer';

// program and vertex buffer
const skyProgram = makeProgram(gl, vertexShaderSource, fragmentShaderSource) as WebGLProgram;
const vao = gl.createVertexArray() as WebGLVertexArrayObject;
const vertexBuffer = gl.createBuffer() as WebGLBuffer;
const vertices = new Float32Array([
  -1, -1,    1, -1,    1, 1,
  -1, -1,    1, 1,    -1, 1,
]);

// attributes
const aPosition = gl.getAttribLocation(skyProgram, 'vertex');

// setup vao
gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

// load textures
const [irradianceLUT, scatteringLUT, transmittanceLUT] = await Promise.all(
  ['irradiance.dat', 'scattering.dat', 'transmittance.dat']
    .map((fname) => `/skytables/${fname}`)
    .map((path) => fetch(path).then((r) => r.arrayBuffer()
      .then((buf) => new Float32Array(buf))))
);

// texture constants
const TRANSMITTANCE_TEXTURE_WIDTH = 256;
const TRANSMITTANCE_TEXTURE_HEIGHT = 64;
const SCATTERING_TEXTURE_WIDTH = 256;
const SCATTERING_TEXTURE_HEIGHT = 128;
const SCATTERING_TEXTURE_DEPTH = 32;
const IRRADIANCE_TEXTURE_WIDTH = 64;
const IRRADIANCE_TEXTURE_HEIGHT = 16;

// texture uniforms
const irradianceTextureLocation = gl.getUniformLocation(skyProgram, 'irradiance_texture');
const scatteringTextureLocation = gl.getUniformLocation(skyProgram, 'scattering_texture');
const singleMieScatteringTextureLocation = gl.getUniformLocation(skyProgram, 'single_mie_scattering_texture');
const transmittanceTextureLocation = gl.getUniformLocation(skyProgram, 'transmittance_texture');

function createTexture(textureUnit: number, target: number) {
  const texture = gl.createTexture();
  gl.activeTexture(textureUnit);
  gl.bindTexture(target, texture);
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

// setup textures
const transmittanceTexture = createTexture(gl.TEXTURE0, gl.TEXTURE_2D);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.getExtension('OES_texture_float_linear') ? gl.RGBA32F : gl.RGBA16F,
  TRANSMITTANCE_TEXTURE_WIDTH,
  TRANSMITTANCE_TEXTURE_HEIGHT,
  0,
  gl.RGBA,
  gl.FLOAT,
  transmittanceLUT
);

const scatteringTexture = createTexture(gl.TEXTURE1, gl.TEXTURE_3D);
gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
gl.texImage3D(
  gl.TEXTURE_3D,
  0,
  gl.RGBA16F,
  SCATTERING_TEXTURE_WIDTH,
  SCATTERING_TEXTURE_HEIGHT,
  SCATTERING_TEXTURE_DEPTH,
  0,
  gl.RGBA,
  gl.FLOAT,
  scatteringLUT
);

const irradianceTexture = createTexture(gl.TEXTURE2, gl.TEXTURE_2D);
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA16F,
  IRRADIANCE_TEXTURE_WIDTH,
  IRRADIANCE_TEXTURE_HEIGHT,
  0,
  gl.RGBA,
  gl.FLOAT,
  irradianceLUT
);

// uniform locations
const kSunAngularRadius = 0.00935 / 2;
const kLengthUnitInMeters = 1000;
const uModelFromView = gl.getUniformLocation(skyProgram, 'model_from_view');
const uViewFromClip = gl.getUniformLocation(skyProgram, 'view_from_clip');
const uCamera = gl.getUniformLocation(skyProgram, 'camera');
const uWhitePoint = gl.getUniformLocation(skyProgram, 'white_point');
const uExposure = gl.getUniformLocation(skyProgram, 'exposure');
const uEarthCenter = gl.getUniformLocation(skyProgram, 'earth_center');
const uSunDirection = gl.getUniformLocation(skyProgram, 'sun_direction');
const uSunSize = gl.getUniformLocation(skyProgram, 'sun_size');


// THE SUN
const sun = {
  angles: vec2.create(),
  direction: vec3.create(),
  textures: {
    transmittance: transmittanceTexture,
    scattering: scatteringTexture,
    irradiance: irradianceTexture,
  },
};
sun;

// uniform data
const modelFromView = new Float32Array(16);
const viewFromClip = new Float32Array(16);
export const viewDistanceMeters = 9000;
export const sunZenithAngleRadians = 1.3;
export const sunAzimuthAngleRadians = 2.9;
export const exposure = 10;
export const sunDirection = vec3.fromValues(
  Math.cos(sunAzimuthAngleRadians) * Math.sin(sunZenithAngleRadians),
  Math.sin(sunAzimuthAngleRadians) * Math.sin(sunZenithAngleRadians),
  Math.cos(sunZenithAngleRadians),
);

// constant uniforms
gl.useProgram(skyProgram);

gl.uniform1i(transmittanceTextureLocation, 0);
gl.uniform1i(scatteringTextureLocation, 1);
gl.uniform1i(singleMieScatteringTextureLocation, 1);
gl.uniform1i(irradianceTextureLocation, 2);

gl.uniform3f(uEarthCenter, 0, 0, -6360000 / kLengthUnitInMeters);
gl.uniform2f(uSunSize, Math.tan(kSunAngularRadius), Math.cos(kSunAngularRadius));

/* eslint-disable function-paren-newline */
const fragShaderTransform = mat3.fromValues(
  1.0, 0.0, 0.0,
  0.0, 0.0, -1.0,
  0.0, 1.0, 0.0
);
const transform = mat3.invert(mat3.create(), fragShaderTransform);
console.log(mat3.str(transform));
// x, z, -y
// -y, z, x

// main render function
export function RenderSky(camera: Camera, dirToSun: vec3) {
  gl.useProgram(skyProgram);
  gl.bindVertexArray(vao);

  const kTanFovY = Math.tan(camera.fieldOfView / 2);
  const aspectRatio = camera.aspect;
  viewFromClip.set([
    kTanFovY * aspectRatio, 0, 0, 0,
    0, kTanFovY, 0, 0,
    0, 0, 0, -1,
    0, 0, 1, 1,
  ]);

  const viewZenithAngleRadians = Math.PI * camera.angles[0] / 180;
  const viewAzimuthAngleRadians = Math.PI * camera.angles[1] / 180;

  const cosZ = Math.cos(viewZenithAngleRadians);
  const sinZ = Math.sin(viewZenithAngleRadians);
  const cosA = Math.cos(viewAzimuthAngleRadians);
  const sinA = Math.sin(viewAzimuthAngleRadians);
  const viewDistance = viewDistanceMeters / kLengthUnitInMeters;
  modelFromView.set([
    -sinA, -cosZ * cosA,  sinZ * cosA, sinZ * cosA * viewDistance,
    cosA, -cosZ * sinA, sinZ * sinA, sinZ * sinA * viewDistance,
    0, sinZ, cosZ, cosZ * viewDistance,
    0, 0, 0, 1]);

  gl.uniformMatrix4fv(uViewFromClip, true, viewFromClip);
  gl.uniformMatrix4fv(uModelFromView, true, modelFromView);

  gl.uniform3f(uCamera, modelFromView[3], modelFromView[7], modelFromView[11] + 2.0);
  gl.uniform3f(uWhitePoint, 1, 1, 1);
  gl.uniform1f(uExposure, exposure);
  gl.uniform3fv(uSunDirection, dirToSun);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

export function RenderSkyWithContext(ctx: SceneContext) {
  const zenithAngle = ((ctx.time / 1000.0) % 3.5) - 1.5707;
  const azimuthAngle = 2.9;
  const mySunDirection = vec3.fromValues(
    Math.cos(azimuthAngle) * Math.sin(zenithAngle),
    Math.sin(azimuthAngle) * Math.sin(zenithAngle),
    Math.cos(zenithAngle),
  );

  // This could easily be wrong
  ctx.sunDirection = [-mySunDirection[1], mySunDirection[2], mySunDirection[0]];

  RenderSky(ctx.camera, mySunDirection);
}
