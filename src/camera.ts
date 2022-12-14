import { vec3, mat4, quat, vec2 } from 'gl-matrix';
import { canvas } from './context';
import { lerp } from './math-utils';

const moveSpeed = 0.05;
const rotateSpeed = 0.5;

const angles = vec2.create();
const deltaAngle = vec2.create();
const velocity = vec3.create();

const rotationQuat = quat.create();

export const rightVector = vec3.create();
export const upVector = vec3.create();
export const lookVector = vec3.create();

export const eyePosition = vec3.fromValues(0, 0, 1);
export const viewMatrix = mat4.create();
export const projectionMatrix = mat4.create();

const invEyePos = vec3.create();
const invRotation = mat4.create();

updateAspect(canvas.width, canvas.height);
orient(0);

export function updateAspect(width: number, height: number) {
  const aspect = width / height;
  const fieldOfView = 60 * Math.PI / 180;
  const near = 0.001;
  const far = 100;
  mat4.perspective(projectionMatrix, fieldOfView, aspect, near, far);
}

/* alternative form using lookAt –– might be better for mouse controls

export const lookAt = vec3;
export function orient() {
  updatePosition();
  updateRotation();
  vec3.add(lookAt, eyePosition, lookVector);
  mat4.lookAt(viewMatrix, eyePosition, lookAt, upVector);
}
*/

export function orient(timeDelta: number) {
  updatePosition(timeDelta);
  updateRotation(timeDelta);
  vec3.negate(invEyePos, eyePosition);
  mat4.fromTranslation(viewMatrix, invEyePos);
  quat.invert(rotationQuat, rotationQuat);
  mat4.fromQuat(invRotation, rotationQuat);
  mat4.multiply(viewMatrix, invRotation, viewMatrix);
}

export function updatePosition(timeDelta: number) {
  const framesElapsed = timeDelta / (1000 / 60); // number of 60fps frames since last update; used to normalize speed to different refresh rates
  vec3.scaleAndAdd(eyePosition, eyePosition, rightVector, velocity[0] * framesElapsed);
  vec3.scaleAndAdd(eyePosition, eyePosition, upVector, velocity[1] * framesElapsed);
  vec3.scaleAndAdd(eyePosition, eyePosition, lookVector, velocity[2] * framesElapsed);
}

export function updateRotation(timeDelta: number) {
  const framesElapsed = timeDelta / (1000 / 60); // number of 60fps frames since last update; used to normalize speed to different refresh rates
  vec2.add(angles, angles, vec2.multiply(deltaAngle, deltaAngle, [framesElapsed, framesElapsed]));
  quat.fromEuler(rotationQuat, angles[0], angles[1], 0);
  vec3.transformQuat(lookVector, [0, 0, -1], rotationQuat);
  vec3.transformQuat(rightVector, [-1, 0, 0], rotationQuat);
  vec3.set(upVector, 0, 1, 0);
}

export function attachCameraKeyControls() {
  const keysDown = new Set<string>();
  // TODO: restore faster movement with shift
  const onKeyDown = (e: KeyboardEvent) => { keysDown.add(e.key.toLowerCase()); };
  const onKeyUp = (e: KeyboardEvent) => { keysDown.delete(e.key.toLowerCase()); };
  addEventListener('keydown', onKeyDown);
  addEventListener('keyup', onKeyUp);
  let leftRightVelocity = 0;
  let upDownVelocity = 0;
  let forwardBackVelocity = 0;
  let leftRightAngularVelocity = 0;
  let upDownAngularVelocity = 0;

  let lastTime = performance.now();
  const update = (time: DOMHighResTimeStamp) => {
    const timeDelta = time - lastTime;
    lastTime = time;
    const framesElapsed = timeDelta / (1000 / 60); // number of 60fps frames since last update; used to normalize “momentum” curve to different refresh rates
    // Momentum parameters
    const movementAlpha = 0.1;
    const effectiveMovementAlpha = 1 - ((1 - movementAlpha) ** framesElapsed);
    const rotationAlpha = 0.2;
    const effectiveRotationAlpha = 1 - ((1 - rotationAlpha) ** framesElapsed);
    // Forward/back movement
    if (keysDown.has('w')) forwardBackVelocity = lerp(forwardBackVelocity, moveSpeed, effectiveMovementAlpha);
    else if (keysDown.has('s')) forwardBackVelocity = lerp(forwardBackVelocity, -moveSpeed, effectiveMovementAlpha);
    else forwardBackVelocity = lerp(forwardBackVelocity, 0, effectiveMovementAlpha);
    // Left/right movement
    if (keysDown.has('a')) leftRightVelocity = lerp(leftRightVelocity, moveSpeed, effectiveMovementAlpha);
    else if (keysDown.has('d')) leftRightVelocity = lerp(leftRightVelocity, -moveSpeed, effectiveMovementAlpha);
    else leftRightVelocity = lerp(leftRightVelocity, 0, effectiveMovementAlpha);
    // Up/down movement
    if (keysDown.has('q')) upDownVelocity = lerp(upDownVelocity, moveSpeed, effectiveMovementAlpha);
    else if (keysDown.has('e')) upDownVelocity = lerp(upDownVelocity, -moveSpeed, effectiveMovementAlpha);
    else upDownVelocity = lerp(upDownVelocity, 0, effectiveMovementAlpha);
    // Rotation
    if (keysDown.has('i')) upDownAngularVelocity = lerp(upDownAngularVelocity, rotateSpeed, effectiveRotationAlpha);
    else if (keysDown.has('k')) upDownAngularVelocity = lerp(upDownAngularVelocity, -rotateSpeed, effectiveRotationAlpha);
    else upDownAngularVelocity = lerp(upDownAngularVelocity, 0, effectiveRotationAlpha);
    if (keysDown.has('j')) leftRightAngularVelocity = lerp(leftRightAngularVelocity, rotateSpeed, effectiveRotationAlpha);
    else if (keysDown.has('l')) leftRightAngularVelocity = lerp(leftRightAngularVelocity, -rotateSpeed, effectiveRotationAlpha);
    else leftRightAngularVelocity = lerp(leftRightAngularVelocity, 0, effectiveRotationAlpha);
    // Apply velocities
    velocity[0] = leftRightVelocity;
    velocity[1] = upDownVelocity;
    velocity[2] = forwardBackVelocity;
    deltaAngle[0] = upDownAngularVelocity;
    deltaAngle[1] = leftRightAngularVelocity;

    requestAnimationFrame(update);
  };
  const raf = requestAnimationFrame(update);

  // Cleanup function
  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKeyDown);
    removeEventListener('keyup', onKeyUp);
  };
}
