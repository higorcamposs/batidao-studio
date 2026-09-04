import { readFile, writeFile, readdir } from "node:fs/promises";
import { extname, relative, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../drumkits/", import.meta.url));
const catalog = JSON.parse(await readFile(new URL("../drumkits/catalog.json", import.meta.url), "utf8"));
const formats = new Set([".wav", ".ogg", ".m4a", ".mp3", ".aiff", ".aif"]);
const preferred = [".wav", ".m4a", ".ogg", ".mp3", ".aiff", ".aif"];
const files = [];
async function walk(dir, packId, packRoot) { for (const entry of await readdir(dir, { withFileTypes: true })) { const path = join(dir, entry.name); if (entry.isDirectory()) await walk(path, packId, packRoot); else if (formats.has(extname(entry.name).toLowerCase())) files.push({ packId, path, relative: relative(packRoot, path).replaceAll("\\", "/") }); } }
for (const pack of catalog.packs) { const packRoot = join(root, pack.path); await walk(packRoot, pack.id, packRoot); }
const title = value => value.replace(/[-_]+/g, " ").replace(/\.[^.]+$/, "").replace(/\b\w/g, x => x.toUpperCase());
const category = value => ({ kicks: "Kick", snares: "Caixa / Snare", claps: "Clap", "hi-hats": "Hi-hat fechado", openhats: "Hi-hat aberto", "open-hats": "Hi-hat aberto", percs: "Percussão", percussion: "Percussão", toms: "Tom", cymbals: "Cymbal", "808s": "808" }[value.toLowerCase()] ?? "Outros");
const kind = value => /loop/i.test(value) ? "loop" : /vocal/i.test(value) ? "vocal" : /fx|found-sound|synth/i.test(value) ? "fx" : /drum|kick|snare|clap|hat|tom|perc|808|cymbal/i.test(value) ? "one-shot" : "other";
const groups = new Map();
for (const file of files) { const stem = file.relative.replace(/\.[^.]+$/, ""); const key = `${file.packId}:${stem}`; const group = groups.get(key) ?? []; group.push(file.relative); groups.set(key, group); }
const samples = [];
for (const [id, variants] of groups) { const packId = id.slice(0, id.indexOf(":")); const pack = catalog.packs.find(item => item.id === packId); const chosen = variants.slice().sort((a, b) => preferred.indexOf(extname(a).toLowerCase()) - preferred.indexOf(extname(b).toLowerCase()))[0]; const parts = chosen.split("/"); const cat = category(parts[parts.length - 2] ?? ""); samples.push({ id, name: title(basename(chosen)), packId, packName: title(packId), category: cat, kind: kind(chosen), tags: [cat.toLowerCase(), packId], license: pack.license, variants }); }
samples.sort((a, b) => `${a.packName}/${a.category}/${a.name}`.localeCompare(`${b.packName}/${b.category}/${b.name}`));
await writeFile(join(root, "samples.json"), JSON.stringify(samples, null, 2) + "\n");
console.log(`Generated ${samples.length} unique samples from ${files.length} audio files.`);
