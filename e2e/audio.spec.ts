import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

type AudioTelemetry = {
  contexts: number;
  resumes: number;
  decodes: number;
  starts: number;
  errors: string[];
};

declare global {
  interface Window {
    __audioTelemetry: AudioTelemetry;
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const telemetry: AudioTelemetry = {
      contexts: 0,
      resumes: 0,
      decodes: 0,
      starts: 0,
      errors: [],
    };
    window.__audioTelemetry = telemetry;

    const Context =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Context) return;
    const contextPrototype = Context.prototype;
    const observedContexts = new WeakSet<AudioContext>();
    const nativeCreateGain = contextPrototype.createGain;
    const nativeResume = contextPrototype.resume;
    const nativeDecode = contextPrototype.decodeAudioData;
    const nativeCreateBufferSource = contextPrototype.createBufferSource;

    contextPrototype.createGain = function () {
      if (!observedContexts.has(this)) {
        observedContexts.add(this);
        telemetry.contexts += 1;
      }
      return nativeCreateGain.call(this);
    };
    contextPrototype.resume = async function () {
      telemetry.resumes += 1;
      try {
        return await nativeResume.call(this);
      } catch (error) {
        telemetry.errors.push(`resume: ${String(error)}`);
        throw error;
      }
    };
    contextPrototype.decodeAudioData = async function (audioData: ArrayBuffer) {
      try {
        const buffer = await nativeDecode.call(this, audioData);
        telemetry.decodes += 1;
        return buffer;
      } catch (error) {
        telemetry.errors.push(`decode: ${String(error)}`);
        throw error;
      }
    };
    contextPrototype.createBufferSource = function () {
      const source = nativeCreateBufferSource.call(this);
      const nativeStart = source.start.bind(source);
      source.start = (...args: Parameters<AudioBufferSourceNode["start"]>) => {
        telemetry.starts += 1;
        try {
          nativeStart(...args);
        } catch (error) {
          telemetry.errors.push(`start: ${String(error)}`);
          throw error;
        }
      };
      return source;
    };
  });
});

test("reproduz, pausa e retoma WAVs locais com Web Audio real", async ({
  page,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto("/?e2e=audio-transport");
  const webAudioAvailable = await page.evaluate(
    () =>
      typeof window.AudioContext === "function" ||
      typeof (window as Window & { webkitAudioContext?: unknown })
        .webkitAudioContext === "function",
  );
  test.skip(
    !webAudioAvailable,
    "O WebKit para Windows não expõe Web Audio neste runtime",
  );
  await expect(page.getByText(/SONS.*BASES REVISADAS/i)).toBeVisible();

  const transport = page.getByRole("button", { name: "Tocar", exact: true });
  await transport.click();
  await expect(page.getByText("GROOVE EM REPRODUÇÃO")).toBeVisible();
  await expect(page.locator(".pad.current").first()).toBeVisible({
    timeout: 5_000,
  });

  await expect
    .poll(() => page.evaluate(() => window.__audioTelemetry), {
      timeout: 10_000,
    })
    .toMatchObject({
      contexts: 1,
      errors: [],
    });
  await expect
    .poll(() => page.evaluate(() => window.__audioTelemetry.decodes))
    .toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.__audioTelemetry.starts))
    .toBeGreaterThan(0);

  const pauseButton = page.getByRole("button", { name: "Pausar" });
  await pauseButton.click();
  await expect(page.getByText("GROOVE PAUSADO")).toBeVisible();
  const startsWhilePaused = await page.evaluate(
    () => window.__audioTelemetry.starts,
  );
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.__audioTelemetry.starts)).toBe(
    startsWhilePaused,
  );

  await page.getByRole("button", { name: "Tocar", exact: true }).click();
  await expect(page.getByText("GROOVE EM REPRODUÇÃO")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__audioTelemetry.starts))
    .toBeGreaterThan(startsWhilePaused);

  expect(browserErrors).toEqual([]);
  expect(await page.evaluate(() => window.__audioTelemetry.errors)).toEqual([]);
});

test("toca, grava e interrompe o teclado melódico", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/?e2e=melodic-keyboard");
  const webAudioAvailable = await page.evaluate(
    () =>
      typeof window.AudioContext === "function" ||
      typeof (window as Window & { webkitAudioContext?: unknown })
        .webkitAudioContext === "function",
  );
  test.skip(
    !webAudioAvailable,
    "O WebKit para Windows não expõe Web Audio neste runtime",
  );
  await expect(page.getByText(/SONS.*BASES REVISADAS/i)).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        performance
          .getEntriesByType("resource")
          .filter((item) => item.name.includes("/instruments/")).length,
    ),
  ).toBe(0);

  await page.getByRole("button", { name: "TECLADO" }).click();
  await expect(
    page.getByRole("group", { name: "Teclado virtual" }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /ENCAIXAR TEMPO/ }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: /NOTAS NA ESCALA/ }),
  ).toBeChecked();
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            performance
              .getEntriesByType("resource")
              .filter((item) => item.name.includes("/instruments/piano/"))
              .length,
        ),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some(
          (item) =>
            item.name.includes("/instruments/piano/") &&
            item.name.endsWith(".ogg"),
        ),
    ),
  ).toBe(true);

  const startsBeforePhysicalKey = await page.evaluate(
    () => window.__audioTelemetry.starts,
  );
  await page.keyboard.down("z");
  await page.waitForTimeout(80);
  await page.keyboard.up("z");
  await expect
    .poll(() => page.evaluate(() => window.__audioTelemetry.starts))
    .toBeGreaterThan(startsBeforePhysicalKey);

  await page.getByLabel("BPM").fill("180");
  await page.getByRole("button", { name: "● GRAVAR" }).click();
  await expect(
    page.getByRole("button", { name: "PARAR GRAVAÇÃO" }),
  ).toBeVisible({ timeout: 15_000 });
  const key = page.getByRole("button", { name: "C3" });
  await key.hover();
  await page.mouse.down();
  await page.waitForTimeout(180);
  await page.mouse.up();
  await expect(page.locator(".roll-note")).toHaveCount(1);
  const secondKey = page.getByRole("button", { name: "D3" });
  await secondKey.hover();
  await page.mouse.down();
  await page.waitForTimeout(140);
  await page.mouse.up();
  await expect(page.locator(".roll-note")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
  await page.getByRole("button", { name: "PARAR GRAVAÇÃO" }).click();
  await page.getByRole("button", { name: "STOP" }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "EXPORTAR WAV" }).click();
  const exported = await downloadPromise;
  expect(exported.suggestedFilename()).toMatch(/\.wav$/i);
  const exportedPath = await exported.path();
  expect(exportedPath).not.toBeNull();
  const header = await readFile(exportedPath!, { encoding: null });
  expect(header.byteLength).toBeGreaterThan(44);
  expect(header.subarray(0, 4).toString("ascii")).toBe("RIFF");
  expect(header.subarray(8, 12).toString("ascii")).toBe("WAVE");
  const startsAfterStop = await page.evaluate(
    () => window.__audioTelemetry.starts,
  );
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__audioTelemetry.starts)).toBe(
    startsAfterStop,
  );
  expect(browserErrors).toEqual([]);
  expect(await page.evaluate(() => window.__audioTelemetry.errors)).toEqual([]);
});
