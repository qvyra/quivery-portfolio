// Number formatting for bench results. Every chart picks one unit for all its
// rows, so values side by side always read in the same unit

const units: Record<string, string> = { us: "µs" };

/** How a unit id from the data reads, "us" as "µs" */
export const unitLabel = (unit: string) => units[unit] ?? unit;

// a fixed number of decimals, so values side by side line up
const number = (value: number, digits: number) =>
  value.toLocaleString("en", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

export type Formatter = (value: number) => string;

/** Seconds as ms when the scale stays under a second, otherwise as seconds */
export function secondsFormatter(scaleMax: number): Formatter {
  return scaleMax < 1
    ? (value) => `${number(value * 1000, 0)} ms`
    : (value) => `${number(value, 2)} s`;
}

/** "216–433 ms", the unit once when both ends share it */
export function formatRange(format: Formatter, min: number, max: number) {
  const low = format(min);
  const high = format(max);
  const unit = (text: string) => text.slice(text.lastIndexOf(" "));
  return unit(low) === unit(high)
    ? `${low.slice(0, low.lastIndexOf(" "))}–${high}`
    : `${low} to ${high}`;
}

export function amountFormatter(unit: string): Formatter {
  const label = unitLabel(unit);
  return (value) => `${number(value, 2)} ${label}`;
}

/** One timing step, e.g. "16.7 ms (1/60 s)" */
export function stepLabel(seconds: number): string {
  const perSecond = Math.round(1 / seconds);
  const fraction =
    Math.abs(1 / perSecond - seconds) < 1e-9 ? ` (1/${perSecond} s)` : "";
  if (seconds >= 1) return `${number(seconds, 2)} s`;
  if (seconds >= 0.001) return `${number(seconds * 1000, 1)} ms${fraction}`;
  return `${number(seconds * 1_000_000, 1)} µs`;
}

/** Tick values from 0 to a round number at or above max */
export function ticks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ??
    10 * magnitude;
  const top = Math.ceil(max / step - 1e-9) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

const dateFormat = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** A date from the data, in UTC so every build prints the same */
export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count} ${count === 1 ? one : many}`;
