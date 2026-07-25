import { useEffect, useMemo, useState } from "react";
import { dashboardApi } from "../api/client";
import type {
  CatalogItem,
  GroupBy,
  SpeciesSnapshot,
  TimeSeriesPoint
} from "../types";

interface DashboardState {
  catalog: CatalogItem[];
  snapshots: SpeciesSnapshot[];
  points: TimeSeriesPoint[];
  loading: boolean;
  error: string | null;
}

export function useDashboard(selectedKeys: Set<string>, groupBy: GroupBy) {
  const [state, setState] = useState<DashboardState>({
    catalog: [],
    snapshots: [],
    points: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      dashboardApi.getCatalog(controller.signal),
      dashboardApi.getSnapshots(controller.signal)
    ])
      .then(([catalog, snapshots]) =>
        setState((current) => ({
          ...current,
          catalog,
          snapshots,
          loading: false,
          error: null
        }))
      )
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error instanceof Error ? error.message : "오류가 발생했습니다"
          }));
        }
      });
    return () => controller.abort();
  }, []);

  const selections = useMemo(
    () =>
      [...selectedKeys].map((key) => {
        const [species, status] = key.split("::");
        return { species, status };
      }),
    [selectedKeys]
  );

  useEffect(() => {
    if (selections.length === 0) {
      return;
    }
    const controller = new AbortController();
    dashboardApi
      .getTimeSeries(selections, groupBy, controller.signal)
      .then((points) =>
        setState((current) => ({
          ...current,
          points,
          loading: false,
          error: null
        }))
      )
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState((current) => ({
            ...current,
            loading: false,
            error: error instanceof Error ? error.message : "오류가 발생했습니다"
          }));
        }
      });
    return () => controller.abort();
  }, [groupBy, selections]);

  return {
    ...state,
    points: selections.length === 0 ? [] : state.points
  };
}
