import { useEffect, useState } from "react";
import { dashboardApi } from "../api/client";
import type { SpeciesProfile } from "../types";

interface SpeciesProfileState {
  species?: string;
  profile: SpeciesProfile | null;
  error: string | null;
}

const emptyState = {
  profile: null,
  loading: false,
  error: null
};

export function useSpeciesProfile(species: string | undefined) {
  const [state, setState] = useState<SpeciesProfileState>({
    profile: null,
    error: null
  });

  useEffect(() => {
    if (!species) {
      return;
    }
    const controller = new AbortController();
    dashboardApi
      .getSpeciesProfile(species, controller.signal)
      .then((profile) => {
        if (!controller.signal.aborted) {
          setState({ species, profile, error: null });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            species,
            profile: null,
            error: error instanceof Error ? error.message : "오류가 발생했습니다"
          });
        }
      });
    return () => controller.abort();
  }, [species]);

  if (!species) {
    return emptyState;
  }
  if (state.species !== species) {
    return { profile: null, loading: true, error: null };
  }
  return { profile: state.profile, loading: false, error: state.error };
}
