// The value axis of one chart, picked from its own values. Position encodes
// the value, so a fitted axis that doesn't start at 0 stays honest, and one
// that spans more than LOG_SPAN goes logarithmic so the small values don't
// all pile up at the left edge

const LOG_SPAN = 10;

export type Scale = {
  kind: "linear" | "log";
  /** Where a value sits, from 0 (left) to 1 (right) */
  at: (value: number) => number;
  /** Labelled ticks */
  ticks: number[];
  /** Fainter unlabelled lines between the ticks */
  minor: number[];
  /** The left end of the axis */
  start: number;
};

const niceStep = (raw: number) => {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return (
    [1, 2, 2.5, 5, 10]
      .map((m) => m * magnitude)
      .find((s) => s >= raw - 1e-12) ?? 10 * magnitude
  );
};

// floating point steps like 0.1 * 3 drift, ticks are rounded back to the step
const roundTo = (value: number, step: number) => {
  const digits = Math.max(0, -Math.floor(Math.log10(step)) + 2);
  return Number(value.toFixed(digits));
};

function linear(low: number, high: number): Scale {
  const span = high - low || Math.abs(high) * 0.1 || 1;
  // a little room either side so the end samples don't sit on the edge
  const pad = span * 0.08;
  const from = low >= 0 ? Math.max(0, low - pad) : low - pad;
  const to = high + pad;
  const step = niceStep((to - from) / 4);
  const start = roundTo(Math.floor(from / step + 1e-9) * step, step);
  const end = roundTo(Math.ceil(to / step - 1e-9) * step, step);
  const count = Math.round((end - start) / step);
  const ticks = Array.from({ length: count + 1 }, (_, i) =>
    roundTo(start + i * step, step),
  );
  return {
    kind: "linear",
    at: (value) => (value - start) / (end - start),
    ticks,
    minor: [],
    start,
  };
}

// 1, 2 and 5 times a power of ten, the steps a log axis ends on
const STEPS = [1, 2, 5];
const exact = (value: number) => Number(value.toPrecision(1));

function log(low: number, high: number): Scale {
  // the ends snap to the nearest 1, 2 or 5 outside the data, not a whole
  // decade, so a chart reaching 21 s ends at 50 s rather than 100 s
  const floor = Math.floor(Math.log10(low) + 1e-9);
  const ceil = Math.ceil(Math.log10(high) - 1e-9);
  const candidates = Array.from({ length: ceil - floor + 2 }, (_, i) =>
    STEPS.map((m) => exact(m * 10 ** (floor + i))),
  ).flat();
  const start = candidates.filter((value) => value <= low * (1 + 1e-9)).at(-1)!;
  const end = candidates.find((value) => value >= high * (1 - 1e-9))!;
  const inside = candidates.filter((value) => value >= start && value <= end);
  const decade = (value: number) => Number.isInteger(Math.log10(value));
  const lo = Math.log10(start);
  const hi = Math.log10(end);
  return {
    kind: "log",
    at: (value) => (Math.log10(Math.max(value, start)) - lo) / (hi - lo),
    // decades are labelled, and so are the ends when they fall between them
    ticks: inside.filter(
      (value) => decade(value) || value === start || value === end,
    ),
    minor: inside.filter(
      (value) => !decade(value) && value !== start && value !== end,
    ),
    start,
  };
}

/**
 * The axis for a chart holding these values. `zero` keeps a linear axis that
 * starts at 0, for a line whose slope would overstate a change otherwise
 */
export function chartScale(
  values: number[],
  { zero = false }: { zero?: boolean } = {},
): Scale {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return linear(0, 1);
  if (zero) return linear(0, Math.max(...finite));
  const low = Math.min(...finite);
  const high = Math.max(...finite);
  return low > 0 && high / low > LOG_SPAN ? log(low, high) : linear(low, high);
}
