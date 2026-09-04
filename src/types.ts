export type Step = { active: boolean; velocity: number };
export type PatternLength = 16 | 32 | 64;
export type SampleKind = "one-shot" | "loop" | "vocal" | "fx" | "other";
export type SampleRole = "drum" | "musical-base";
export type QuantizeGrid = "1/8" | "1/16" | "1/32";
export type MusicalScale =
  | "major"
  | "natural-minor"
  | "major-pentatonic"
  | "minor-pentatonic"
  | "blues"
  | "dorian";

export type MusicalMetadata = {
  bpm: number;
  key?: string;
  bars: number;
  style: string;
  origin: "brasil" | "global";
  instrumental: true;
  loopStart?: number;
  loopEnd?: number;
  durationSeconds?: number;
  quality?: "approved" | "quarantine";
  quarantineReason?: string;
  recommendedVolume?: number;
};

export type SourceEvidence = {
  author: string;
  sourceUrl: string;
  licenseUrl: string;
  retrievedAt: string;
  sha256?: string;
  format?: string;
  notes?: string;
};

export type SampleDescriptor = {
  id: string;
  name: string;
  packId: string;
  packName: string;
  category: string;
  kind: SampleKind;
  tags: string[];
  license: string;
  variants: string[];
  role?: SampleRole;
  musical?: MusicalMetadata;
  sourceEvidence?: SourceEvidence;
};

export type Track = {
  id: string;
  name: string;
  short: string;
  color: string;
  sampleId: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
  hotkey?: string;
};

export type InstrumentZone = {
  id: string;
  url: string;
  variants?: string[];
  rootNote: number;
  minNote: number;
  maxNote: number;
  minVelocity?: number;
  maxVelocity?: number;
  loopStart?: number;
  loopEnd?: number;
};

export type InstrumentDescriptor = {
  id: string;
  name: string;
  family: "keys" | "guitar" | "woodwind" | "synth";
  engine: "sampler" | "synth";
  description: string;
  zones: InstrumentZone[];
  envelope: { attack: number; decay: number; sustain: number; release: number };
  oscillator?: "sine" | "triangle" | "sawtooth" | "square";
  filterHz?: number;
  license: string;
  sourceUrl?: string;
};

export type MelodicTrack = {
  id: string;
  name: string;
  color: string;
  instrumentId: string;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
};

export type NoteEvent = {
  id: string;
  note: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
  take: number;
};

export type PerformanceAssist = {
  timingEnabled: boolean;
  noteEnabled: boolean;
  grid: QuantizeGrid;
  root: number;
  scale: MusicalScale;
  keySource: "automatic" | "manual";
};

export type PatternBaseAssignment = {
  sampleId: string;
  volume: number;
  muted: boolean;
};
export type Pattern = {
  id: string;
  name: string;
  length: PatternLength;
  bpm?: number;
  steps: Record<string, Step[]>;
  base?: PatternBaseAssignment | null;
  melodicNotes?: Record<string, NoteEvent[]>;
  assist?: PerformanceAssist;
};
export type ArrangementClip = {
  id: string;
  patternId: string;
  repeats: number;
};
export type MasterSettings = {
  volume: number;
  low: number;
  mid: number;
  high: number;
  compressor: number;
  limiter: boolean;
  preset: string;
};
export type StudioProjectV1 = {
  version: 1;
  id: string;
  name: string;
  bpm: number;
  swing: number;
  tracks: Track[];
  patterns: Pattern[];
  arrangement: ArrangementClip[];
  master: MasterSettings;
  updatedAt: string;
};

export type StudioProjectV2 = Omit<StudioProjectV1, "version" | "patterns"> & {
  version: 2;
  patterns: Pattern[];
};

export type StudioProjectV3 = Omit<StudioProjectV2, "version"> & {
  version: 3;
  melodicTracks: MelodicTrack[];
};

export type StudioProject = StudioProjectV1 | StudioProjectV2 | StudioProjectV3;

export const COLORS = [
  "#ff6e59",
  "#d4f56a",
  "#f7c95c",
  "#59d9d0",
  "#9d8bea",
  "#ff9c6e",
  "#d993d4",
  "#8fb6ff",
  "#f083b7",
  "#a6e3a1",
  "#f2a65a",
  "#72bcd4",
  "#cba6f7",
  "#f38ba8",
  "#89dceb",
  "#fab387",
];
