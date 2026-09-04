import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const instrumentsDir = resolve("public", "instruments");
const ffmpegImage =
  "jrottenberg/ffmpeg@sha256:8ec1ee1f6a0fcd37c97725827b6b7832795c9596e3439b8da56d7700d61ae778";
const encode = `
set -eu
find /work -type f -name '*.wav' -exec sh -c '
  for input do
    output="\${input%.wav}"
    if [ ! -s "$output.ogg" ]; then
      ffmpeg -hide_banner -loglevel error -i "$input" -c:a libvorbis -q:a 5 "$output.ogg"
    fi
    if [ ! -s "$output.mp3" ]; then
      ffmpeg -hide_banner -loglevel error -i "$input" -c:a libmp3lame -b:a 192k "$output.mp3"
    fi
  done
' sh {} +
`;

const result = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "--entrypoint",
    "sh",
    "-v",
    `${instrumentsDir}:/work`,
    ffmpegImage,
    "-c",
    encode,
  ],
  { stdio: "inherit" },
);

if (result.error) {
  console.error("Docker Desktop é necessário para gerar OGG e MP3.");
  console.error(result.error.message);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("Variantes OGG e MP3 dos instrumentos estão prontas.");
