import { Timestamp } from "firebase/firestore";

export function coerceDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (
    v &&
    typeof v === "object" &&
    "toDate" in v &&
    typeof (v as { toDate: () => Date }).toDate === "function"
  ) {
    return (v as { toDate: () => Date }).toDate();
  }
  if (
    v &&
    typeof v === "object" &&
    "seconds" in v &&
    typeof (v as { seconds: number }).seconds === "number"
  ) {
    const s = v as { seconds: number; nanoseconds?: number };
    return new Timestamp(s.seconds, s.nanoseconds ?? 0).toDate();
  }
  return new Date(0);
}

export function combineLocalDateAndTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}
