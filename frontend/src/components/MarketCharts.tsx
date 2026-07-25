import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef
} from "react";
import { Chart } from "react-chartjs-2";
import {
  buildMarketChartData,
  type MarketChartPoint
} from "../chartData";
import {
  createMarketChartOptions,
  getZoomPadding
} from "../chartOptions";
import {
  buildCurrentPriceGuides,
  createCurrentPriceGuide,
  type CurrentPriceGuide,
  type CurrentPriceSource
} from "../currentPriceGuide";
import {
  createSmoothWheelZoom,
  type SmoothWheelZoomController
} from "../wheelZoom";
import type {
  ChartInterval,
  Theme,
  TimeSeriesPoint,
  VolumeMetric
} from "../types";

ChartJS.register(
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  zoomPlugin
);

interface MarketChartsProps {
  points: TimeSeriesPoint[];
  volumeMetric: VolumeMetric;
  theme: Theme;
  currentPrices: CurrentPriceSource[];
  chartInterval: ChartInterval;
}

export function MarketCharts({
  points,
  volumeMetric,
  theme,
  currentPrices,
  chartInterval
}: MarketChartsProps) {
  const marketChart =
    useRef<ChartJS<"line" | "bar", MarketChartPoint[], string> | null>(
      null
    );
  const wheelZoom = useRef<SmoothWheelZoomController | null>(null);
  const volumeMaximum = useMemo(
    () =>
      points.reduce(
        (maximum, point) => Math.max(maximum, point[volumeMetric]),
        0
      ),
    [points, volumeMetric]
  );
  const labelCount = useMemo(
    () => new Set(points.map((point) => point.date)).size,
    [points]
  );
  const zoomPadding = getZoomPadding(labelCount);
  const data = useMemo(
    () =>
      buildMarketChartData(
        points,
        volumeMetric,
        zoomPadding,
        chartInterval
      ),
    [chartInterval, points, volumeMetric, zoomPadding]
  );
  const chartLabelCount = data.labels?.length ?? 0;
  const dateLabels = useMemo(
    () => (data.labels ?? []).map(String),
    [data.labels]
  );
  const options = useMemo(
    () =>
      createMarketChartOptions(
        theme,
        volumeMaximum,
        labelCount,
        dateLabels
      ),
    [dateLabels, labelCount, theme, volumeMaximum]
  );
  const currentPriceGuides = useMemo(
    () => buildCurrentPriceGuides(currentPrices, data.datasets),
    [currentPrices, data.datasets]
  );
  const currentPriceGuideState = useMemo(() => {
    const state: { guides: CurrentPriceGuide[] } = { guides: [] };
    return {
      plugin: createCurrentPriceGuide(() => state.guides),
      update: (guides: CurrentPriceGuide[]) => {
        state.guides = guides;
      }
    };
  }, []);
  const plugins = useMemo(
    () => [currentPriceGuideState.plugin],
    [currentPriceGuideState]
  );
  const attachMarketChart = useCallback(
    (
      chart: ChartJS<
        "line" | "bar",
        MarketChartPoint[],
        string
      > | null | undefined
    ) => {
      const nextChart = chart ?? null;
      if (marketChart.current === nextChart) {
        return;
      }
      wheelZoom.current?.destroy();
      wheelZoom.current = null;
      marketChart.current = nextChart;
    },
    []
  );
  const changeZoom = (deltaY: number) => wheelZoom.current?.zoom(deltaY);

  useEffect(() => {
    const chart = marketChart.current;
    if (!chart || chartLabelCount === 0) {
      return;
    }

    wheelZoom.current?.destroy();
    const controller = createSmoothWheelZoom(chart, {
      bounds: { min: 0, max: chartLabelCount - 1 },
      minRange: 2,
      step: Math.max(0.75, labelCount * 0.06)
    });
    wheelZoom.current = controller;

    return () => {
      controller.destroy();
      if (wheelZoom.current === controller) {
        wheelZoom.current = null;
      }
    };
  }, [chartInterval, chartLabelCount, labelCount]);

  useLayoutEffect(() => {
    currentPriceGuideState.update(currentPriceGuides);
    const chart = marketChart.current;
    if (
      chart?.canvas &&
      chart.ctx &&
      chart.attached !== false
    ) {
      chart.draw();
    }
  }, [currentPriceGuideState, currentPriceGuides]);

  useEffect(() => {
    wheelZoom.current?.reset();
    const chart = marketChart.current;
    if (
      chart?.canvas &&
      chart.ctx &&
      chart.attached !== false
    ) {
      chart.resetZoom();
    }
  }, [points]);

  return (
    <div className="chart-area">
      <div className="chart-controls">
        <div className="zoom-buttons" role="group" aria-label="차트 배율">
          <button aria-label="차트 확대" onClick={() => changeZoom(-100)}>
            +
          </button>
          <button aria-label="차트 축소" onClick={() => changeZoom(100)}>
            −
          </button>
        </div>
      </div>
      <div className="chart-stack">
        <section className="chart-panel market-chart">
          <Chart
            ref={attachMarketChart}
            type="bar"
            data={data}
            options={options}
            plugins={plugins}
          />
        </section>
      </div>
    </div>
  );
}
