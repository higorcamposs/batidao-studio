import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import "./index.css";

const catalog = {
  packs: [{
    id: "boochi-free-drum-samples",
    path: "sources/boochi-free-drum-samples",
    license: "CC0-1.0",
    source: "local",
  }],
};

type MockSource = {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
  buffer: AudioBuffer | null;
};

let audioContext: MockAudioContext;
let sources: MockSource[];

class MockAudioContext {
  private startedAt = Date.now();
  state: AudioContextState = "running";
  destination = {};
  gainNode = {
    gain: { value: 1 },
    connect: vi.fn(),
  };

  constructor() {
    audioContext = this;
  }

  get currentTime() {
    return 10 + (Date.now() - this.startedAt) / 1000;
  }

  createGain = vi.fn(() => this.gainNode);
  resume = vi.fn(async () => undefined);
  decodeAudioData = vi.fn(async () => ({ duration: 1 }) as AudioBuffer);
  createBufferSource = vi.fn(() => {
    const source: MockSource = {
      start: vi.fn(),
      stop: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      onended: null,
      buffer: null,
    };
    sources.push(source);
    return source as unknown as AudioBufferSourceNode;
  });
}

const sampleRequests = () =>
  vi.mocked(fetch).mock.calls
    .map(([input]) => String(input))
    .filter(url => url.endsWith(".wav"));

async function clickPlay() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Tocar" }));
  });
  await screen.findByRole("button", { name: "Pausar" });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  sources = [];
  vi.stubGlobal("AudioContext", MockAudioContext);
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("catalog.json")) {
      return new Response(JSON.stringify(catalog), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(new ArrayBuffer(8), { status: 200 });
  }));
});

describe("transporte do estúdio", () => {
  it("toca, pausa, retoma do passo audível e para no início", async () => {
    const { container } = render(<App />);

    await clickPlay();
    expect(screen.getByText("GROOVE EM REPRODUÇÃO")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(80));
    expect(container.querySelector(".pad.current")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(screen.getByText("GROOVE PAUSADO")).toBeInTheDocument();

    await clickPlay();
    act(() => vi.advanceTimersByTime(80));
    expect(screen.getByText("GROOVE EM REPRODUÇÃO")).toBeInTheDocument();
    expect(container.querySelector(".pad.current")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Parar e voltar ao início" }));
    expect(screen.getByText("PARADO NO INÍCIO")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tocar" })).toBeInTheDocument();
    expect(container.querySelector(".pad.current")).not.toBeInTheDocument();
    expect(sources.some(source => source.stop.mock.calls.length > 0)).toBe(true);
  });

  it("aplica BPM e volume enquanto o groove está tocando", async () => {
    render(<App />);
    await clickPlay();

    fireEvent.change(screen.getByRole("slider", { name: "BPM" }), { target: { value: "140" } });
    fireEvent.change(screen.getByRole("slider", { name: "Volume master" }), { target: { value: "42" } });

    expect(screen.getByRole("slider", { name: "BPM" })).toHaveValue("140");
    expect(screen.getByText("140 BPM")).toBeInTheDocument();
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(audioContext.gainNode.gain.value).toBe(0.42);

    act(() => vi.advanceTimersByTime(120));
    const scheduledTimes = sources.flatMap(source => source.start.mock.calls.map(call => call[0] as number));
    expect(scheduledTimes.some((time, index) => index > 0 && time - scheduledTimes[index - 1] < 0.14)).toBe(true);
  });
});

describe("edição da batida", () => {
  it("alterna passos, limpa a grade e randomiza", async () => {
    const { container } = render(<App />);
    const first = screen.getByRole("button", { name: "Kick, passo 1, ativo" });

    fireEvent.click(first);
    expect(screen.getByRole("button", { name: "Kick, passo 1, inativo" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "limpar grade" }));
    expect(container.querySelectorAll(".pad.active")).toHaveLength(0);
    expect(screen.getByText("0 HITS")).toBeInTheDocument();

    vi.spyOn(Math, "random").mockReturnValue(0);
    fireEvent.click(screen.getByRole("button", { name: "Gerar padrão aleatório" }));
    expect(container.querySelectorAll(".pad.active")).toHaveLength(6);
    expect(screen.getByText("6 HITS")).toBeInTheDocument();
  });

  it("mantém a reprodução ao trocar por um padrão aleatório", async () => {
    render(<App />);
    await clickPlay();

    fireEvent.click(screen.getByRole("button", { name: "Gerar padrão aleatório" }));
    await screen.findByText("NOVO GROOVE EM REPRODUÇÃO");
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
  });
});

describe("atalhos e samples", () => {
  it("carrega cada um dos oito samples somente quando usado", async () => {
    render(<App />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "limpar grade" }));
    const names = ["Kick", "Snare", "Clap", "Closed Hat", "Open Hat", "Percussion", "Tom", "808"];
    names.forEach(name => fireEvent.click(screen.getByRole("button", { name: `${name}, passo 1, inativo` })));

    await waitFor(() => expect(sampleRequests()).toHaveLength(8));
    expect(new Set(sampleRequests())).toHaveLength(8);

    fireEvent.click(screen.getByRole("button", { name: "Kick, passo 1, ativo" }));
    fireEvent.click(screen.getByRole("button", { name: "Kick, passo 1, inativo" }));
    await act(async () => undefined);
    expect(sampleRequests()).toHaveLength(8);
  });

  it("responde a espaço, R e teclas 1–8", async () => {
    const { container } = render(<App />);

    fireEvent.keyDown(window, { code: "Space", key: " " });
    await screen.findByRole("button", { name: "Pausar" });
    fireEvent.keyDown(window, { code: "Space", key: " " });
    expect(screen.getByText("GROOVE PAUSADO")).toBeInTheDocument();

    vi.spyOn(Math, "random").mockReturnValue(0);
    fireEvent.keyDown(window, { code: "KeyR", key: "r" });
    expect(screen.getByText("6 HITS")).toBeInTheDocument();

    for (let key = 1; key <= 8; key += 1) {
      fireEvent.keyDown(window, { code: `Digit${key}`, key: String(key) });
    }
    expect(container.querySelectorAll(".launch-pad.hit")).toHaveLength(1);
    await waitFor(() => expect(sampleRequests()).toHaveLength(8));
  });
});

describe("layout móvel", () => {
  it("mantém controles, grade rolável e launchpad disponíveis em 390px", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const { container } = render(<App />);

    expect(screen.getByRole("button", { name: "Tocar" })).toBeVisible();
    expect(screen.getByRole("slider", { name: "BPM" })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /^Tocar / })).toHaveLength(8);
    expect(container.querySelector(".grid-scroll")).toHaveStyle({ overflowX: "auto" });
    expect(container.querySelectorAll(".pad")).toHaveLength(128);
  });
});