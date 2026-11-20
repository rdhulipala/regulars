// Small date helpers shared by the server and client components.
// Kept dependency-free on purpose — this app has no date library installed.

export const DAY_MS = 86_400_000;

/** Monday 00:00 local time of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return out;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

export function fmtTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? "am" : "pm";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${ampm}`;
}

export function fmtDay(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function fmtDateTime(d: Date): string {
  return `${fmtDay(d)}, ${fmtTime(d)}`;
}

export function fmtDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

/** The deadline after which a change to `slotStart` is locked, given a cutoff in hours. */
export function deadline(slotStart: Date, cutoffHours: number): Date {
  return new Date(slotStart.getTime() - cutoffHours * 3_600_000);
}

export function isLocked(slotStart: Date, cutoffHours: number, now: Date = new Date()): boolean {
  return now >= deadline(slotStart, cutoffHours);
}
