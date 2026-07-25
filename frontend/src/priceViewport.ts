import type { MarketChartPoint } from "./chartData";

export interface PriceViewportRange {
  min: number;
  max: number;
}

interface PriceViewportScale extends PriceViewportRange {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

interface PriceAxisDragState {
  startClientY: number;
  minimum: number;
  span: number;
  height: number;
}

interface PriceViewportDataset {
  data: readonly unknown[];
  hidden?: boolean;
  yAxisID?: string;
}

export interface PriceViewportChart {
  canvas: HTMLCanvasElement | null;
  ctx?: CanvasRenderingContext2D | null;
  attached?: boolean;
  data: {
    datasets: readonly PriceViewportDataset[];
  };
  scales: Record<string, PriceViewportScale | undefined>;
  isDatasetVisible?: (datasetIndex: number) => boolean;
  resetZoom: (mode?: "none") => void;
  zoomScale: (
    scaleId: string,
    range: PriceViewportRange,
    mode?: "none"
  ) => void;
}

export interface PriceAxisInteractionController {
  destroy: () => void;
}

const isFiniteRange = (
  scale: PriceViewportScale | undefined
): scale is PriceViewportScale =>
  Boolean(
    scale &&
      Number.isFinite(scale.min) &&
      Number.isFinite(scale.max) &&
      scale.max > scale.min
  );

const isMarketChartPoint = (
  value: unknown
): value is MarketChartPoint & { y: number } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const point = value as Partial<MarketChartPoint>;
  return (
    typeof point.x === "number" &&
    Number.isFinite(point.x) &&
    typeof point.y === "number" &&
    Number.isFinite(point.y)
  );
};

const isDatasetVisible = (
  chart: PriceViewportChart,
  dataset: PriceViewportDataset,
  index: number
): boolean =>
  chart.isDatasetVisible
    ? chart.isDatasetVisible(index)
    : dataset.hidden !== true;

export function getVisiblePriceViewportTarget(
  chart: PriceViewportChart | null | undefined
): PriceViewportRange | null {
  const xScale = chart?.scales.x;
  const priceScale = chart?.scales.price;
  if (!chart || !isFiniteRange(xScale) || !isFiniteRange(priceScale)) {
    return null;
  }

  let retainedCount = 0;
  let excludedCount = 0;
  let retainedMin = Number.POSITIVE_INFINITY;
  let retainedMax = Number.NEGATIVE_INFINITY;

  chart.data.datasets.forEach((dataset, datasetIndex) => {
    if (
      dataset.yAxisID !== "price" ||
      !isDatasetVisible(chart, dataset, datasetIndex)
    ) {
      return;
    }

    dataset.data.forEach((rawPoint) => {
      if (
        !isMarketChartPoint(rawPoint) ||
        rawPoint.x < xScale.min ||
        rawPoint.x > xScale.max
      ) {
        return;
      }

      if (
        rawPoint.y < priceScale.min ||
        rawPoint.y > priceScale.max
      ) {
        excludedCount += 1;
        return;
      }

      retainedCount += 1;
      retainedMin = Math.min(retainedMin, rawPoint.y);
      retainedMax = Math.max(retainedMax, rawPoint.y);
    });
  });

  const retainedSpan = retainedMax - retainedMin;
  const provisionalSpan = priceScale.max - priceScale.min;
  if (
    excludedCount === 0 ||
    retainedCount < 2 ||
    retainedSpan > provisionalSpan * 0.85
  ) {
    return null;
  }

  const padding =
    retainedSpan > 0
      ? retainedSpan * 0.08
      : Math.max(Math.abs(retainedMax) * 0.02, 1);
  const target = {
    min: Math.max(priceScale.min, retainedMin - padding, 0),
    max: Math.min(priceScale.max, retainedMax + padding)
  };
  return target.max > target.min ? target : null;
}

export function fitVisiblePriceViewport(
  chart: PriceViewportChart | null | undefined
): PriceViewportRange | null {
  const target = getVisiblePriceViewportTarget(chart);
  if (chart && target) {
    chart.zoomScale("price", target, "none");
  }
  return target;
}

const isChartActive = (
  chart: PriceViewportChart,
  canvas: HTMLCanvasElement
): boolean =>
  chart.canvas === canvas &&
  chart.ctx !== null &&
  chart.attached !== false;

const isInsidePriceAxis = (
  chart: PriceViewportChart,
  canvas: HTMLCanvasElement,
  event: MouseEvent | PointerEvent
): boolean => {
  const scale = chart.scales.price;
  if (
    !scale ||
    !Number.isFinite(scale.left) ||
    !Number.isFinite(scale.right) ||
    !Number.isFinite(scale.top) ||
    !Number.isFinite(scale.bottom)
  ) {
    return false;
  }

  const rectangle = canvas.getBoundingClientRect();
  const x = event.clientX - rectangle.left;
  const y = event.clientY - rectangle.top;
  return (
    x >= (scale.left as number) &&
    x <= (scale.right as number) &&
    y >= (scale.top as number) &&
    y <= (scale.bottom as number)
  );
};

export function createPriceAxisInteraction(
  chart: PriceViewportChart | null | undefined
): PriceAxisInteractionController {
  const canvas = chart?.canvas;
  if (!chart || !canvas) {
    return { destroy: () => undefined };
  }

  const initialCursor = canvas.style.cursor;
  const ownerWindow = canvas.ownerDocument.defaultView;
  let destroyed = false;
  let dragState: PriceAxisDragState | null = null;

  const restoreCursor = () => {
    if (dragState) {
      return;
    }
    canvas.style.cursor = initialCursor;
  };

  const handleMove = (event: MouseEvent | PointerEvent) => {
    if (
      !destroyed &&
      isChartActive(chart, canvas) &&
      isInsidePriceAxis(chart, canvas, event)
    ) {
      canvas.style.cursor = "ns-resize";
      return;
    }
    restoreCursor();
  };

  const stopDragging = () => {
    dragState = null;
    ownerWindow?.removeEventListener("mousemove", handleDrag);
    ownerWindow?.removeEventListener("mouseup", handleDragEnd);
    ownerWindow?.removeEventListener("pointermove", handlePointerDrag);
    ownerWindow?.removeEventListener("pointerup", handlePointerDragEnd);
    ownerWindow?.removeEventListener("pointercancel", handlePointerDragEnd);
    canvas.style.cursor = initialCursor;
  };

  const handleDrag = (event: MouseEvent | PointerEvent) => {
    const state = dragState;
    if (
      !state ||
      destroyed ||
      !isChartActive(chart, canvas)
    ) {
      stopDragging();
      return;
    }

    event.preventDefault();
    const distanceRatio =
      (event.clientY - state.startClientY) / state.height;
    const scaleFactor = Math.min(
      5,
      Math.max(0.05, 1 + distanceRatio * 1.1)
    );
    chart.zoomScale(
      "price",
      {
        min: state.minimum,
        max: state.minimum + Math.max(state.span * scaleFactor, 1)
      },
      "none"
    );
  };

  const handleDragEnd = (event: MouseEvent | PointerEvent) => {
    if (!dragState) {
      return;
    }

    event.preventDefault();
    const shouldFit =
      !destroyed && isChartActive(chart, canvas);
    stopDragging();
    if (shouldFit) {
      fitVisiblePriceViewport(chart);
    }
  };

  const handlePointerDrag = (event: PointerEvent) => {
    handleDrag(event);
  };

  const handlePointerDragEnd = (event: PointerEvent) => {
    handleDragEnd(event);
  };

  const handleDragStart = (event: MouseEvent | PointerEvent) => {
    const priceScale = chart.scales.price;
    if (
      destroyed ||
      !ownerWindow ||
      !isChartActive(chart, canvas) ||
      !isInsidePriceAxis(chart, canvas, event) ||
      !isFiniteRange(priceScale)
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    if (dragState) {
      return;
    }

    const isPointerInput = event.type === "pointerdown";
    dragState = {
      startClientY: event.clientY,
      minimum: priceScale.min,
      span: priceScale.max - priceScale.min,
      height: Math.max(
        (priceScale.bottom as number) - (priceScale.top as number),
        1
      )
    };
    canvas.style.cursor = "ns-resize";
    if (isPointerInput) {
      ownerWindow.addEventListener("pointermove", handlePointerDrag);
      ownerWindow.addEventListener("pointerup", handlePointerDragEnd);
      ownerWindow.addEventListener("pointercancel", handlePointerDragEnd);
    } else {
      ownerWindow.addEventListener("mousemove", handleDrag);
      ownerWindow.addEventListener("mouseup", handleDragEnd);
    }
  };

  const handlePointerDragStart = (event: PointerEvent) => {
    handleDragStart(event);
  };

  const handleDoubleClick = (event: MouseEvent) => {
    if (
      destroyed ||
      !isChartActive(chart, canvas) ||
      !isInsidePriceAxis(chart, canvas, event)
    ) {
      return;
    }

    const xScale = chart.scales.x;
    if (!isFiniteRange(xScale)) {
      return;
    }

    const savedXRange = { min: xScale.min, max: xScale.max };
    chart.resetZoom("none");
    chart.zoomScale("x", savedXRange, "none");
  };

  canvas.addEventListener("pointerdown", handlePointerDragStart, true);
  canvas.addEventListener("mousedown", handleDragStart, true);
  canvas.addEventListener("mousemove", handleMove);
  canvas.addEventListener("pointermove", handleMove);
  canvas.addEventListener("mouseleave", restoreCursor);
  canvas.addEventListener("dblclick", handleDoubleClick);

  return {
    destroy: () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      stopDragging();
      canvas.removeEventListener(
        "pointerdown",
        handlePointerDragStart,
        true
      );
      canvas.removeEventListener("mousedown", handleDragStart, true);
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("mouseleave", restoreCursor);
      canvas.removeEventListener("dblclick", handleDoubleClick);
      restoreCursor();
    }
  };
}
