import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const catalog = { packs: [{ id: "boochi-free-drum-samples", path: "sources/boochi-free-drum-samples", license: "CC0-1.0", source: "local" }] };
const samples = [
  { id: "kick", name: "Hard Kick", packId: "boochi-free-drum-samples", packName: "Boochi", category: "Kick", kind: "one-shot", tags: [], license: "CC0", variants: ["drum-samples/01-hard-trap/kicks/hard-kick-01.wav"] },
  { id: "snare", name: "Hard Snare", packId: "boochi-free-drum-samples", packName: "Boochi", category: "Snare", kind: "one-shot", tags: [], license: "CC0", variants: ["drum-samples/01-hard-trap/snares/hard-snare-01.wav"] },
];

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("catalog.json")) return new Response(JSON.stringify(catalog), { status: 200 });
    if (url.endsWith("samples.json")) return new Response(JSON.stringify(samples), { status: 200 });
    return new Response(new ArrayBuffer(8), { status: 200 });
  }));
});

async function ready() { await screen.findByRole("button", { name: "limpar grade" }); }

describe("fluxos funcionais do estúdio", () => {
  it("limpa a grade e permite criar e renomear patterns", async () => {
    const { container } = render(<App />);
    await ready();
    expect(container.querySelectorAll(".pad.active").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "limpar grade" }));
    expect(container.querySelectorAll(".pad.active")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "+ PATTERN" }));
    const field = screen.getByLabelText("Nome da pattern");
    fireEvent.change(field, { target: { value: "Intro" } });
    expect(screen.getByRole("button", { name: "Intro" })).toBeInTheDocument();
  });

  it("atribui samples à linha selecionada pela biblioteca", async () => {
    render(<App />);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /BIBLIOTECA/ }));
    const target = screen.getByLabelText("Linha de destino") as HTMLSelectElement;
    fireEvent.change(target, { target: { value: target.value } });
    fireEvent.click(screen.getAllByRole("button", { name: "USAR" })[0]);
    await waitFor(() => expect(screen.getByText(/ATRIBUÍDO À LINHA SELECIONADA/)).toBeInTheDocument());
  });

  it("abre a master e aplica um preset", async () => {
    render(<App />);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /MIXER/ }));
    expect(screen.getByText("MASTER")).toBeInTheDocument();
    const boxes = screen.getAllByRole("combobox");
    const preset = boxes[boxes.length - 1] as HTMLSelectElement;
    fireEvent.change(preset, { target: { value: "Warm" } });
    expect(preset.value).toBe("Warm");
  });

  it("gera um groove de rap estruturado, em vez de hits aleatórios", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { container } = render(<App />);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Gerar preset de rap" }));
    expect(screen.getByText(/PRESET RAP: BOOM BAP CLÁSSICO · 92 BPM/)).toBeInTheDocument();
    expect((screen.getByLabelText("BPM") as HTMLInputElement).value).toBe("92");
    expect((screen.getByLabelText("Swing") as HTMLInputElement).value).toBe("24");
    expect(container.querySelectorAll(".pad.active").length).toBeGreaterThan(10);
    vi.restoreAllMocks();
  });

  it("mostra um X visível e remove a linha escolhida", async () => {
    const { container } = render(<App />);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Remover linha Kick" }));
    expect(screen.queryByLabelText("Nome da linha Kick")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".row-label")).toHaveLength(7);
  });

  it("abre o teclado com quatro trilhas e assistências independentes", async () => {
    render(<App />);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "TECLADO" }));
    expect(screen.getByRole("group", { name: "Teclado virtual" })).toBeInTheDocument();
    expect(screen.getByLabelText("Instrumento")).toHaveValue("grand-piano");
    expect(screen.getByRole("checkbox", { name: /ENCAIXAR TEMPO/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /NOTAS NA ESCALA/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Guitarra" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Flauta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Baixo" })).toBeInTheDocument();
  });

  it("migra um projeto V2 sem alterar bateria e cria as trilhas melódicas", async () => {
    const steps = Array.from({ length: 16 }, (_, index) => ({
      active: index === 0,
      velocity: 1,
    }));
    localStorage.setItem(
      "batidao-studio-projects-v2",
      JSON.stringify([
        {
          version: 2,
          id: "legacy-v2",
          name: "Projeto V2",
          bpm: 88,
          swing: 24,
          tracks: [
            {
              id: "kick-track",
              name: "Kick legado",
              short: "K",
              color: "#d4f56a",
              sampleId: "kick",
              volume: 1,
              pan: 0,
              mute: false,
              solo: false,
            },
          ],
          patterns: [
            {
              id: "legacy-pattern",
              name: "Loop legado",
              length: 16,
              bpm: 88,
              steps: { "kick-track": steps },
              base: null,
            },
          ],
          arrangement: [
            { id: "legacy-clip", patternId: "legacy-pattern", repeats: 1 },
          ],
          master: {
            volume: 0.9,
            low: 0,
            mid: 0,
            high: 0,
            compressor: 0.45,
            limiter: true,
            preset: "Clean",
          },
          updatedAt: "2026-09-04T00:00:00.000Z",
        },
      ]),
    );
    const { container } = render(<App />);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: /PROJETOS/ }));
    const projectRow = screen.getByText("Projeto V2").closest(".project-item");
    fireEvent.click(projectRow!.querySelector("button")!);
    expect(screen.getByLabelText("Nome da linha Kick legado")).toBeInTheDocument();
    expect(container.querySelectorAll(".pad.active")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "TECLADO" }));
    expect(screen.getByRole("button", { name: "Piano" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guitarra" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Flauta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Baixo" })).toBeInTheDocument();
  });
});
