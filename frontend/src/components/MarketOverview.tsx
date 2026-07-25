import {
  formatSelectionTitle,
  summarizeSelection
} from "../marketView";
import { formatPriceWithUnit } from "../priceUnit";
import type { MarketTab, SpeciesSnapshot } from "../types";

interface MarketOverviewProps {
  items: SpeciesSnapshot[];
  activeTab: MarketTab;
  onTabChange: (tab: MarketTab) => void;
}

const TABS: { value: MarketTab; label: string }[] = [
  { value: "market", label: "시세" },
  { value: "profile", label: "어종 정보" },
  { value: "news", label: "시장 소식" }
];

export function MarketOverview({
  items,
  activeTab,
  onTabChange
}: MarketOverviewProps) {
  const primary = items[0];
  const title = formatSelectionTitle(items.map((item) => item.species));
  const summary = summarizeSelection(items);
  const changeRate = summary.changeRate;
  const rateClass =
    changeRate === null || changeRate === undefined
      ? ""
      : changeRate >= 0
        ? "positive"
        : "negative";

  return (
    <section className="market-overview">
      <div className="selection-summary">
        <img
          src="/species-placeholder.svg"
          alt={primary ? `${primary.species} 임시 이미지` : "어종 임시 이미지"}
        />
        <div className="selection-copy">
          <p className="eyebrow">SELECTED MARKET</p>
          <h2>{title}</h2>
          {items.length === 0 && (
            <span>오른쪽 시세 목록에서 어종을 선택하세요.</span>
          )}
          {items.length === 1 && primary && (
            <span>{`${primary.status || "일반"} · ${primary.category}`}</span>
          )}
        </div>
        <div className="selection-price">
          <strong>
            {summary.priceUnit === "혼합"
              ? "단위 혼합"
              : formatPriceWithUnit(summary.priceAvg, summary.priceUnit)}
          </strong>
          <span className={rateClass}>
            {changeRate === null || changeRate === undefined
              ? "-"
              : `${changeRate >= 0 ? "+" : ""}${changeRate.toFixed(2)}%`}
          </span>
        </div>
      </div>
      <nav className="market-tabs" role="tablist" aria-label="어종 화면">
        {TABS.map((tab) => (
          <button
            className={activeTab === tab.value ? "active" : ""}
            key={tab.value}
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => onTabChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </section>
  );
}
