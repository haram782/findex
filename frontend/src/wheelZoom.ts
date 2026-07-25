interface ZoomWindow {
  min: number;
  max: number;
}

interface AnimationScheduler {
  request: (callback: FrameRequestCallback) => number;
  cancel: (frame: number) => void;
}

interface SmoothWheelZoomOptions {
  bounds: ZoomWindow;
  minRange: number;
  step: number;
  duration?: number;
}

export interface SmoothWheelZoomController {
  zoom: (deltaY: number, focalRatio?: number) => void;
  reset: () => void;
  destroy: () => void;
}

interface ZoomChart {
  canvas: HTMLCanvasElement | null;
  ctx?: CanvasRenderingContext2D | null;
  attached?: boolean;
  chartArea: {
    left: number;
    width: number;
  };
  scales: Record<string, { min: number; max: number } | undefined>;
  zoomScale: (
    id: string,
    range: ZoomWindow,
    mode?: "none"
  ) => void;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const moveTowards = (
  current: number,
  target: number,
  maximumMovement: number
): number => {
  const difference = target - current;
  if (Math.abs(difference) <= maximumMovement) {
    return target;
  }
  return current + Math.sign(difference) * maximumMovement;
};

export function getWheelZoomTarget(
  window: ZoomWindow,
  bounds: ZoomWindow,
  deltaY: number,
  focalRatio: number,
  step: number,
  minRange = 2
): ZoomWindow {
  const boundsRange = Math.max(bounds.max - bounds.min, 0);
  const currentRange = Math.max(window.max - window.min, 0);
  const minimumRange = Math.min(minRange, boundsRange);
  const normalizedDelta = clamp(deltaY / 100, -1, 1);

  if (
    normalizedDelta === 0 ||
    boundsRange === 0 ||
    (normalizedDelta < 0 && currentRange <= minimumRange)
  ) {
    return window;
  }

  const baseRange =
    normalizedDelta > 0
      ? Math.max(currentRange, minimumRange)
      : currentRange;
  const nextRange = clamp(
    baseRange + normalizedDelta * step,
    minimumRange,
    boundsRange
  );
  const ratio = clamp(focalRatio, 0, 1);
  const anchor = window.min + currentRange * ratio;
  let min = anchor - nextRange * ratio;
  let max = min + nextRange;

  if (min < bounds.min) {
    max += bounds.min - min;
    min = bounds.min;
  }
  if (max > bounds.max) {
    min -= max - bounds.max;
    max = bounds.max;
  }

  return {
    min: clamp(min, bounds.min, bounds.max),
    max: clamp(max, bounds.min, bounds.max)
  };
}

const browserScheduler: AnimationScheduler = {
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (frame) => window.cancelAnimationFrame(frame)
};

export function createSmoothWheelZoom(
  chart: ZoomChart,
  options: SmoothWheelZoomOptions,
  scheduler: AnimationScheduler = browserScheduler
): SmoothWheelZoomController {
  const canvas = chart.canvas;
  if (!canvas) {
    return {
      zoom: () => undefined,
      reset: () => undefined,
      destroy: () => undefined
    };
  }

  const duration = options.duration ?? 90;
  let frame: number | null = null;
  let lastTimestamp: number | null = null;
  let target: ZoomWindow | null = null;
  let destroyed = false;

  const isChartActive = () =>
    !destroyed &&
    chart.canvas === canvas &&
    chart.ctx !== null &&
    chart.attached !== false;

  const stopAnimation = () => {
    if (frame !== null) {
      scheduler.cancel(frame);
    }
    frame = null;
    lastTimestamp = null;
    target = null;
  };

  const animate = (timestamp: number) => {
    if (!isChartActive()) {
      stopAnimation();
      return;
    }

    const scale = chart.scales.x;
    if (!scale || !target) {
      stopAnimation();
      return;
    }

    if (lastTimestamp === null) {
      lastTimestamp = timestamp;
      frame = scheduler.request(animate);
      return;
    }

    const elapsed = Math.min(timestamp - lastTimestamp, 34);
    const maximumMovement =
      (options.step * elapsed) / Math.max(duration * 2, 1);
    const min = moveTowards(scale.min, target.min, maximumMovement);
    const max = moveTowards(scale.max, target.max, maximumMovement);

    chart.zoomScale("x", { min, max }, "none");
    lastTimestamp = timestamp;

    if (min === target.min && max === target.max) {
      frame = null;
      lastTimestamp = null;
      target = null;
      return;
    }
    frame = scheduler.request(animate);
  };

  const zoom = (deltaY: number, focalRatio = 0.5) => {
    if (!isChartActive()) {
      return;
    }

    const scale = chart.scales.x;
    if (!scale) {
      return;
    }

    const current = target ?? { min: scale.min, max: scale.max };
    const next = getWheelZoomTarget(
      current,
      options.bounds,
      deltaY,
      focalRatio,
      options.step,
      options.minRange
    );
    if (next.min === current.min && next.max === current.max) {
      return;
    }
    target = next;

    if (frame === null) {
      frame = scheduler.request(animate);
    }
  };

  const handleWheel = (event: WheelEvent) => {
    if (event.deltaY === 0 || !isChartActive()) {
      return;
    }
    event.preventDefault();

    const rectangle = canvas.getBoundingClientRect();
    const chartWidth = Math.max(chart.chartArea.width, 1);
    const focalRatio =
      (event.clientX - rectangle.left - chart.chartArea.left) / chartWidth;
    const deltaMultiplier =
      event.deltaMode === 1
        ? 16
        : event.deltaMode === 2
          ? canvas.clientHeight
          : 1;

    zoom(event.deltaY * deltaMultiplier, focalRatio);
  };

  canvas.addEventListener("wheel", handleWheel, { passive: false });
  canvas.addEventListener("pointerdown", stopAnimation);

  return {
    zoom,
    reset: stopAnimation,
    destroy: () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("pointerdown", stopAnimation);
      stopAnimation();
    }
  };
}
