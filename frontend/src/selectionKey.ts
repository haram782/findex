import type { PriceSelection } from "./types";

const SEPARATOR = "::";

export const createSelectionKey = ({
  species,
  status,
  priceUnit
}: PriceSelection): string =>
  [species, status, priceUnit].join(SEPARATOR);

export const parseSelectionKey = (key: string): PriceSelection | null => {
  const fields = key.split(SEPARATOR);
  if (fields.length !== 3) {
    return null;
  }

  const [species, status, priceUnit] = fields;
  if (!species) {
    return null;
  }
  return {
    species,
    status,
    priceUnit
  };
};
