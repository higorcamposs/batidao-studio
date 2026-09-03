import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sampleBase = "drumkits/sources/boochi-free-drum-samples/drum-samples/01-hard-trap";
const staticAssets = [
  "drumkits/catalog.json",
  "drumkits/README.md",
  `${sampleBase}/kicks/hard-kick-01.wav`,
  `${sampleBase}/snares/hard-snare-01.wav`,
  `${sampleBase}/claps/clap-01.wav`,
  `${sampleBase}/hi-hats/hi-hat-closed-01.wav`,
  `${sampleBase}/open-hats/open-hat-01.wav`,
  `${sampleBase}/percs/perc-cowbell.wav`,
  `${sampleBase}/percs/perc-low-tom.wav`,
  `${sampleBase}/808s/808-bass-sub.wav`,
];

export default defineConfig({
  plugins: [
    react(),
    {
      name: "bundle-local-drumkit-assets",
      apply: "build",
      buildStart() {
        staticAssets.forEach(fileName => {
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
});