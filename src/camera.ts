import { vec3, mat4, quat, vec2 } from 'gl-matrix';
import { canvas } from './context';

const moveSpeed = 0.01;
const rotateSpeed = 1;

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
updatePosition();
updateRotation();
orient();

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

export function orient() {
  updatePosition();
  updateRotation();
  vec3.negate(invEyePos, eyePosition);
  mat4.fromTranslation(viewMatrix, invEyePos);
  quat.invert(rotationQuat, rotationQuat);
  mat4.fromQuat(invRotation, rotationQuat);
  mat4.multiply(viewMatrix, invRotation, viewMatrix);
}

export function updatePosition() {
  vec3.scaleAndAdd(eyePosition, eyePosition, rightVector, velocity[0]);
  vec3.scaleAndAdd(eyePosition, eyePosition, upVector, velocity[1]);
  vec3.scaleAndAdd(eyePosition, eyePosition, lookVector, velocity[2]);
}

export function updateRotation() {
  vec2.add(angles, angles, deltaAngle);
  quat.fromEuler(rotationQuat, angles[0], angles[1], 0);
  vec3.transformQuat(lookVector, [0, 0, -1], rotationQuat);
  vec3.transformQuat(rightVector, [-1, 0, 0], rotationQuat);
  vec3.set(upVector, 0, 1, 0);
}

export function attachCameraKeyControls() {
  addEventListener('keydown', (e) => {
    switch (e.key) {
    case 'w': velocity[2] =  moveSpeed; break;
    case 'a': velocity[0] =  moveSpeed; break;
    case 's': velocity[2] = -moveSpeed; break;
    case 'd': velocity[0] = -moveSpeed; break;
    case 'q': velocity[1] = -moveSpeed; break;
    case 'e': velocity[1] =  moveSpeed; break;

    case 'W': velocity[2] =  moveSpeed * 2.0; break;
    case 'A': velocity[0] =  moveSpeed * 2.0; break;
    case 'S': velocity[2] = -moveSpeed * 2.0; break;
    case 'D': velocity[0] = -moveSpeed * 2.0; break;
    case 'Q': velocity[1] = -moveSpeed * 2.0; break;
    case 'E': velocity[1] =  moveSpeed * 2.0; break;

    case 'i': deltaAngle[0] =  rotateSpeed; break;
    case 'j': deltaAngle[1] =  rotateSpeed; break;
    case 'k': deltaAngle[0] = -rotateSpeed; break;
    case 'l': deltaAngle[1] = -rotateSpeed; break;
    }

    console.log(lookVector);
  });

  addEventListener('keyup', (e) => {
    switch (e.key) {
    case 'w': case 'W': velocity[2] = 0; break;
    case 'a': case 'A': velocity[0] = 0; break;
    case 's': case 'S': velocity[2] = 0; break;
    case 'd': case 'D': velocity[0] = 0; break;
    case 'q': case 'Q': velocity[1] = 0; break;
    case 'e': case 'E': velocity[1] = 0; break;

    case 'i': deltaAngle[0] = 0; break;
    case 'j': deltaAngle[1] = 0; break;
    case 'k': deltaAngle[0] = 0; break;
    case 'l': deltaAngle[1] = 0; break;
    }
  });
}
