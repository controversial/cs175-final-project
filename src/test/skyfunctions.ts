const pathToTextures = '/skytables/';
const [irradianceLUT, scatteringLUT, transmittanceLUT] = await Promise.all(
  ['irradiance.dat', 'scattering.dat', 'transmittance.dat']
    .map((fname) => pathToTextures + fname)
    .map((path) => fetch(path).then((r) => r.arrayBuffer()
      .then((buf) => new Float32Array(buf))))
);

export function bindSkyLookUpTextures(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  transmittanceTextureUnit: number,
  scatteringTextureUnit: number,
  irradianceTextureUnit: number,
) {
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

  // look up table constants
  const TRANSMITTANCE_TEXTURE_WIDTH = 256;
  const TRANSMITTANCE_TEXTURE_HEIGHT = 64;
  const SCATTERING_TEXTURE_WIDTH = 256;
  const SCATTERING_TEXTURE_HEIGHT = 128;
  const SCATTERING_TEXTURE_DEPTH = 32;
  const IRRADIANCE_TEXTURE_WIDTH = 64;
  const IRRADIANCE_TEXTURE_HEIGHT = 16;

  // find look up tables

  const transmittanceTexture = createTexture(transmittanceTextureUnit, gl.TEXTURE_2D);
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

  const scatteringTexture = createTexture(scatteringTextureUnit, gl.TEXTURE_3D);
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

  const irradianceTexture = createTexture(irradianceTextureUnit, gl.TEXTURE_2D);
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

  const lookUpTables = {
    irradiance: {
      location: gl.getUniformLocation(program, 'irradiance_texture'),
      texture: irradianceTexture,
      unit: irradianceTextureUnit,
      index: irradianceTextureUnit - gl.TEXTURE0,
    },
    transmittance: {
      location: gl.getUniformLocation(program, 'transmittance_texture'),
      texture: transmittanceTexture,
      unit: transmittanceTextureUnit,
      index: transmittanceTextureUnit - gl.TEXTURE0,
    },
    scattering: {
      location: gl.getUniformLocation(program, 'scattering_texture'),
      texture: scatteringTexture,
      unit: scatteringTextureUnit,
      index: scatteringTextureUnit - gl.TEXTURE0,
    },
    singleMieScattering: {
      location: gl.getUniformLocation(program, 'single_mie_scattering_texture'),
      texture: scatteringTexture,
      unit: scatteringTextureUnit,
      index: scatteringTextureUnit - gl.TEXTURE0,
    },
  };

  // if (lookUpTables.scattering.location == null) {
  //   throw new Error('Error \'sampler2D scattering_texture\' missing in program');
  // }
  // if (lookUpTables.transmittance.location == null) {
  //   throw new Error('Error \'sampler2D transmittance_texture\' missing in program');
  // }
  // if (lookUpTables.irradiance.location == null) {
  //   throw new Error('Error \'sampler2D irradiance_texture\' missing in program');
  // }

  return lookUpTables;
}

export function setSkyLookUpUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  textures: ReturnType<typeof bindSkyLookUpTextures>,
) {
  const transmittance = textures.transmittance;
  const scattering = textures.scattering;
  const irradiance = textures.irradiance;
  const single = textures.singleMieScattering;
  gl.useProgram(program);
  gl.uniform1i(transmittance.location, transmittance.index);
  gl.uniform1i(scattering.location, scattering.index);
  gl.uniform1i(irradiance.location, irradiance.index);
  gl.uniform1i(single.location, single.index);
}
