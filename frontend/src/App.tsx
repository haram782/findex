import { useState } from "react";
import { MarketCharts } from "./components/MarketCharts";
import { SpeciesSidebar } from "./components/SpeciesSidebar";
import { useDashboard } from "./hooks/useDashboard";
import type { GroupBy, VolumeMetric } from "./types";
import "./styles.css";

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "none", label: "전체" },
  { value: "origin", label: "산지별" },
  { value: "spec", label: "규격별" }
];
const MAX_SELECTIONS = 5;

export default function App() {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [volumeMetric, setVolumeMetric] = useState<VolumeMetric>("quantity");
  const { snapshots, points, loading, error } = useDashboard(
    selectedKeys,
    groupBy
  );

  const changeSelection = (key: string, selected: boolean) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (selected) {
        if (next.size < MAX_SELECTIONS) {
          next.add(key);
        }
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <div>
            <h1>Findex</h1>
            <p>노량진수산시장 경락시세</p>
          </div>
        </div>
        <span className="market-status">
          <i />
          KST 기준
        </span>
      </header>
      <div className="dashboard">
        <section className="market-main">
          <div className="market-heading">
            <div>
              <p className="eyebrow">PRICE TREND</p>
              <h2>가격과 거래 추이</h2>
            </div>
            <div className="toolbar">
              <div className="segmented" aria-label="분리 기준">
                {GROUP_OPTIONS.map((option) => (
                  <button
                    className={groupBy === option.value ? "active" : ""}
                    key={option.value}
                    onClick={() => setGroupBy(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="segmented" aria-label="거래량 지표">
                <button
                  className={volumeMetric === "quantity" ? "active" : ""}
                  onClick={() => setVolumeMetric("quantity")}
                >
                  수량
                </button>
                <button
                  className={volumeMetric === "tradeAmount" ? "active" : ""}
                  onClick={() => setVolumeMetric("tradeAmount")}
                >
                  거래대금
                </button>
              </div>
            </div>
          </div>
          {error && <div className="notice error">{error}</div>}
          {loading && <div className="notice">시세를 불러오는 중입니다.</div>}
          {!loading && !error && selectedKeys.size === 0 && (
            <div className="notice">오른쪽 목록에서 비교할 어종을 선택하세요.</div>
          )}
          {!loading && !error && selectedKeys.size > 0 && points.length === 0 && (
            <div className="notice">선택한 기간의 거래 데이터가 없습니다.</div>
          )}
          <MarketCharts points={points} volumeMetric={volumeMetric} />
        </section>
        <SpeciesSidebar
          items={snapshots}
          selectedKeys={selectedKeys}
          onSelectionChange={changeSelection}
        />
      </div>
    </main>
  );
}
