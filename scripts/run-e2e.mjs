import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

const env = { ...process.env };

try {
  const nixPath = attribute =>
    execFileSync("nix", [
      "build",
      "--no-link",
      "--print-out-paths",
      `nixpkgs#${attribute}`,
    ], { encoding: "utf8" }).trim();

  const browsers = nixPath("playwright-driver.browsers");
  const gstreamer = [
    nixPath("gst_all_1.gstreamer"),
    nixPath("gst_all_1.gst-plugins-base"),
    nixPath("gst_all_1.gst-plugins-good"),
  ];
  const runtimeDirectory = mkdtempSync(join(tmpdir(), "playwright-audio-"));
  const alsaConfig = join(runtimeDirectory, "asound.conf");

  writeFileSync(alsaConfig, "pcm.!default { type null }\nctl.!default { type hw card 0 }\n");
  env.PLAYWRIGHT_BROWSERS_PATH = browsers;
  env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "1";
  env.ALSA_CONFIG_PATH = alsaConfig;
  env.GST_PLUGIN_PATH = [
    ...gstreamer.map(path => join(path, "lib", "gstreamer-1.0")),
    env.GST_PLUGIN_PATH,
  ].filter(Boolean).join(delimiter);
} catch {
  // Non-Nix CI runners use the browsers and audio backend installed by Playwright.
}

const localPlaywright = join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "playwright.CMD" : "playwright");
const result = spawnSync(
  existsSync(localPlaywright) ? localPlaywright : (process.platform === "win32" ? "playwright.cmd" : "playwright"),
  ["test", ...process.argv.slice(2)],
  { env, stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
