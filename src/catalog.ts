import type { SampleDescriptor } from "./types";
import { approvedBoomBapBaseIds } from "./baseCuration";

export type DrumkitCatalog = { packs: Array<{ id: string; path: string; license: string; source: string }> };

const categoryMap: Record<string, string> = { kicks: "Kick", snares: "Caixa / Snare", claps: "Clap", "hi-hats": "Hi-hat fechado", openhats: "Hi-hat aberto", "open-hats": "Hi-hat aberto", percs: "Percussão", percussion: "Percussão", toms: "Tom", cymbals: "Cymbal", "808s": "808" };
const kindFor = (path: string): SampleDescriptor["kind"] => /loop/i.test(path) ? "loop" : /vocal/i.test(path) ? "vocal" : /fx|found-sound|synth/i.test(path) ? "fx" : /drum|kick|snare|clap|hat|tom|perc|808|cymbal/i.test(path) ? "one-shot" : "other";
const title = (value: string) => value.replace(/[-_]+/g, " ").replace(/\.[^.]+$/, "").replace(/\b\w/g, x => x.toUpperCase());

export async function loadSamples(): Promise<SampleDescriptor[]> {
  const response = await fetch("/drumkits/catalog.json");
  const catalog = await response.json() as DrumkitCatalog;
  const all = catalog.packs.flatMap(pack => {
    const known: Record<string, string[]> = {
      "boochi-free-drum-samples": ["drum-samples/01-hard-trap/kicks/hard-kick-01.wav", "drum-samples/01-hard-trap/snares/hard-snare-01.wav", "drum-samples/01-hard-trap/claps/clap-01.wav", "drum-samples/01-hard-trap/hi-hats/hi-hat-closed-01.wav", "drum-samples/01-hard-trap/open-hats/open-hat-01.wav", "drum-samples/01-hard-trap/percs/perc-cowbell.wav", "drum-samples/01-hard-trap/percs/perc-low-tom.wav", "drum-samples/01-hard-trap/808s/808-bass-sub.wav"],
    };
    return (known[pack.id] ?? []).map(file => descriptor(pack, file));
  });
  // The catalog is extended by the build-time manifests when available.
  try {
    const manifest = await fetch("/drumkits/samples.json");
    const drumSamples = manifest.ok ? await manifest.json() as SampleDescriptor[] : all;
    try {
      const bases = await fetch("/drumkits/bases.json");
      if (bases.ok) return [...drumSamples, ...(await bases.json() as SampleDescriptor[]).map(sample => ({ ...sample, musical: sample.musical ? { ...sample.musical, quality: approvedBoomBapBaseIds.has(sample.id) ? "approved" as const : "quarantine" as const, quarantineReason: approvedBoomBapBaseIds.has(sample.id) ? undefined : "Loop ou duração ainda não revisados" } : sample.musical }))];
    } catch { /* base catalog is optional */ }
    return drumSamples;
  } catch { /* fallback keeps the MVP usable */ }
  return all;
}

function descriptor(pack: DrumkitCatalog["packs"][number], file: string): SampleDescriptor {
  const parts = file.split("/");
  const category = categoryMap[parts[parts.length - 2] ?? ""] ?? "Outros";
  return { id: `${pack.id}:${file}`, name: title(parts[parts.length - 1] ?? file), packId: pack.id, packName: title(pack.id), category, kind: kindFor(file), tags: [category.toLowerCase()], license: pack.license, variants: [file], role: "drum" };
}

export function sampleUrl(sample: SampleDescriptor, variant = sample.variants[0]) {
  const encodedVariant = variant.split("/").map(part => encodeURIComponent(part)).join("/");
  return `/drumkits/${sample.packId === "musical-bases" ? "sources/musical-bases" : sample.packId === "boochi-free-drum-samples" ? "sources/boochi-free-drum-samples" : "sources/" + sample.packId}/${encodedVariant}`;
}
