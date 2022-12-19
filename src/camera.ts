import { vec3, mat4, quat, vec2 } from 'gl-matrix';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default class Camera {
  static moveSpeed = 0.05;
  static rotateSpeed = 0.5;

  angles = vec2.create();
  deltaAngle = vec2.create();
  velocity = vec3.create();

  rotationQuat = quat.create();

  rightVector = vec3.create();
  upVector = vec3.create();
  lookVector = vec3.create();

  eyePosition = vec3.fromValues(0, 3.7, 3);
  viewMatrix = mat4.create();
  projectionMatrix = mat4.create();

  aspect = 1.0;
  fieldOfView = 45 * Math.PI / 180;

  invEyePos = vec3.create();
  invRotation = mat4.create();

  nearPlane = 0.001;
  farPlane = 100;

  constructor(canvas: HTMLCanvasElement) {
    this.updateAspect(canvas.width, canvas.height);
    this.update(0);
  }

  updateAspect(width: number, height: number) {
    this.aspect = width / height;
    mat4.perspective(this.projectionMatrix, this.fieldOfView, this.aspect, this.nearPlane, this.farPlane);
  }

  update(timeDelta: number) {
    this.updatePosition(timeDelta);
    this.updateRotation(timeDelta);
    vec3.negate(this.invEyePos, this.eyePosition);
    mat4.fromTranslation(this.viewMatrix, this.invEyePos);
    quat.invert(this.rotationQuat, this.rotationQuat);
    mat4.fromQuat(this.invRotation, this.rotationQuat);
    mat4.multiply(this.viewMatrix, this.invRotation, this.viewMatrix);
  }

  updatePosition(timeDelta: number) {
    const framesElapsed = timeDelta / (1000 / 60); // number of 60fps frames since last update; used to normalize speed to different refresh rates
    vec3.scaleAndAdd(this.eyePosition, this.eyePosition, this.rightVector, this.velocity[0] * framesElapsed);
    vec3.scaleAndAdd(this.eyePosition, this.eyePosition, this.upVector, this.velocity[1] * framesElapsed);
    vec3.scaleAndAdd(this.eyePosition, this.eyePosition, this.lookVector, this.velocity[2] * framesElapsed);
  }

  updateRotation(timeDelta: number) {
    const framesElapsed = timeDelta / (1000 / 60); // number of 60fps frames since last update; used to normalize speed to different refresh rates
    vec2.add(this.angles, this.angles, vec2.multiply(this.deltaAngle, this.deltaAngle, [framesElapsed, framesElapsed]));
    if (this.angles[0] > 88.0) {
      this.angles[0] = 88.0;
    }
    if (this.angles[0] < -88.0) {
      this.angles[0] = -88.0;
    }
    quat.fromEuler(this.rotationQuat, this.angles[0], this.angles[1], 0);
    vec3.transformQuat(this.lookVector, [0, 0, -1], this.rotationQuat);
    vec3.transformQuat(this.rightVector, [-1, 0, 0], this.rotationQuat);
    vec3.set(this.upVector, 0, 1, 0);
  }

  attachKeyControls() {
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
      if (keysDown.has('w')) forwardBackVelocity = lerp(forwardBackVelocity, Camera.moveSpeed, effectiveMovementAlpha);
      else if (keysDown.has('s')) forwardBackVelocity = lerp(forwardBackVelocity, -Camera.moveSpeed, effectiveMovementAlpha);
      else forwardBackVelocity = lerp(forwardBackVelocity, 0, effectiveMovementAlpha);
      // Left/right movement
      if (keysDown.has('a')) leftRightVelocity = lerp(leftRightVelocity, Camera.moveSpeed, effectiveMovementAlpha);
      else if (keysDown.has('d')) leftRightVelocity = lerp(leftRightVelocity, -Camera.moveSpeed, effectiveMovementAlpha);
      else leftRightVelocity = lerp(leftRightVelocity, 0, effectiveMovementAlpha);
      // Up/down movement
      if (keysDown.has('q')) upDownVelocity = lerp(upDownVelocity, Camera.moveSpeed, effectiveMovementAlpha);
      else if (keysDown.has('e')) upDownVelocity = lerp(upDownVelocity, -Camera.moveSpeed, effectiveMovementAlpha);
      else upDownVelocity = lerp(upDownVelocity, 0, effectiveMovementAlpha);
      // Rotation
      if (keysDown.has('i')) upDownAngularVelocity = lerp(upDownAngularVelocity, Camera.rotateSpeed, effectiveRotationAlpha);
      else if (keysDown.has('k')) upDownAngularVelocity = lerp(upDownAngularVelocity, -Camera.rotateSpeed, effectiveRotationAlpha);
      else upDownAngularVelocity = lerp(upDownAngularVelocity, 0, effectiveRotationAlpha);
      if (keysDown.has('j')) leftRightAngularVelocity = lerp(leftRightAngularVelocity, Camera.rotateSpeed, effectiveRotationAlpha);
      else if (keysDown.has('l')) leftRightAngularVelocity = lerp(leftRightAngularVelocity, -Camera.rotateSpeed, effectiveRotationAlpha);
      else leftRightAngularVelocity = lerp(leftRightAngularVelocity, 0, effectiveRotationAlpha);
      // Apply velocities
      this.velocity[0] = leftRightVelocity;
      this.velocity[1] = upDownVelocity;
      this.velocity[2] = forwardBackVelocity;
      this.deltaAngle[0] = upDownAngularVelocity;
      this.deltaAngle[1] = leftRightAngularVelocity;

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
}
