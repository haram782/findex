import { useMemo, useState } from "react";
import type { SpeciesSnapshot } from "../types";

interface SpeciesSidebarProps {
  items: SpeciesSnapshot[];
  selectedKeys: Set<string>;
  favoriteKeys: Set<string>;
  onSelectionChange: (key: string, selected: boolean) => void;
  onFavoriteToggle: (key: string) => void;
}

const formatPrice = (value: number | null): string =>
  value === null ? "-" : `${Math.round(value).toLocaleString("ko-KR")}원`;

function FishIcon() {
  return (
    <svg
      aria-hidden="true"
      data-testid="fish-icon"
      viewBox="0 0 24 24"
    >
      <path d="M21 12c-2.2-3.2-5.4-5.2-9-5.2-2.7 0-5.2 1.1-7.1 3L1.5 7.7v8.6l3.4-2.1c1.9 1.9 4.4 3 7.1 3 3.6 0 6.8-2 9-5.2Zm-5.1-1.4a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z" />
    </svg>
  );
}

export function SpeciesSidebar({
  items,
  selectedKeys,
  favoriteKeys,
  onSelectionChange,
  onFavoriteToggle
}: SpeciesSidebarProps) {
  const [view, setView] = useState<"all" | "favorites">("all");
  const [category, setCategory] = useState("전체");
  const categories = useMemo(
    () => ["전체", ...new Set(items.map((item) => item.category))],
    [items]
  );
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (view === "all" || favoriteKeys.has(item.key)) &&
          (category === "전체" || item.category === category)
      ),
    [category, favoriteKeys, items, view]
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <p className="eyebrow">오늘의 경락</p>
          <h2>어종 시세</h2>
        </div>
        <span className="count">{filtered.length}</span>
      </div>
      <div className="sidebar-mode-tabs" role="tablist" aria-label="시세 목록 범위">
        <button
          className={view === "all" ? "active" : ""}
          role="tab"
          aria-selected={view === "all"}
          onClick={() => {
            setView("all");
            setCategory("전체");
          }}
        >
          전체 시세
        </button>
        <button
          className={view === "favorites" ? "active" : ""}
          role="tab"
          aria-selected={view === "favorites"}
          onClick={() => {
            setView("favorites");
            setCategory("전체");
          }}
        >
          관심어종
        </button>
      </div>
      <div className="category-tabs" role="tablist" aria-label="어종 카테고리">
        {categories.map((item) => (
          <button
            className={item === category ? "active" : ""}
            key={item}
            role="tab"
            aria-selected={item === category}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="species-table-header">
        <span>어종</span>
        <span>평균가 / 등락</span>
      </div>
      <div className="species-list">
        {filtered.map((item) => {
          const selected = selectedKeys.has(item.key);
          const favorite = favoriteKeys.has(item.key);
          const rateClass =
            item.changeRate === null
              ? ""
              : item.changeRate >= 0
                ? "positive"
                : "negative";
          return (
            <div
              className={`species-row ${selected ? "selected" : ""}`}
              key={item.key}
            >
              <button
                className="species-select"
                aria-pressed={selected}
                aria-label={`${item.status} ${item.species}`}
                onClick={() => onSelectionChange(item.key, !selected)}
              >
                <span className="species-name">
                  <small>{item.status || "일반"}</small>
                  {item.species}
                </span>
                <span className="species-price">
                  <strong>{formatPrice(item.priceAvg)}</strong>
                  <span className={rateClass}>
                    {item.changeRate === null
                      ? "-"
                      : `${item.changeRate.toFixed(2)}%`}
                  </span>
                </span>
              </button>
              <button
                className={`favorite-button ${favorite ? "active" : ""}`}
                aria-label={`${item.species} 관심어종 ${favorite ? "제거" : "추가"}`}
                aria-pressed={favorite}
                onClick={() => onFavoriteToggle(item.key)}
              >
                <FishIcon />
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="empty-sidebar">
            {view === "favorites"
              ? "관심어종으로 등록한 어종이 없습니다."
              : "표시할 시세가 없습니다."}
          </p>
        )}
      </div>
    </aside>
  );
}
