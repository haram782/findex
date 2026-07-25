import { useMemo, useState } from "react";
import { MarketCharts } from "./components/MarketCharts";
import { MarketOverview } from "./components/MarketOverview";
import { SpeciesSidebar } from "./components/SpeciesSidebar";
import { getDateWindow } from "./dateRange";
import { useDashboard } from "./hooks/useDashboard";
import { useFavorites, useTheme } from "./hooks/usePreferences";
import { getSpeciesAliases } from "./speciesKnowledge";
import type {
  DateRange,
  GroupBy,
  MarketTab,
  VolumeMetric
} from "./types";
import "./styles.css";

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "none", label: "전체" },
  { value: "origin", label: "산지별" },
  { value: "spec", label: "규격별" }
];
const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "day", label: "1일" },
  { value: "week", label: "1주" },
  { value: "month", label: "1개월" },
  { value: "quarter", label: "3개월" },
  { value: "halfYear", label: "6개월" }
];
const MAX_SELECTIONS = 5;

export default function App() {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [volumeMetric, setVolumeMetric] = useState<VolumeMetric>("quantity");
  const [dateRange, setDateRange] = useState<DateRange>("quarter");
  const [activeTab, setActiveTab] = useState<MarketTab>("market");
  const { favoriteKeys, toggleFavorite } = useFavorites();
  const { theme, setTheme } = useTheme();
  const dateWindow = useMemo(() => getDateWindow(dateRange), [dateRange]);
  const { snapshots, points, loading, error } = useDashboard(
    selectedKeys,
    groupBy,
    dateWindow.startDate,
    dateWindow.endDate
  );
  const selectedItems = useMemo(
    () =>
      [...selectedKeys]
        .map((key) => snapshots.find((item) => item.key === key))
        .filter((item) => item !== undefined),
    [selectedKeys, snapshots]
  );
  const currentPrices = useMemo(
    () =>
      selectedItems.map((item) => ({
        species: item.species,
        status: item.status,
        price: item.priceAvg
      })),
    [selectedItems]
  );
  const primaryAliases = useMemo(
    () =>
      selectedItems.length === 1
        ? getSpeciesAliases(selectedItems[0].species)
        : [],
    [selectedItems]
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
    <main className="app-shell" data-theme={theme}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <div>
            <h1>Findex</h1>
            <p>노량진수산시장 경락시세</p>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="market-status">
            <i />
            KST 기준
          </span>
          <button
            className="theme-toggle"
            aria-label={`${theme === "dark" ? "화이트" : "다크"} 테마로 전환`}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "☀ 화이트" : "☾ 다크"}
          </button>
        </div>
      </header>
      <div className="dashboard">
        <section className="market-main">
          <MarketOverview
            items={selectedItems}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          {activeTab === "market" && (
            <div className="market-tab-content" role="tabpanel">
              <div className="toolbar">
                <div className="segmented" aria-label="조회 기간">
                  {RANGE_OPTIONS.map((option) => (
                    <button
                      className={dateRange === option.value ? "active" : ""}
                      key={option.value}
                      aria-pressed={dateRange === option.value}
                      onClick={() => setDateRange(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="segmented" aria-label="분리 기준">
                  {GROUP_OPTIONS.map((option) => (
                    <button
                      className={groupBy === option.value ? "active" : ""}
                      key={option.value}
                      aria-pressed={groupBy === option.value}
                      onClick={() => setGroupBy(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="segmented" aria-label="거래량 지표">
                  <button
                    className={volumeMetric === "quantity" ? "active" : ""}
                    aria-pressed={volumeMetric === "quantity"}
                    onClick={() => setVolumeMetric("quantity")}
                  >
                    수량
                  </button>
                  <button
                    className={
                      volumeMetric === "tradeAmount" ? "active" : ""
                    }
                    aria-pressed={volumeMetric === "tradeAmount"}
                    onClick={() => setVolumeMetric("tradeAmount")}
                  >
                    거래대금
                  </button>
                </div>
              </div>
              {error && <div className="notice error">{error}</div>}
              {loading && (
                <div className="notice">시세를 불러오는 중입니다.</div>
              )}
              {!loading && !error && selectedKeys.size === 0 && (
                <div className="notice">
                  오른쪽 목록에서 비교할 어종을 선택하세요.
                </div>
              )}
              {!loading &&
                !error &&
                selectedKeys.size > 0 &&
                points.length === 0 && (
                  <div className="notice">
                    선택한 기간의 거래 데이터가 없습니다.
                  </div>
                )}
              <MarketCharts
                points={points}
                volumeMetric={volumeMetric}
                theme={theme}
                currentPrices={currentPrices}
                chartInterval="daily"
              />
            </div>
          )}
          {activeTab === "profile" && (
            <section className="content-placeholder" role="tabpanel">
              <span className="phase-badge">PHASE 2</span>
              <h3>LLM Wiki</h3>
              <p>
                제철, 주요 산지, 특징과 손질·보관 정보를 출처와 함께 기록할
                예정입니다.
              </p>
              <div className="placeholder-card">
                <strong>{selectedItems[0]?.species ?? "선택 어종"} 정보</strong>
                <span>검수된 어종 정보가 아직 없습니다.</span>
                <div className="wiki-aliases">
                  <small>다른 이름</small>
                  <b>
                    {primaryAliases.length > 0
                      ? primaryAliases.join(", ")
                      : "등록된 다른 이름 없음"}
                  </b>
                </div>
              </div>
            </section>
          )}
          {activeTab === "news" && (
            <section className="content-placeholder" role="tabpanel">
              <span className="phase-badge">PHASE 3</span>
              <h3>시장 소식</h3>
              <p>
                관련 기사와 시장 공지를 출처·발행 시각·수집 시각과 함께
                제공할 예정입니다.
              </p>
              <div className="placeholder-card">
                <strong>연결된 소식이 없습니다.</strong>
                <span>기사 수집 파이프라인 준비 중</span>
              </div>
            </section>
          )}
        </section>
        <SpeciesSidebar
          items={snapshots}
          selectedKeys={selectedKeys}
          favoriteKeys={favoriteKeys}
          onSelectionChange={changeSelection}
          onFavoriteToggle={toggleFavorite}
        />
      </div>
    </main>
  );
}
