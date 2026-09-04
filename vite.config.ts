import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sampleBase = "drumkits/sources/boochi-free-drum-samples/drum-samples/01-hard-trap";
const staticAssets = [
  "drumkits/samples.json",
  "drumkits/bases.json",
  "drumkits/catalog.json",
  "drumkits/README.md",
];

export default defineConfig({
  plugins: [
    react(),
    {
      name: "bundle-local-drumkit-assets",
      apply: "build",
      buildStart() {
        const manifest = JSON.parse(readFileSync(resolve("drumkits/samples.json"), "utf8")) as Array<{ packId: string; variants: string[] }>;
        const bases = JSON.parse(readFileSync(resolve("drumkits/bases.json"), "utf8")) as Array<{ packId: string; variants: string[] }>;
        const roots: Record<string, string> = { "boochi-free-drum-samples": "sources/boochi-free-drum-samples", "tr808-fischer": "sources/tr808-fischer", "drum-machines": "sources/drum-machines", "stargate-sample-pack": "sources/stargate-sample-pack", "musical-bases": "sources/musical-bases" };
        const files = [...new Set([...staticAssets, ...manifest.flatMap(sample => sample.variants.map(variant => `drumkits/${roots[sample.packId]}/${variant}`)), ...bases.flatMap(sample => sample.variants.map(variant => `drumkits/${roots[sample.packId]}/${variant}`))])];
        files.forEach(fileName => {
          this.emitFile({
            type: "asset",
            fileName,
            source: readFileSync(resolve(fileName)),
          });
        });
      },
    },
  ],
  server: { host: "0.0.0.0", port: 5000, allowedHosts: true, strictPort: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    css: true,
    exclude: ["e2e/**", "node_modules/**", "node_modules.broken-*/**"],
  },
});
