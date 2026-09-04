import type { InstrumentDescriptor, InstrumentZone } from "./types";

type RootFile = [number, string];

function zones(folder: string, files: RootFile[]): InstrumentZone[] {
  return files.map(([rootNote, file], index) => {
    const stem = file.replace(/\.wav$/i, "");
    return {
      id: `${folder}-${rootNote}`,
      url: `/instruments/${folder}/${file}`,
      variants: [
        `/instruments/${folder}/${stem}.ogg`,
        `/instruments/${folder}/${stem}.mp3`,
        `/instruments/${folder}/${file}`,
      ],
      rootNote,
      minNote:
        index === 0 ? 24 : Math.floor((files[index - 1][0] + rootNote) / 2) + 1,
      maxNote:
        index === files.length - 1
          ? 96
          : Math.floor((rootNote + files[index + 1][0]) / 2),
    };
  });
}

export const instruments: InstrumentDescriptor[] = [
  {
    id: "grand-piano",
    name: "Grand Piano",
    family: "keys",
    engine: "sampler",
    description: "Piano Kawai encorpado e natural",
    zones: zones("piano", [
      [36, "GrandPno_Main_Sus_C2_v3_rr1.wav"],
      [41, "GrandPno_Main_Sus_F2_v3_rr1.wav"],
      [45, "GrandPno_Main_Sus_A2_v3_rr1.wav"],
      [48, "GrandPno_Main_Sus_C3_v3_rr1.wav"],
      [52, "GrandPno_Main_Sus_E3_v3_rr1.wav"],
      [55, "GrandPno_Main_Sus_G3_v3_rr1.wav"],
      [59, "GrandPno_Main_Sus_B3_v3_rr1.wav"],
      [62, "GrandPno_Main_Sus_D4_v3_rr1.wav"],
      [65, "GrandPno_Main_Sus_F4_v3_rr1.wav"],
      [69, "GrandPno_Main_Sus_A4_v3_rr1.wav"],
      [72, "GrandPno_Main_Sus_C5_v3_rr1.wav"],
    ]),
    envelope: { attack: 0.006, decay: 0.8, sustain: 0.72, release: 0.9 },
    license: "CC0-1.0 · Versilian Community Sample Library",
    sourceUrl:
      "https://github.com/sgossner/VCSL/tree/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e",
  },
  {
    id: "clean-guitar",
    name: "Clean Guitar",
    family: "guitar",
    engine: "sampler",
    description: "Guitarra limpa de cordas flatwound",
    zones: zones("guitar", [
      [37, "db2_mf_rr1.wav"],
      [40, "e2_mf_rr1.wav"],
      [42, "gb2_mf_rr1.wav"],
      [45, "a2_mf_rr1.wav"],
      [48, "c3_mf_rr1.wav"],
      [51, "eb3_mf_rr1.wav"],
      [54, "gb3_mf_rr1.wav"],
      [57, "a3_mf_rr1.wav"],
      [60, "c4_mf_rr1.wav"],
      [63, "eb4_mf_rr1.wav"],
      [66, "gb4_mf_rr1.wav"],
      [69, "a4_mf_rr1.wav"],
      [72, "c5_mf_rr1.wav"],
    ]),
    envelope: { attack: 0.004, decay: 0.7, sustain: 0.62, release: 0.45 },
    license: "CC0-1.0 · Karoryfer Emilyguitar",
    sourceUrl:
      "https://github.com/sfzinstruments/karoryfer.emilyguitar/tree/b4920dc662fd9cad6dcaccdeecffdd91c8725d8c",
  },
  {
    id: "solo-flute",
    name: "Solo Flute",
    family: "woodwind",
    engine: "sampler",
    description: "Flauta solo suave da VSCO 2 CE",
    zones: zones("flute", [
      [48, "LDFlute_susNV_C3_v1_1.wav"],
      [52, "LDFlute_susNV_E3_v1_1.wav"],
      [57, "LDFlute_susNV_A3_v1_1.wav"],
      [60, "LDFlute_susNV_C4_v1_1.wav"],
      [64, "LDFlute_susNV_E4_v1_1.wav"],
      [69, "LDFlute_susNV_A4_v1_1.wav"],
      [72, "LDFlute_susNV_C5_v1_1.wav"],
      [76, "LDFlute_susNV_E5_v1_1.wav"],
      [81, "LDFlute_susNV_A5_v1_1.wav"],
      [84, "LDFlute_susNV_C6_v1_1.wav"],
    ]),
    envelope: { attack: 0.045, decay: 0.12, sustain: 0.92, release: 0.38 },
    license: "CC0-1.0 · VSCO 2 Community Edition",
    sourceUrl:
      "https://github.com/sgossner/VSCO-2-CE/tree/440300901dfe9275fd84e0b7763af1f8443ae62e",
  },
  {
    id: "alto-sax",
    name: "Alto Sax",
    family: "woodwind",
    engine: "sampler",
    description: "Sax alto quente para frases de soul e jazz",
    zones: zones("sax", [
      [48, "c3_p_rr1_cnd.wav"],
      [51, "eb3_p_rr1_cnd.wav"],
      [54, "gb3_p_rr1_cnd.wav"],
      [57, "a3_p_rr1_cnd.wav"],
      [60, "c4_p_rr1_cnd.wav"],
      [63, "eb4_p_rr1_cnd.wav"],
      [66, "gb4_p_rr1_cnd.wav"],
      [68, "ab4_p_rr1_cnd.wav"],
    ]),
    envelope: { attack: 0.035, decay: 0.1, sustain: 0.9, release: 0.4 },
    license: "CC0-1.0 · Karoryfer Weresax",
    sourceUrl:
      "https://github.com/sfzinstruments/karoryfer.weresax/tree/a4d756b21d2a573aca0d840cce7e71ba5effd4c6",
  },
  {
    id: "analog-bass",
    name: "Analog Bass",
    family: "synth",
    engine: "synth",
    description: "Baixo analógico redondo e controlado",
    zones: [],
    envelope: { attack: 0.008, decay: 0.18, sustain: 0.55, release: 0.22 },
    oscillator: "sawtooth",
    filterHz: 720,
    license: "Gerado localmente pelo Batidão Studio",
  },
  {
    id: "warm-pad",
    name: "Warm Pad",
    family: "synth",
    engine: "synth",
    description: "Pad macio para acordes e atmosfera",
    zones: [],
    envelope: { attack: 0.38, decay: 0.45, sustain: 0.7, release: 1.2 },
    oscillator: "triangle",
    filterHz: 2600,
    license: "Gerado localmente pelo Batidão Studio",
  },
];

export const instrumentById = Object.fromEntries(
  instruments.map((instrument) => [instrument.id, instrument]),
);
