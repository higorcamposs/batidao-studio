import type { Step } from "./types";

export type RapPreset = { id: string; name: string; bpm: number; swing: number; master: string; steps: Step[][] };
type Groove = Omit<RapPreset, "steps"> & { lanes: number[][] };

// Two-bar, deliberately sparse grooves. The snare stays on beats 2 and 4;
// the movement comes from syncopated kicks, restrained hats and velocity.
const grooves: Groove[] = [
  { id: "classic", name: "Boom Bap Clássico", bpm: 92, swing: 24, master: "Warm", lanes: [[0, 6, 9, 11, 16, 22, 25, 30], [4, 12, 20, 28], [12, 28], [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], [14, 30], [3, 11, 19, 27], [], []] },
  { id: "east-coast", name: "East Coast Raw", bpm: 88, swing: 30, master: "Warm", lanes: [[0, 7, 10, 16, 18, 23, 27, 30], [4, 12, 20, 28], [12, 28], [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], [14, 30], [3, 7, 19, 23], [15, 31], []] },
  { id: "golden-era", name: "Golden Era 90s", bpm: 96, swing: 20, master: "Punch", lanes: [[0, 3, 6, 10, 14, 16, 19, 22, 26, 30], [4, 12, 20, 28], [12], [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], [7, 15, 23, 31], [5, 13, 21, 29], [11, 27], []] },
  { id: "jazz-rap", name: "Jazz Rap", bpm: 84, swing: 28, master: "Clean", lanes: [[0, 5, 7, 10, 16, 21, 24, 27], [4, 12, 20, 28], [12, 28], [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], [6, 14, 22, 30], [2, 9, 18, 25], [15], []] },
  { id: "soulful", name: "Soulful Boom Bap", bpm: 86, swing: 24, master: "Warm", lanes: [[0, 3, 7, 10, 16, 19, 24, 27], [4, 12, 20, 28], [4, 12, 20, 28], [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], [14, 30], [1, 11, 17, 27], [15], [0, 16]] },
  { id: "dusty-sp", name: "Dusty SP", bpm: 90, swing: 34, master: "Warm", lanes: [[0, 7, 10, 15, 16, 23, 26, 31], [4, 12, 20, 28], [12, 28], [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], [15, 31], [3, 11, 19, 27], [14, 30], []] },
  { id: "ny-minimal", name: "New York Minimal", bpm: 94, swing: 18, master: "Punch", lanes: [[0, 7, 10, 16, 24, 27], [4, 12, 20, 28], [12, 28], [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], [14, 30], [11, 27], [], []] },
  { id: "brasileiro", name: "Boom Bap Brasileiro", bpm: 90, swing: 26, master: "Warm", lanes: [[0, 3, 7, 10, 16, 19, 22, 27, 30], [4, 12, 20, 28], [12, 28], [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], [14, 30], [3, 7, 19, 23, 27], [15, 31], []] },
  { id: "head-nod", name: "Head Nod", bpm: 82, swing: 32, master: "Warm", lanes: [[0, 6, 9, 11, 16, 22, 25, 27], [4, 12, 20, 28], [12], [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], [14, 30], [2, 10, 18, 26], [15], []] },
  { id: "late-night", name: "Late Night Boom Bap", bpm: 78, swing: 36, master: "Clean", lanes: [[0, 7, 10, 16, 21, 25, 30], [4, 12, 20, 28], [12, 28], [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30], [6, 14, 22, 30], [3, 11, 19, 27], [15, 31], [0]] },
];

function laneSteps(points: number[], length: number, lane: number): Step[] {
  return Array.from({ length }, (_, index) => {
    const sourceIndex = index % 32;
    const active = points.includes(sourceIndex);
    const backbeat = lane === 1 && [4, 12, 20, 28].includes(sourceIndex);
    const ghost = lane === 1 && [11, 27].includes(sourceIndex);
    const hat = lane === 3;
    return { active, velocity: backbeat ? .92 : ghost ? .36 : hat ? (sourceIndex % 4 === 0 ? .78 : .52) : active ? .76 : 1 };
  });
}

export function rapPreset(index: number, length: number): RapPreset {
  const groove = grooves[index % grooves.length];
  return { id: groove.id, name: groove.name, bpm: groove.bpm, swing: groove.swing, master: groove.master, steps: Array.from({ length: 8 }, (_, lane) => laneSteps(groove.lanes[lane] ?? [], length, lane)) };
}

export const rapPresetCount = grooves.length;
export const rapPresetNames = grooves.map(groove => groove.name);
