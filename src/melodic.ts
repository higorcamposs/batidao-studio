import type {
  MusicalScale,
  NoteEvent,
  PerformanceAssist,
  QuantizeGrid,
} from "./types";

export const PPQ = 96;
export const TICKS_PER_STEP = PPQ / 4;

export const scaleNames: Record<MusicalScale, string> = {
  major: "Maior",
  "natural-minor": "Menor natural",
  "major-pentatonic": "Pentatônica maior",
  "minor-pentatonic": "Pentatônica menor",
  blues: "Blues",
  dorian: "Dórica",
};

export const noteNames = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const scaleIntervals: Record<MusicalScale, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  "natural-minor": [0, 2, 3, 5, 7, 8, 10],
  "major-pentatonic": [0, 2, 4, 7, 9],
  "minor-pentatonic": [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

export function defaultAssist(): PerformanceAssist {
  return {
    timingEnabled: true,
    noteEnabled: true,
    grid: "1/16",
    root: 0,
    scale: "minor-pentatonic",
    keySource: "automatic",
  };
}

export function loopTicks(length: number) {
  return length * TICKS_PER_STEP;
}

export function gridTicks(grid: QuantizeGrid) {
  return grid === "1/8" ? PPQ / 2 : grid === "1/32" ? PPQ / 8 : PPQ / 4;
}

export function quantizeTick(
  tick: number,
  grid: QuantizeGrid,
  swing: number,
  maxTick: number,
) {
  const unit = gridTicks(grid);
  const candidates: number[] = [];
  for (let value = 0; value <= maxTick; value += unit) {
    let swung = value;
    if (grid !== "1/8" && Math.round(value / TICKS_PER_STEP) % 2 === 1)
      swung += ((TICKS_PER_STEP / 3) * Math.max(0, Math.min(60, swing))) / 60;
    candidates.push(swung);
  }
  return Math.round(
    candidates.reduce(
      (best, value) =>
        Math.abs(value - tick) < Math.abs(best - tick) ? value : best,
      0,
    ),
  );
}

export function correctNote(note: number, root: number, scale: MusicalScale) {
  const allowed = scaleIntervals[scale];
  if (allowed.includes((((note - root) % 12) + 12) % 12)) return note;
  for (let distance = 1; distance <= 6; distance++) {
    const lower = note - distance;
    if (allowed.includes((((lower - root) % 12) + 12) % 12)) return lower;
    const higher = note + distance;
    if (allowed.includes((((higher - root) % 12) + 12) % 12)) return higher;
  }
  return note;
}

export function correctedEvent(
  event: NoteEvent,
  assist: PerformanceAssist,
  swing: number,
  maxTick: number,
): NoteEvent {
  const start = assist.timingEnabled
    ? quantizeTick(event.startTick, assist.grid, swing, maxTick - 1)
    : Math.round(event.startTick);
  const rawEnd = Math.min(maxTick, event.startTick + event.durationTicks);
  const end = assist.timingEnabled
    ? quantizeTick(rawEnd, assist.grid, swing, maxTick)
    : Math.round(rawEnd);
  return {
    ...event,
    note: assist.noteEnabled
      ? correctNote(event.note, assist.root, assist.scale)
      : event.note,
    startTick: Math.max(0, Math.min(maxTick - 1, start)),
    durationTicks: Math.max(
      1,
      Math.min(
        maxTick - Math.max(0, start),
        end - start || gridTicks(assist.grid),
      ),
    ),
  };
}

export function midiName(note: number) {
  return `${noteNames[((note % 12) + 12) % 12]}${Math.floor(note / 12) - 1}`;
}

export function rootFromKey(key?: string) {
  if (!key || /livre/i.test(key)) return null;
  const match = key.trim().match(/^([A-Ga-g])([#b]?)/);
  if (!match) return null;
  const natural: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  let value = natural[match[1].toUpperCase()];
  if (match[2] === "#") value += 1;
  if (match[2] === "b") value -= 1;
  return (value + 12) % 12;
}
