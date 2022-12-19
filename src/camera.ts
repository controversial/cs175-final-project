import { vec3, vec4, mat4, quat, vec2 } from 'gl-matrix';


export class Ray {
  origin = vec3.create();
  direction = vec3.create();
  constructor(origin: vec3, direction: vec3) {
    this.origin = origin;
    this.direction = direction;
  }

  transform(m: mat4) {
    const originVec4 = vec4.fromValues(this.origin[0], this.origin[1], this.origin[2], 1);
    const directionVec4 = vec4.fromValues(this.direction[0], this.direction[1], this.direction[2], 0);
    const localOrigin = vec4.transformMat4(vec4.create(), originVec4, m);
    const localDirection = vec4.transformMat4(vec4.create(), directionVec4, m);
    return new Ray(
      vec3.fromValues(localOrigin[0], localOrigin[1], localOrigin[2]),
      vec3.fromValues(localDirection[0], localDirection[1], localDirection[2]),
    );
  }
}


function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}


export default class Camera {
  static moveSpeed = 0.05;
  static slowMoveSpeed = 0.05;
  static fastMoveSpeed = 1.0;
  static rotateSpeed = 0.5;

  angles = vec2.fromValues(-10, 0);
  deltaAngle = vec2.create();
  velocity = vec3.create();

  rotationQuat = quat.create();

  rightVector = vec3.create();
  upVector = vec3.create();
  lookVector = vec3.create();

  initialEyePosition = vec3.fromValues(0, 4, 4.5);
  eyePosition = vec3.fromValues(this.initialEyePosition[0], this.initialEyePosition[1], this.initialEyePosition[2]);
  viewMatrix = mat4.create();
  projectionMatrix = mat4.create();

  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  fieldOfView = 45 * Math.PI / 180; // radians

  invEyePos = vec3.create();
  invRotation = mat4.create();

  nearPlane = 0.001;
  farPlane = 100;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.updateAspect();
    this.update(0);
  }

  updateSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.updateAspect();
  }

  updateAspect() {
    mat4.perspective(this.projectionMatrix, this.fieldOfView, this.aspect, this.nearPlane, this.farPlane);
  }

  get aspect() { return this.width / this.height; }

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
    this.angles[0] = Math.min(this.angles[0], 88);
    this.angles[0] = Math.max(this.angles[0], -88);
    quat.fromEuler(this.rotationQuat, this.angles[0], this.angles[1], 0);
    vec3.transformQuat(this.lookVector, [0, 0, -1], this.rotationQuat);
    vec3.transformQuat(this.rightVector, [-1, 0, 0], this.rotationQuat);
    vec3.set(this.upVector, 0, 1, 0);
  }

  attachKeyControls() {
    const keysDown = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      keysDown.add(e.key.toLowerCase());
      if (e.shiftKey) keysDown.add('SHIFT');
      else keysDown.delete('SHIFT');
    };
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

      if (keysDown.has('SHIFT')) {
        Camera.moveSpeed = Camera.fastMoveSpeed;
      } else {
        Camera.moveSpeed = Camera.slowMoveSpeed;
      }

      if (keysDown.has('0')) {
        this.eyePosition = vec3.fromValues(this.initialEyePosition[0], this.initialEyePosition[1], this.initialEyePosition[2]);
      }

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

  getRayFromScreenCoords(x: number, y: number) {
    const rect = this.canvas.getBoundingClientRect();
    const xt = (x - rect.left) / rect.width;
    const yt = (y - rect.top) / rect.height;

    const H = this.nearPlane * Math.tan(this.fieldOfView / 2);
    const W = H * this.aspect;

    const a = -W + 2.0 * W * xt;
    const b = H - 2.0 * H * yt;

    // camera space -> world space
    const invViewMatrix = mat4.invert(mat4.create(), this.viewMatrix);

    const rayDirection = vec4.transformMat4(vec4.create(), vec4.fromValues(a, b, -this.nearPlane, 0), invViewMatrix);
    return new Ray(
      this.eyePosition,
      vec3.normalize(vec3.create(), vec3.fromValues(rayDirection[0], rayDirection[1], rayDirection[2])),
    );
  }
}
