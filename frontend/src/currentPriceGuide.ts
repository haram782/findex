import type { ChartType, Plugin } from "chart.js";
import { formatPriceWithUnit } from "./priceUnit";

const BADGE_HEIGHT = 22;
const BADGE_GAP = 3;
const MAX_BADGE_WIDTH = 160;

const fitBadgeLabel = (
  ctx: CanvasRenderingContext2D,
  value: string,
  maximumWidth: number
): string => {
  if (ctx.measureText(value).width <= maximumWidth) {
    return value;
  }
  let shortened = value;
  while (
    shortened.length > 1 &&
    ctx.measureText(`${shortened}…`).width > maximumWidth
  ) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
};

export interface CurrentPriceSource {
  species: string;
  status: string;
  priceUnit: string;
  price: number | null;
}

export interface CurrentPriceGuide {
  price: number;
  priceUnit: string;
  color: string;
}

interface PriceDataset {
  type?: string;
  label?: string;
  borderColor?: unknown;
  priceUnit?: string;
}

export const buildCurrentPriceGuides = (
  sources: readonly CurrentPriceSource[],
  datasets: readonly PriceDataset[]
): CurrentPriceGuide[] =>
  sources.flatMap((source) => {
    if (source.price === null) {
      return [];
    }

    const labelPrefix = `${source.status} ${source.species} ·`;
    const matchingDatasets = datasets.filter(
      (candidate) =>
        candidate.type === "line" &&
        candidate.label?.startsWith(labelPrefix) &&
        candidate.priceUnit === source.priceUnit &&
        candidate.label.endsWith("· 평균가") &&
        typeof candidate.borderColor === "string"
    );
    const dataset =
      matchingDatasets.length === 1 ? matchingDatasets[0] : undefined;
    return dataset && typeof dataset.borderColor === "string"
      ? [
          {
            price: source.price,
            priceUnit: source.priceUnit,
            color: dataset.borderColor
          }
        ]
      : [];
  });

export const positionGuideBadges = (
  desiredPositions: number[],
  top: number,
  bottom: number
): number[] => {
  if (desiredPositions.length === 0) {
    return [];
  }

  const halfHeight = BADGE_HEIGHT / 2;
  const minimum = top + halfHeight;
  const maximum = bottom - halfHeight;
  const spacing = BADGE_HEIGHT + BADGE_GAP;
  const ordered = desiredPositions
    .map((desired, index) => ({ desired, index, position: desired }))
    .sort((left, right) => left.desired - right.desired);

  ordered.forEach((item, index) => {
    const clamped = Math.min(Math.max(item.desired, minimum), maximum);
    item.position =
      index === 0
        ? clamped
        : Math.max(clamped, ordered[index - 1].position + spacing);
  });

  const overflow = ordered[ordered.length - 1].position - maximum;
  if (overflow > 0) {
    ordered.forEach((item) => {
      item.position -= overflow;
    });
  }

  for (let index = ordered.length - 2; index >= 0; index -= 1) {
    ordered[index].position = Math.min(
      ordered[index].position,
      ordered[index + 1].position - spacing
    );
  }

  const underflow = minimum - ordered[0].position;
  if (underflow > 0) {
    ordered.forEach((item) => {
      item.position += underflow;
    });
  }

  const result = Array<number>(desiredPositions.length);
  ordered.forEach((item) => {
    result[item.index] = item.position;
  });
  return result;
};

export const createCurrentPriceGuide = (
  getGuides: () => CurrentPriceGuide[]
): Plugin<ChartType> => ({
  id: "currentPriceGuide",
  afterDraw(chart) {
    const priceScale = chart.scales.price;
    if (!priceScale) {
      return;
    }

    const { ctx, chartArea } = chart;
    const visible = getGuides()
      .map((guide) => ({
        guide,
        lineY: priceScale.getPixelForValue(guide.price)
      }))
      .filter(
        ({ lineY }) => lineY >= chartArea.top && lineY <= chartArea.bottom
      );
    const badgePositions = positionGuideBadges(
      visible.map(({ lineY }) => lineY),
      chartArea.top,
      chartArea.bottom
    );

    visible.forEach(({ guide, lineY }, index) => {
      const label = fitBadgeLabel(
        ctx,
        formatPriceWithUnit(guide.price, guide.priceUnit),
        MAX_BADGE_WIDTH - 16
      );
      const badgeWidth = Math.min(
        MAX_BADGE_WIDTH,
        Math.max(58, ctx.measureText(label).width + 16)
      );
      const badgeX = Math.min(
        chartArea.right + 4,
        chart.width - badgeWidth - 2
      );
      const badgeY = badgePositions[index];

      ctx.save();
      ctx.strokeStyle = guide.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, lineY);
      ctx.lineTo(chartArea.right, lineY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = guide.color;
      ctx.fillRect(
        badgeX,
        badgeY - BADGE_HEIGHT / 2,
        badgeWidth,
        BADGE_HEIGHT
      );
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, badgeX + badgeWidth / 2, badgeY);
      ctx.restore();
    });
  }
});
