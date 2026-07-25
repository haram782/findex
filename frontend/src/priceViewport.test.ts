import { describe, expect, it, vi } from "vitest";
import {
  createPriceAxisInteraction,
  fitVisiblePriceViewport,
  getVisiblePriceViewportTarget,
  type PriceViewportChart
} from "./priceViewport";

const point = (x: number, y: number | null) => ({
  x,
  y,
  priceUnit: "원/kg"
});

const createChart = (
  datasets: PriceViewportChart["data"]["datasets"],
  overrides: Partial<PriceViewportChart> = {}
): PriceViewportChart => ({
  canvas: document.createElement("canvas"),
  data: { datasets },
  scales: {
    x: { min: 0, max: 3 },
    price: {
      min: 0,
      max: 500,
      left: 300,
      right: 400,
      top: 0,
      bottom: 200
    }
  },
  resetZoom: vi.fn(),
  zoomScale: vi.fn(),
  ...overrides
});

describe("가격 viewport smart-fit", () => {
  it("현재 가격 범위 밖 spike를 제외하고 유지 값에 8% 여백을 적용한다", () => {
    const chart = createChart([
      {
        yAxisID: "price",
        data: [point(0, 100), point(1, 110), point(2, 120), point(3, 900)]
      }
    ]);

    expect(getVisiblePriceViewportTarget(chart)).toEqual({
      min: 98.4,
      max: 121.6
    });
  });

  it("숨김·거래량·null·x viewport 밖·비유한 raw 값은 후보에서 제외한다", () => {
    const chart = createChart(
      [
        {
          yAxisID: "price",
          data: [
            point(0, 100),
            point(1, 120),
            point(2, null),
            point(8, 2_000),
            point(2, Number.NaN),
            point(3, 900)
          ]
        },
        {
          yAxisID: "price",
          data: [point(1, 3_000)],
          hidden: true
        },
        {
          yAxisID: "volume",
          data: [point(1, 4_000)]
        }
      ],
      {
        isDatasetVisible: (index) => index !== 1
      }
    );

    expect(getVisiblePriceViewportTarget(chart)).toEqual({
      min: 98.4,
      max: 121.6
    });
  });

  it.each([
    ["빈 후보", []],
    ["단일 유지 값", [point(0, 100), point(1, 900)]],
    ["제외 값 없음", [point(0, 100), point(1, 120)]]
  ])("%s이면 target을 만들지 않는다", (_name, data) => {
    const chart = createChart([{ yAxisID: "price", data }]);

    expect(getVisiblePriceViewportTarget(chart)).toBeNull();
  });

  it("유지 폭이 provisional 폭의 85%이면 허용하고 그보다 크면 거부한다", () => {
    const boundary = createChart(
      [
        {
          yAxisID: "price",
          data: [point(0, 0), point(1, 85), point(2, 101)]
        }
      ],
      {
        scales: {
          x: { min: 0, max: 2 },
          price: { min: 0, max: 100 }
        }
      }
    );
    const tooWide = createChart(
      [
        {
          yAxisID: "price",
          data: [point(0, 0), point(1, 86), point(2, 101)]
        }
      ],
      {
        scales: {
          x: { min: 0, max: 2 },
          price: { min: 0, max: 100 }
        }
      }
    );

    expect(getVisiblePriceViewportTarget(boundary)).toEqual({
      min: 0,
      max: 91.8
    });
    expect(getVisiblePriceViewportTarget(tooWide)).toBeNull();
  });

  it("같은 가격의 유지 값만 있으면 유효한 최소 여백을 적용한다", () => {
    const chart = createChart([
      {
        yAxisID: "price",
        data: [point(0, 100), point(1, 100), point(2, 900)]
      }
    ]);

    expect(getVisiblePriceViewportTarget(chart)).toEqual({
      min: 98,
      max: 102
    });
  });

  it("smart-fit 여백은 사용자가 잘라낸 기존 viewport 밖 값을 다시 포함하지 않는다", () => {
    const chart = createChart(
      [
        {
          yAxisID: "price",
          data: [point(0, 10), point(1, 20), point(2, 20.5)]
        }
      ],
      {
        scales: {
          x: { min: 0, max: 2 },
          price: { min: 0, max: 20 }
        }
      }
    );

    expect(getVisiblePriceViewportTarget(chart)).toEqual({
      min: 9.2,
      max: 20
    });
  });

  it("target이 있을 때만 price scale을 animation 없이 맞춘다", () => {
    const zoomScale = vi.fn();
    const chart = createChart(
      [
        {
          yAxisID: "price",
          data: [point(0, 100), point(1, 120), point(2, 900)]
        }
      ],
      { zoomScale }
    );
    const noTarget = createChart([
      {
        yAxisID: "price",
        data: [point(0, 100), point(1, 120)]
      }
    ]);

    expect(fitVisiblePriceViewport(chart)).toEqual({
      min: 98.4,
      max: 121.6
    });
    expect(zoomScale).toHaveBeenCalledWith(
      "price",
      { min: 98.4, max: 121.6 },
      "none"
    );
    expect(fitVisiblePriceViewport(noTarget)).toBeNull();
    expect(noTarget.zoomScale).not.toHaveBeenCalled();
  });
});

describe("가격축 상호작용", () => {
  const setRectangle = (canvas: HTMLCanvasElement) => {
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 410,
      bottom: 220,
      width: 400,
      height: 200,
      toJSON: () => ({})
    });
  };

  it("가격축 위 드래그는 가격 간격만 선형 조절하고 본문 pan 시작을 막는다", () => {
    const zoomScale = vi.fn();
    const chart = createChart([], {
      zoomScale,
      scales: {
        x: { min: 5, max: 15 },
        price: {
          min: 80,
          max: 160,
          left: 300,
          right: 400,
          top: 0,
          bottom: 200
        }
      }
    });
    const canvas = chart.canvas as HTMLCanvasElement;
    setRectangle(canvas);
    const bodyPanStart = vi.fn();
    canvas.addEventListener("mousedown", bodyPanStart);
    const controller = createPriceAxisInteraction(chart);

    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        clientX: 360,
        clientY: 100
      })
    );
    window.dispatchEvent(
      new MouseEvent("mousemove", {
        cancelable: true,
        clientX: 360,
        clientY: 60
      })
    );
    window.dispatchEvent(
      new MouseEvent("mouseup", {
        cancelable: true,
        clientX: 360,
        clientY: 60
      })
    );

    expect(bodyPanStart).not.toHaveBeenCalled();
    expect(zoomScale).toHaveBeenCalledTimes(1);
    expect(zoomScale).toHaveBeenCalledWith(
      "price",
      { min: 80, max: 142.4 },
      "none"
    );
    expect(chart.scales.x).toMatchObject({ min: 5, max: 15 });
    controller.destroy();
  });

  it("pointerdown 단계에서 가격축 gesture를 선점해 X pan으로 새지 않게 한다", () => {
    const zoomScale = vi.fn();
    const chart = createChart([], { zoomScale });
    const canvas = chart.canvas as HTMLCanvasElement;
    setRectangle(canvas);
    const pluginPointerStart = vi.fn();
    canvas.addEventListener("pointerdown", pluginPointerStart);
    const controller = createPriceAxisInteraction(chart);
    const pointerEvent = new Event("pointerdown", {
      bubbles: true,
      cancelable: true
    });
    Object.defineProperties(pointerEvent, {
      clientX: { value: 360 },
      clientY: { value: 100 }
    });

    canvas.dispatchEvent(pointerEvent);
    const pointerMove = new Event("pointermove", { cancelable: true });
    Object.defineProperties(pointerMove, {
      clientX: { value: 360 },
      clientY: { value: 60 }
    });
    window.dispatchEvent(pointerMove);
    window.dispatchEvent(new Event("pointerup", { cancelable: true }));

    expect(pluginPointerStart).not.toHaveBeenCalled();
    expect(zoomScale).toHaveBeenCalledWith(
      "price",
      { min: 0, max: 390 },
      "none"
    );
    controller.destroy();
  });

  it("가격축 안에서 cursor를 바꾸고 더블클릭 reset 뒤 x 범위를 복구한다", () => {
    const resetZoom = vi.fn();
    const zoomScale = vi.fn();
    const chart = createChart([], {
      resetZoom,
      zoomScale,
      scales: {
        x: { min: 5, max: 15 },
        price: {
          min: 80,
          max: 160,
          left: 300,
          right: 400,
          top: 0,
          bottom: 200
        }
      }
    });
    const canvas = chart.canvas as HTMLCanvasElement;
    setRectangle(canvas);
    const controller = createPriceAxisInteraction(chart);

    canvas.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 360, clientY: 100 })
    );
    canvas.dispatchEvent(
      new MouseEvent("dblclick", { clientX: 360, clientY: 100 })
    );

    expect(canvas.style.cursor).toBe("ns-resize");
    expect(resetZoom).toHaveBeenCalledWith("none");
    expect(zoomScale).toHaveBeenCalledWith(
      "x",
      { min: 5, max: 15 },
      "none"
    );
    expect(resetZoom.mock.invocationCallOrder[0]).toBeLessThan(
      zoomScale.mock.invocationCallOrder[0]
    );
    controller.destroy();
  });

  it("가격축 밖의 이동과 더블클릭은 차트를 변경하지 않는다", () => {
    const chart = createChart([]);
    const canvas = chart.canvas as HTMLCanvasElement;
    setRectangle(canvas);
    const controller = createPriceAxisInteraction(chart);

    canvas.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 200, clientY: 100 })
    );
    canvas.dispatchEvent(
      new MouseEvent("dblclick", { clientX: 200, clientY: 100 })
    );

    expect(canvas.style.cursor).toBe("");
    expect(chart.resetZoom).not.toHaveBeenCalled();
    expect(chart.zoomScale).not.toHaveBeenCalled();
    controller.destroy();
  });

  it("destroy가 listener와 cursor를 정리하고 중복 호출을 허용한다", () => {
    const chart = createChart([]);
    const canvas = chart.canvas as HTMLCanvasElement;
    canvas.style.cursor = "crosshair";
    setRectangle(canvas);
    const controller = createPriceAxisInteraction(chart);

    canvas.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 360, clientY: 100 })
    );
    controller.destroy();
    controller.destroy();
    canvas.dispatchEvent(
      new MouseEvent("dblclick", { clientX: 360, clientY: 100 })
    );

    expect(canvas.style.cursor).toBe("crosshair");
    expect(chart.resetZoom).not.toHaveBeenCalled();
    expect(chart.zoomScale).not.toHaveBeenCalled();
  });

  it("null canvas와 detached 차트에서는 안전하게 no-op한다", () => {
    expect(() =>
      createPriceAxisInteraction(null).destroy()
    ).not.toThrow();

    const nullChart = createChart([], { canvas: null });
    expect(() =>
      createPriceAxisInteraction(nullChart).destroy()
    ).not.toThrow();

    const detached = createChart([], { attached: false });
    const canvas = detached.canvas as HTMLCanvasElement;
    setRectangle(canvas);
    const controller = createPriceAxisInteraction(detached);

    canvas.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 360, clientY: 100 })
    );
    canvas.dispatchEvent(
      new MouseEvent("dblclick", { clientX: 360, clientY: 100 })
    );

    expect(canvas.style.cursor).toBe("");
    expect(detached.resetZoom).not.toHaveBeenCalled();
    expect(detached.zoomScale).not.toHaveBeenCalled();
    controller.destroy();
  });

  it("드래그 도중 detach된 차트는 release 시 smart-fit하지 않는다", () => {
    const zoomScale = vi.fn();
    const chart = createChart(
      [
        {
          yAxisID: "price",
          data: [point(0, 100), point(1, 120), point(2, 900)]
        }
      ],
      { zoomScale }
    );
    const canvas = chart.canvas as HTMLCanvasElement;
    setRectangle(canvas);
    const controller = createPriceAxisInteraction(chart);

    canvas.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        clientX: 360,
        clientY: 100
      })
    );
    chart.attached = false;
    window.dispatchEvent(
      new MouseEvent("mouseup", { cancelable: true, clientY: 100 })
    );

    expect(zoomScale).not.toHaveBeenCalled();
    controller.destroy();
  });
});
