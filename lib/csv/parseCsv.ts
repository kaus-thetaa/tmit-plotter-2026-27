// minimal csv parser plus header heuristics for the filters mode

export type ParsedCsv = {
  headers: string[];
  columns: number[][];
};

export const parseCsv = (text: string): ParsedCsv => {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(","));

  const headers = rows[0].map((h) => h.trim());
  const columns: number[][] = headers.map(() => []);

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < headers.length; c++) {
      const value = Number(row[c]);
      columns[c].push(Number.isNaN(value) ? 0 : value);
    }
  }

  return { headers, columns };
};

const TIME_HINTS = ["time", "timestamp", "t", "ms", "elapsed", "seconds"];
const ACCEL_HINTS = ["accel", "acc", "ax", "ay", "az", "g_x", "g_y", "g_z"];

const matchesHint = (header: string, hints: string[]) => {
  const lower = header.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
};

// guesses which column is time and which is the best accel like signal
export const detectColumns = (headers: string[]) => {
  const timeIndex = headers.findIndex((h) => matchesHint(h, TIME_HINTS));
  const accelIndex = headers.findIndex((h) => matchesHint(h, ACCEL_HINTS));

  return {
    timeIndex: timeIndex === -1 ? 0 : timeIndex,
    accelIndex: accelIndex === -1 ? (headers.length > 1 ? 1 : 0) : accelIndex,
  };
};

// simple moving average low pass filter
export const movingAverage = (values: number[], windowSize: number) => {
  if (windowSize <= 1) return values.slice();
  const result: number[] = [];
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= windowSize) sum -= values[i - windowSize];
    result.push(sum / Math.min(i + 1, windowSize));
  }

  return result;
};
