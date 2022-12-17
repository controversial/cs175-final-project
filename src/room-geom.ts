const VERTEX_STRIDE = 8;

const cubeVertices = new Float32Array([
  // position (vec3)   normal (vec3)   uv (vec2)
  -0.5, -0.5,  0.5,    0,  0,  1,    0,  0,
  0.5, -0.5,  0.5,    0,  0,  1,    1,  0,
  -0.5,  0.5,  0.5,    0,  0,  1,    0,  1,
  0.5,  0.5,  0.5,    0,  0,  1,    1,  1,

  0.5, -0.5,  0.5,    1,  0,  0,    0,  0,
  0.5, -0.5, -0.5,    1,  0,  0,    1,  0,
  0.5,  0.5,  0.5,    1,  0,  0,    0,  1,
  0.5,  0.5, -0.5,    1,  0,  0,    1,  1,

  -0.5,  0.5,  0.5,    0,  1,  0,    0,  0,
  0.5,  0.5,  0.5,    0,  1,  0,    1,  0,
  -0.5,  0.5, -0.5,    0,  1,  0,    0,  1,
  0.5,  0.5, -0.5,    0,  1,  0,    1,  1,

  0.5, -0.5, -0.5,    0,  0, -1,    0,  0,
  -0.5, -0.5, -0.5,    0,  0, -1,    1,  0,
  0.5,  0.5, -0.5,    0,  0, -1,    0,  1,
  -0.5,  0.5, -0.5,    0,  0, -1,    1,  1,

  -0.5, -0.5, -0.5,    -1,  0,  0,    0,  0,
  -0.5, -0.5,  0.5,    -1,  0,  0,    1,  0,
  -0.5,  0.5, -0.5,    -1,  0,  0,    0,  1,
  -0.5,  0.5,  0.5,    -1,  0,  0,    1,  1,

  0.5, -0.5,  0.5,    0,  -1,  0,    0,  0,
  -0.5, -0.5,  0.5,    0,  -1,  0,    1,  0,
  0.5, -0.5, -0.5,    0,  -1,  0,    0,  1,
  -0.5, -0.5, -0.5,    0,  -1,  0,    1,  1,
]);

const cubeIndices = new Uint16Array([
  0, 1, 3, 0, 3, 2,
  4, 5, 7, 4, 7, 6,
  8, 9, 11, 8, 11, 10,
  12, 13, 15, 12, 15, 14,
  16, 17, 19, 16, 19, 18,
  20, 21, 23, 20, 23, 22,
]);

const invertedCubeIndices = new Uint16Array([
  0, 1, 3, 0, 3, 2,
  4, 5, 7, 4, 7, 6,
  8, 9, 11, 8, 11, 10,
  12, 13, 15, 12, 15, 14,
  16, 17, 19, 16, 19, 18,
  20, 21, 23, 20, 23, 22,
]);

const invertedCubeVertices = new Float32Array([
  // position (vec3)   normal (vec3)   uv (vec2)
  -0.5, -0.5, -0.5,    0,  0,  1,    0,  0,
  0.5, -0.5, -0.5,    0,  0,  1,    1,  0,
  -0.5,  0.5, -0.5,    0,  0,  1,    0,  1,
  0.5,  0.5, -0.5,    0,  0,  1,    1,  1,

  -0.5, -0.5,  0.5,    1,  0,  0,    0,  0,
  -0.5, -0.5, -0.5,    1,  0,  0,    1,  0,
  -0.5,  0.5,  0.5,    1,  0,  0,    0,  1,
  -0.5,  0.5, -0.5,    1,  0,  0,    1,  1,

  -0.5, -0.5,  0.5,    0,  1,  0,    0,  0,
  0.5, -0.5,  0.5,    0,  1,  0,    1,  0,
  -0.5, -0.5, -0.5,    0,  1,  0,    0,  1,
  0.5, -0.5, -0.5,    0,  1,  0,    1,  1,

  0.5, -0.5,  0.5,    0,  0, -1,    0,  0,
  -0.5, -0.5,  0.5,    0,  0, -1,    1,  0,
  0.5,  0.5,  0.5,    0,  0, -1,    0,  1,
  -0.5,  0.5,  0.5,    0,  0, -1,    1,  1,

  0.5, -0.5, -0.5,    -1,  0,  0,    0,  0,
  0.5, -0.5,  0.5,    -1,  0,  0,    1,  0,
  0.5,  0.5, -0.5,    -1,  0,  0,    0,  1,
  0.5,  0.5,  0.5,    -1,  0,  0,    1,  1,

  0.5,  0.5,  0.5,    0,  -1,  0,    0,  0,
  -0.5,  0.5,  0.5,    0,  -1,  0,    1,  0,
  0.5,  0.5, -0.5,    0,  -1,  0,    0,  1,
  -0.5,  0.5, -0.5,    0,  -1,  0,    1,  1,
]);

function concatBuffers(vertexBuffers: Float32Array[], indexBuffers: Uint16Array[]) {
  if (vertexBuffers.length != indexBuffers.length) throw Error('vertexBuffers.length != indexBuffers.length');

  const totalVertexBufferSize = vertexBuffers.reduce((c, x) => {return c + x.length;}, 0);
  const totalIndexBufferSize = indexBuffers.reduce((c, x) => {return c + x.length;}, 0);

  const newVertexBuffer = new Float32Array(totalVertexBufferSize);
  const newIndexBuffer = new Int16Array(totalIndexBufferSize);
  const offsets: number[] = [];
  const counts: number[] = [];

  let currVertexOffset = 0;
  vertexBuffers.map((x) => {
    newVertexBuffer.set(x, currVertexOffset);
    currVertexOffset += x.length;
  });

  let currIndexOffset = 0;
  let currVertexCountOffset = 0;
  indexBuffers.map((x, i) => {
    offsets.push(currIndexOffset * 2);
    counts.push(x.length);
    x = x.map(v => v + currVertexCountOffset);
    newIndexBuffer.set(x, currIndexOffset);
    currIndexOffset += x.length;
    currVertexCountOffset += vertexBuffers[i].length / VERTEX_STRIDE;
  });

  return {
    vertices: newVertexBuffer,
    indices: newIndexBuffer,
    offsets: offsets,
    counts: counts,
  };
}

const res = concatBuffers([cubeVertices, invertedCubeVertices], [cubeIndices, invertedCubeIndices]);

export const vertices = res.vertices;
export const indices = res.indices;
export const cube = {
  offset: res.offsets[0],
  count: res.counts[0],
};
export const invertedCube = {
  offset: res.offsets[1],
  count: res.counts[1],
};
