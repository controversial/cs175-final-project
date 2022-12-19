import './styles/index.scss';

import Camera from './camera';
import type { vec3 } from 'gl-matrix';


export interface SceneContext {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  camera: Camera;
  size: [number, number],
  time: number,

  sunDirection?: vec3;
  sunIntensity?: number;
}

export type RenderStep = (ctx: SceneContext, delta: DOMHighResTimeStamp) => void;


export default class Renderer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  resizeObserver: ResizeObserver;
  camera: Camera;
  raf?: ReturnType<typeof requestAnimationFrame>;
  startTime?: DOMHighResTimeStamp;

  // Rendering is split into “steps”
  beforeFrameSteps: RenderStep[] = [];
  renderSteps: RenderStep[] = [];

  constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    this.camera = new Camera(this.canvas);
    this.camera.attachKeyControls();
    this.updateCanvasSize();
    this.resizeObserver = new ResizeObserver(() => this.updateCanvasSize());
    this.resizeObserver.observe(this.canvas);
  }



  private updateCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * (window.devicePixelRatio ?? 1);
    this.canvas.height = rect.height * (window.devicePixelRatio ?? 1);
    this.camera.updateAspect(this.width, this.height);
  }
  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }


  /**
   * Context objects are a consistent encoding of relevant scene info that’s passed to all render
   * steps
   */
  get sceneContext(): SceneContext {
    return {
      canvas: this.canvas,
      gl: this.gl,
      camera: this.camera,
      size: [this.width, this.height],
      time: this.startTime ? (performance.now() - this.startTime) : -1,
    };
  }

  /** Draw a single frame */
  draw(delta: DOMHighResTimeStamp) {
    const context = this.sceneContext;
    // Do setup steps
    this.beforeFrameSteps.forEach((step) => step(context, delta));

    // Prepare for drawing new frame
    const { gl } = this;
    gl.viewport(0, 0, this.width, this.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.camera.update(delta);

    // Do render steps
    this.renderSteps.forEach((step) => step(context, delta));
  }

  /** Start render loop */
  start() {
    const now = performance.now();
    this.startTime = now;
    let previousTime = now;

    const frame = (time: DOMHighResTimeStamp) => {
      const delta = time - previousTime;
      previousTime = time;
      this.draw(delta);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  /** Stop render loop */
  stop() {
    if (typeof this.raf === 'undefined') return;
    cancelAnimationFrame(this.raf);
    this.raf = undefined;
  }



  /**
   * Add a new “render” step—a function that will be called with appropriate context during the
   * “draw” part of every frame
   */
  addRenderStep(step: (context: SceneContext) => void, beforeFrame = false) {
    if (beforeFrame) this.beforeFrameSteps.push(step);
    else this.renderSteps.push(step);
  }


  /** Remove a render step */
  removeRenderStep(step: (context: SceneContext) => void, beforeFrame = false) {
    const stepsArr = beforeFrame ? this.beforeFrameSteps : this.renderSteps;
    stepsArr.splice(stepsArr.indexOf(step), 1);
  }


  /** Stop everything */
  cleanup() {
    this.stop();
    this.resizeObserver.disconnect();
  }
}
