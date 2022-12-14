import './styles/index.scss';

import Camera from './camera';
import { vec3 } from 'gl-matrix';


export interface SceneContext {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  camera: Camera;
  size: [number, number],
  time: number,

  zenithAngle: number;
  azimuthAngle: number;

  get sunDirection(): vec3;
  get sunIntensity(): number;

  sunDirection: vec3;
  sunIntensity: number;
}

export type RenderStep =
  | ((ctx: SceneContext, delta: DOMHighResTimeStamp) => void)
  | ((ctx: SceneContext) => void);

type EventListenersRecord = Partial<{
  [K in keyof HTMLElementEventMap]: Map<
    (ctx: SceneContext, e: HTMLElementEventMap[K]) => void,
    (e: HTMLElementEventMap[K]) => void
  >
}>;

export default class Renderer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  resizeObserver: ResizeObserver;
  camera: Camera;
  raf?: ReturnType<typeof requestAnimationFrame>;
  startTime?: DOMHighResTimeStamp;
  eventListeners: EventListenersRecord = {};

  private sunParameters = {
    zenithAngle: -1,
    azimuthAngle: 2.9,
  };

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
    this.camera.updateSize(this.width, this.height);
  }
  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }


  /**
   * Context objects are a consistent encoding of relevant scene info that’s passed to all render
   * steps
   */
  get sceneContext(): SceneContext {
    const { sunParameters } = this;
    return {
      canvas: this.canvas,
      gl: this.gl,
      camera: this.camera,
      size: [this.width, this.height],
      time: this.startTime ? (performance.now() - this.startTime) : -1,

      get zenithAngle() { return sunParameters.zenithAngle; },
      set zenithAngle(value) { sunParameters.zenithAngle = value; },
      get azimuthAngle() { return sunParameters.azimuthAngle; },
      set azimuthAngle(value) { sunParameters.azimuthAngle = value; },

      get sunDirection() {
        return vec3.fromValues(
          -Math.sin(this.azimuthAngle) * Math.sin(this.zenithAngle),
          Math.cos(this.zenithAngle),
          Math.cos(this.azimuthAngle) * Math.sin(this.zenithAngle),
        );
      },
      get sunIntensity() {
        return this.zenithAngle > 1.5707
          ? 0.0
          : Math.pow(Math.cos(this.zenithAngle * 2.0) + 1.0, 0.1);
      },
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
  addRenderStep(step: RenderStep, beforeFrame = false) {
    if (beforeFrame) this.beforeFrameSteps.push(step);
    else this.renderSteps.push(step);
  }


  /** Remove a render step */
  removeRenderStep(step: RenderStep, beforeFrame = false) {
    const stepsArr = beforeFrame ? this.beforeFrameSteps : this.renderSteps;
    stepsArr.splice(stepsArr.indexOf(step), 1);
  }


  addEventListener<T extends keyof HTMLElementEventMap>(
    eventName: T,
    listener: (ctx: SceneContext, event: HTMLElementEventMap[T]) => void,
    options?: Parameters<(typeof this.canvas)['addEventListener']>[2],
  ) {
    const wrappedListener = (e: HTMLElementEventMap[T]) => listener(this.sceneContext, e);
    let listeners = this.eventListeners[eventName];
    if (!listeners) {
      listeners = new Map();
      this.eventListeners[eventName] = listeners;
    }
    listeners.set(listener, wrappedListener);
    this.canvas.addEventListener(eventName, wrappedListener, options);
  }

  removeEventListener<T extends keyof HTMLElementEventMap>(eventName: T, listener: (ctx: SceneContext, event: HTMLElementEventMap[T]) => void) {
    const listeners = this.eventListeners[eventName];
    if (!listeners) return;
    const wrappedListener = listeners.get(listener);
    if (!wrappedListener) return;
    this.canvas.removeEventListener(eventName, wrappedListener);
    listeners.delete(listener);
  }

  /** Stop everything */
  cleanup() {
    this.stop();
    this.resizeObserver.disconnect();
    // Get the “entry type” (a value of this.eventListeners) given its key as a string type
    type EventEntryType<T> = T extends keyof HTMLElementEventMap ? [T, EventListenersRecord[T]] : never;
    // Get event listener entries, strongly typed
    const entries = Object.entries(this.eventListeners) as EventEntryType<keyof HTMLElementEventMap>[];

    entries.forEach(([eventName, listeners]) => {
      if (!listeners) return;
      listeners.forEach((_, original) => {
        this.removeEventListener(eventName, original as (ctx: SceneContext, event: HTMLElementEventMap[typeof eventName]) => void);
      });
    });
  }
}
