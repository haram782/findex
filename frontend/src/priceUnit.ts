const UNKNOWN_PRICE_UNIT = "미상";
const MIXED_PRICE_UNIT = "혼합";

export const normalizePriceUnit = (
  value: string | null | undefined
): string => value?.trim() || UNKNOWN_PRICE_UNIT;

export const combinePriceUnits = (
  values: readonly (string | null | undefined)[]
): string => {
  const units = new Set(values.map((value) => value?.trim() ?? ""));
  if (units.size === 0) {
    return UNKNOWN_PRICE_UNIT;
  }
  if (
    units.size > 1 ||
    [...units].some((unit) => normalizePriceUnit(unit) === MIXED_PRICE_UNIT)
  ) {
    return MIXED_PRICE_UNIT;
  }
  return normalizePriceUnit([...units][0]);
};

export const formatPriceAmount = (
  value: number | null | undefined
): string =>
  value === null || value === undefined
    ? "-"
    : `${Math.round(value).toLocaleString("ko-KR")}원`;

export const formatPriceWithUnit = (
  value: number | null | undefined,
  priceUnit: string | null | undefined
): string => {
  const amount = formatPriceAmount(value);
  return amount === "-" ? amount : `${amount}/${normalizePriceUnit(priceUnit)}`;
};
