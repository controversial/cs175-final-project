export function makeCylinderVerticesAndNormals(nSegmentsX: number, nSegmentsY: number) {
  const vertices: number[] = [];
  const normals: number[] = [];

  for (let i = 0; i < nSegmentsY; i++) {
    const y = -0.5 + (1.0 / nSegmentsY) * i;
    for (let j = 0; j < nSegmentsX; j++) {
      const theta = 2.0 * j * Math.PI / nSegmentsX;
      const x = Math.cos(theta);
      const z = Math.sin(theta);
      vertices.push(0.5 * x, y, 0.5 * z);
      normals.push(x, 0, z);
    }
  }

  for (let i = -1; i <= 1; i += 2) {
    const y = 0.5 * i;
    for (let j = 0; j < nSegmentsX; j++) {
      const theta = (2.0 * Math.PI / nSegmentsX) * j;
      const x = Math.cos(theta);
      const z = Math.sin(theta);
      vertices.push(0.5 * x, y, 0.5 * z),
      normals.push(0, i, 0);
    }
  }
  return [new Float32Array(vertices), new Float32Array(normals)];
}

export function makeCylinderIndices(nSegmentsX: number, nSegmentsY: number) {
  const indices: number[] = [];
  for (let j = 0; j < nSegmentsY; j++) {
    for (let i = 0; i < nSegmentsX; i++) {
      indices.push(nSegmentsX * j + i);
      indices.push(nSegmentsX * j + ((i + 1) % nSegmentsX) + nSegmentsX);
      indices.push(nSegmentsX * j + ((i + 1) % nSegmentsX));

      indices.push(nSegmentsX * j + i);
      indices.push(nSegmentsX * j + i + nSegmentsX);
      indices.push(nSegmentsX * j + ((i + 1) % nSegmentsX) + nSegmentsX);
    }
  }

  const b = nSegmentsX * (nSegmentsY + 1);
  for (let i = 0; i < nSegmentsX; i++) {
    indices.push(b + i, b + (i + 1) % nSegmentsX, b + nSegmentsX);
  }

  const t = b + nSegmentsX + 1;
  for (let i = 0; i < nSegmentsX; i++) {
    indices.push(t + i, t + nSegmentsX, t + (i + 1) % nSegmentsX);
  }
  return new Uint16Array(indices);
}
