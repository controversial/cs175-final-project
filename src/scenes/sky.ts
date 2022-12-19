
import { vec3 } from 'gl-matrix';
import { SceneContext } from '../renderer';

export function updateSunParameters(ctx: SceneContext) {
  const zenithAngle = ((ctx.time / 10000.0) % 3.5) - 1.5707;
  const azimuthAngle = 2.9;
  const mySunDirection = vec3.fromValues(
    Math.cos(azimuthAngle) * Math.sin(zenithAngle),
    Math.sin(azimuthAngle) * Math.sin(zenithAngle),
    Math.cos(zenithAngle),
  );

  // This could easily be wrong
  ctx.sunDirection = [-mySunDirection[1], mySunDirection[2], mySunDirection[0]];
  ctx.sunIntensity = Math.pow(Math.cos(zenithAngle * 2.0) + 1.0, 0.1);
  if (zenithAngle > 1.5707) {
    ctx.sunIntensity = 0.0;
  }
}
