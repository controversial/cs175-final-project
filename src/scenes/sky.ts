import { SceneContext } from '../renderer';

export function updateSunParameters(ctx: SceneContext, zenithAngle = -1, azimuthAngle = 2.9) {
  ctx.zenithAngle = zenithAngle;
  ctx.azimuthAngle = azimuthAngle;
}
