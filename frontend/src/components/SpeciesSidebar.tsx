import { useMemo, useState } from "react";
import {
  formatCompactTradeAmount,
  sortSnapshots,
  type MarketSortKey,
  type SortDirection
} from "../marketTable";
import { matchesSpeciesSearch } from "../speciesKnowledge";
import {
  formatPriceAmount,
  formatPriceWithUnit,
  normalizePriceUnit
} from "../priceUnit";
import type { SpeciesSnapshot } from "../types";

interface SpeciesSidebarProps {
  items: SpeciesSnapshot[];
  selectedKeys: Set<string>;
  favoriteKeys: Set<string>;
  onSelectionChange: (key: string, selected: boolean) => void;
  onFavoriteToggle: (key: string) => void;
}

const COLUMNS: { key: MarketSortKey; label: string }[] = [
  { key: "species", label: "어종명" },
  { key: "priceAvg", label: "평균가" },
  { key: "changeRate", label: "전일대비" },
  { key: "tradeAmount", label: "거래대금" }
];

const defaultDirection = (key: MarketSortKey): SortDirection =>
  key === "species" ? "asc" : "desc";

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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{
    key: MarketSortKey;
    direction: SortDirection;
  }>({ key: "tradeAmount", direction: "desc" });
  const categories = useMemo(
    () => {
      const unique = [...new Set(items.map((item) => item.category))];
      return [
        "전체",
        ...unique.filter((item) => item !== "기타"),
        ...unique.filter((item) => item === "기타")
      ];
    },
    [items]
  );
  const filtered = useMemo(
    () => {
      const matching = items.filter(
        (item) =>
          (view === "all" || favoriteKeys.has(item.key)) &&
          (category === "전체" || item.category === category) &&
          matchesSpeciesSearch(item, query)
      );
      return sortSnapshots(matching, sort.key, sort.direction);
    },
    [category, favoriteKeys, items, query, sort.direction, sort.key, view]
  );

  const updateSort = (key: MarketSortKey) => {
    setSort((current) => ({
      key,
      direction:
        current.key === key
          ? current.direction === "asc"
            ? "desc"
            : "asc"
          : defaultDirection(key)
    }));
  };

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
      <label className="species-search">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="m20.5 19-4.4-4.4a7 7 0 1 0-1.5 1.5l4.4 4.4 1.5-1.5ZM5 10.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z" />
        </svg>
        <span className="visually-hidden">어종 검색</span>
        <input
          type="search"
          aria-label="어종 검색"
          placeholder="어종명·다른 이름 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
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
      <div className="species-table" role="table" aria-label="어종 시세표">
        <div className="species-table-header" role="row">
          {COLUMNS.map((column) => {
            const active = sort.key === column.key;
            return (
              <div
                role="columnheader"
                aria-sort={
                  active
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
                key={column.key}
              >
                <button
                  aria-label={`${column.label} 정렬${
                    active ? ` ${sort.direction === "asc" ? "오름차순" : "내림차순"}` : ""
                  }`}
                  aria-pressed={active}
                  onClick={() => updateSort(column.key)}
                >
                  <span>{column.label}</span>
                  <span className={`sort-indicator ${active ? "active" : ""}`}>
                    {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="species-list" role="rowgroup">
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
                role="row"
              >
                <button
                  className="species-select"
                  aria-pressed={selected}
                  aria-label={`${item.status} ${item.species} ${normalizePriceUnit(item.priceUnit)}`}
                  title={
                    item.priceAvg === null
                      ? undefined
                      : formatPriceWithUnit(item.priceAvg, item.priceUnit)
                  }
                  onClick={() => onSelectionChange(item.key, !selected)}
                />
                <span className="species-name" role="cell">
                  <small>{item.status || "일반"}</small>
                  <strong>{item.species}</strong>
                </span>
                <strong
                  className="species-price"
                  role="cell"
                >
                  <span>{formatPriceAmount(item.priceAvg)}</span>
                  {item.priceAvg !== null && (
                    <small>/{normalizePriceUnit(item.priceUnit)}</small>
                  )}
                </strong>
                <span className={`species-change ${rateClass}`} role="cell">
                  {item.changeRate === null
                    ? "-"
                    : `${item.changeRate.toFixed(2)}%`}
                </span>
                <span className="species-trade" role="cell">
                  {formatCompactTradeAmount(item.tradeAmount)}
                </span>
                <button
                  className={`favorite-button ${favorite ? "active" : ""}`}
                  aria-label={`${item.species} ${normalizePriceUnit(item.priceUnit)} 관심어종 ${favorite ? "제거" : "추가"}`}
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
                : query
                  ? "검색 결과가 없습니다."
                  : "표시할 시세가 없습니다."}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
