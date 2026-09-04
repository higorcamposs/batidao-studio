import { expect, test } from "@playwright/test";

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

    const contextPrototype = window.AudioContext.prototype;
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

test("reproduz, pausa e retoma WAVs locais com Web Audio real", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", error => browserErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByText("CATÁLOGO LOCAL ONLINE")).toBeVisible();

  const transport = page.getByRole("button", { name: "Tocar", exact: true });
  await transport.click();
  await expect(page.getByText("GROOVE EM REPRODUÇÃO")).toBeVisible();
  await expect(page.locator(".pad.current").first()).toBeVisible({ timeout: 5_000 });

  await expect.poll(
    () => page.evaluate(() => window.__audioTelemetry),
    { timeout: 10_000 },
  ).toMatchObject({
    contexts: 1,
    decodes: 8,
    errors: [],
  });
  await expect.poll(
    () => page.evaluate(() => window.__audioTelemetry.starts),
  ).toBeGreaterThan(0);

  const pauseButton = page.getByRole("button", { name: "Pausar" });
  await pauseButton.click();
  await expect(page.getByText("GROOVE PAUSADO")).toBeVisible();
  const startsWhilePaused = await page.evaluate(() => window.__audioTelemetry.starts);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.__audioTelemetry.starts)).toBe(startsWhilePaused);

  await page.getByRole("button", { name: "Tocar", exact: true }).click();
  await expect(page.getByText("GROOVE EM REPRODUÇÃO")).toBeVisible();
  await expect.poll(
    () => page.evaluate(() => window.__audioTelemetry.starts),
  ).toBeGreaterThan(startsWhilePaused);

  expect(browserErrors).toEqual([]);
  expect(await page.evaluate(() => window.__audioTelemetry.errors)).toEqual([]);
});