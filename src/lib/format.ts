import { CAMPUS_TZ } from "./today";

export function fmtDay(day: string) {
  return new Intl.DateTimeFormat("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}
export function fmtStamp(d: Date) {
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: CAMPUS_TZ }).format(d);
}
