import type { DateRange } from "./types";

export interface DateWindow {
  startDate: string;
  endDate: string;
}

const RANGE_DAYS: Record<DateRange, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 90,
  halfYear: 180
};

const KST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const formatKstDate = (value: Date): string => KST_FORMATTER.format(value);

const shiftIsoDate = (value: string, days: number): string => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export function getDateWindow(
  range: DateRange,
  today: Date = new Date()
): DateWindow {
  const endDate = formatKstDate(today);
  const startDate = shiftIsoDate(
    endDate,
    -(RANGE_DAYS[range] - 1)
  );
  return { startDate, endDate };
}
