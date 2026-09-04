import { describe, expect, it } from "vitest";
import { correctedEvent, correctNote, defaultAssist, gridTicks, loopTicks, quantizeTick } from "./melodic";

describe("assistência musical", () => {
  it("usa 96 PPQ e calcula loops de 16, 32 e 64 passos", () => {
    expect(gridTicks("1/8")).toBe(48);
    expect(gridTicks("1/16")).toBe(24);
    expect(gridTicks("1/32")).toBe(12);
    expect([16, 32, 64].map(loopTicks)).toEqual([384, 768, 1536]);
  });

  it("encaixa no grid reto e no grid com swing", () => {
    expect(quantizeTick(21, "1/16", 0, 384)).toBe(24);
    expect(quantizeTick(31, "1/16", 60, 384)).toBe(32);
  });

  it("corrige notas para a escala e prefere a nota inferior no empate", () => {
    expect(correctNote(61, 0, "minor-pentatonic")).toBe(60);
    expect(correctNote(66, 0, "blues")).toBe(66);
    expect(correctNote(64, 2, "dorian")).toBe(64);
  });

  it("mantém cada nota dentro do limite do loop", () => {
    const event = correctedEvent({ id: "note", note: 61, startTick: 380, durationTicks: 80, velocity: .8, take: 1 }, defaultAssist(), 0, 384);
    expect(event.note).toBe(60);
    expect(event.startTick).toBeLessThan(384);
    expect(event.startTick + event.durationTicks).toBeLessThanOrEqual(384);
  });

  it.each(["major", "natural-minor", "major-pentatonic", "minor-pentatonic", "blues", "dorian"] as const)("aceita a escala %s", scale => {
    expect(correctNote(63, 0, scale)).toBeTypeOf("number");
  });
});

