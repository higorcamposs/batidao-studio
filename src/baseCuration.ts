// Only these loops are allowed into the beginner-facing browser and RND.
// The remaining catalog entries stay available to the audit tooling, but are
// intentionally quarantined until their loop region is reviewed.
export const approvedBoomBapBaseIds = new Set([
  "base:chord-bb-96",
  "base:chord-c-83",
  "base:chord-d-81",
  "base:chord-e-89",
  "base:chord-eb-77",
  "base:guitar-db-74",
  "base:guitar-fs-93",
  "base:jazz-piano-409940",
  "base:bossa-guitar-74193",
  "base:bossa-guitar-74194",
  "base:bossa-guitar-74196",
  "base:bossa-guitar-74197",
  "base:bossa-guitar-74198",
  "base:bossa-guitar-74199",
  "base:bossa-guitar-74200",
  "base:bossa-guitar-74201",
]);

export const presetBasePools: Record<string, string[]> = {
  classic: ["base:chord-bb-96", "base:chord-c-83", "base:guitar-db-74", "base:bossa-guitar-74193"],
  "east-coast": ["base:chord-bb-96", "base:chord-d-81", "base:guitar-db-74", "base:jazz-piano-409940"],
  "golden-era": ["base:chord-bb-96", "base:guitar-fs-93", "base:jazz-piano-409940"],
  "jazz-rap": ["base:chord-c-83", "base:chord-d-81", "base:chord-e-89", "base:jazz-piano-409940"],
  soulful: ["base:chord-e-89", "base:guitar-fs-93", "base:bossa-guitar-74194", "base:bossa-guitar-74196"],
  "dusty-sp": ["base:chord-bb-96", "base:chord-d-81", "base:guitar-db-74"],
  "ny-minimal": ["base:chord-bb-96", "base:guitar-fs-93", "base:jazz-piano-409940"],
  brasileiro: ["base:bossa-guitar-74193", "base:bossa-guitar-74194", "base:bossa-guitar-74196", "base:bossa-guitar-74197", "base:bossa-guitar-74198", "base:bossa-guitar-74199", "base:bossa-guitar-74200", "base:bossa-guitar-74201"],
  "head-nod": ["base:chord-c-83", "base:chord-d-81", "base:bossa-guitar-74198"],
  "late-night": ["base:chord-d-81", "base:chord-e-89", "base:jazz-piano-409940"],
};
