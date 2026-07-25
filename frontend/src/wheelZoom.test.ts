import { describe, expect, it, vi } from "vitest";
import {
  createSmoothWheelZoom,
  getWheelZoomTarget
} from "./wheelZoom";

const bounds = { min: 0, max: 40 };

describe("고정 단계 휠 줌", () => {
  it("현재 확대율과 무관하게 한 번의 휠 입력으로 같은 폭만 변경한다", () => {
    const wide = getWheelZoomTarget(
      { min: 5, max: 25 },
      bounds,
      -100,
      0.5,
      2
    );
    const narrow = getWheelZoomTarget(
      { min: 10, max: 20 },
      bounds,
      -100,
      0.5,
      2
    );

    expect(wide.max - wide.min).toBeCloseTo(18);
    expect(narrow.max - narrow.min).toBeCloseTo(8);
  });

  it("큰 휠 이벤트도 한 프레임의 최대 단계로 제한한다", () => {
    const regular = getWheelZoomTarget(
      { min: 5, max: 25 },
      bounds,
      100,
      0.5,
      2
    );
    const momentum = getWheelZoomTarget(
      { min: 5, max: 25 },
      bounds,
      800,
      0.5,
      2
    );

    expect(momentum).toEqual(regular);
  });

  it("포인터 위치를 기준으로 확대하면서 전체 허용 범위를 넘지 않는다", () => {
    const target = getWheelZoomTarget(
      { min: 0, max: 10 },
      bounds,
      -100,
      0.8,
      2
    );

    expect(target.min).toBeCloseTo(1.6);
    expect(target.max).toBeCloseTo(9.6);
  });

  it("목표 구간까지 여러 프레임에 걸쳐 일정 폭으로 이동한다", () => {
    const canvas = document.createElement("canvas");
    const scale = { min: 5, max: 25 };
    const zoomScale = vi.fn(
      (_id: string, range: { min: number; max: number }) => {
        scale.min = range.min;
        scale.max = range.max;
      }
    );
    const chart = {
      canvas,
      chartArea: { left: 0, right: 400, top: 0, bottom: 300, width: 400 },
      scales: { x: scale },
      zoomScale
    } as unknown as Parameters<typeof createSmoothWheelZoom>[0];
    const callbacks: FrameRequestCallback[] = [];
    const scheduler = {
      cancel: vi.fn(),
      request: (callback: FrameRequestCallback) => {
        callbacks.push(callback);
        return callbacks.length;
      }
    };
    const controller = createSmoothWheelZoom(
      chart,
      {
        bounds,
        duration: 90,
        minRange: 2,
        step: 2
      },
      scheduler
    );

    controller.zoom(-100);
    let timestamp = 0;
    while (callbacks.length > 0 && timestamp < 1000) {
      timestamp += 16;
      callbacks.shift()?.(timestamp);
    }

    expect(zoomScale.mock.calls.length).toBeGreaterThan(1);
    expect(scale.min).toBeCloseTo(6);
    expect(scale.max).toBeCloseTo(24);
    controller.destroy();
  });

  it("팬이나 핀치 입력이 시작되면 진행 중인 애니메이션을 중지한다", () => {
    const canvas = document.createElement("canvas");
    const scheduler = {
      cancel: vi.fn(),
      request: vi.fn(() => 17)
    };
    const chart = {
      canvas,
      chartArea: { left: 0, width: 400 },
      scales: { x: { min: 5, max: 25 } },
      zoomScale: vi.fn()
    } as unknown as Parameters<typeof createSmoothWheelZoom>[0];
    const controller = createSmoothWheelZoom(
      chart,
      { bounds, minRange: 2, step: 2 },
      scheduler
    );

    controller.zoom(-100);
    canvas.dispatchEvent(new Event("pointerdown"));

    expect(scheduler.cancel).toHaveBeenCalledWith(17);
    (
      chart as unknown as {
        canvas: HTMLCanvasElement | null;
      }
    ).canvas = null;
    expect(() => controller.destroy()).not.toThrow();
  });
});
