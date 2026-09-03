import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

type Instrument = { name: string; short: string; color: string; key: string; file: string };
type DrumkitCatalog = {
  packs: Array<{ id: string; path: string; license: string; source: string }>;
};
type ScheduledSource = { source: AudioBufferSourceNode; when: number };
const instruments: Instrument[] = [
  { name: "Kick", short: "KICK", color: "#ff6e59", key: "1", file: "kicks/hard-kick-01.wav" },
  { name: "Snare", short: "SNARE", color: "#d4f56a", key: "2", file: "snares/hard-snare-01.wav" },
  { name: "Clap", short: "CLAP", color: "#f7c95c", key: "3", file: "claps/clap-01.wav" },
  { name: "Closed Hat", short: "CHHAT", color: "#59d9d0", key: "4", file: "hi-hats/hi-hat-closed-01.wav" },
  { name: "Open Hat", short: "OHHAT", color: "#9d8bea", key: "5", file: "open-hats/open-hat-01.wav" },
  { name: "Percussion", short: "PERC", color: "#ff9c6e", key: "6", file: "percs/perc-cowbell.wav" },
  { name: "Tom", short: "TOM", color: "#d993d4", key: "7", file: "percs/perc-low-tom.wav" },
  { name: "808", short: "808", color: "#8fb6ff", key: "8", file: "808s/808-bass-sub.wav" },
];
const seed: boolean[][] = instruments.map((_, r) => Array.from({ length: 16 }, (_, i) =>
  r === 0 ? [0, 4, 8, 12].includes(i) : r === 1 ? [4, 12].includes(i) : r === 2 ? [4, 12].includes(i) : r === 3 ? i % 2 === 0 : r === 4 ? [6, 14].includes(i) : r === 5 ? [3, 11].includes(i) : r === 6 ? [7, 15].includes(i) : [0, 8, 10].includes(i)
));
const clone = (x: boolean[][]) => x.map(row => [...row]);

function App() {
  const [pattern, setPattern] = useState(seed);
  const [bpm, setBpm] = useState(100);
  const [volume, setVolume] = useState(76);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [catalog, setCatalog] = useState<"loading" | "ready" | "error">("loading");
  const [audioStatus, setAudioStatus] = useState("Áudio pronto para iniciar");
  const [hit, setHit] = useState<number | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const buffers = useRef<Record<string, AudioBuffer>>({});
  const bufferLoads = useRef<Record<string, Promise<AudioBuffer>>>({});
  const catalogRequest = useRef<Promise<DrumkitCatalog> | null>(null);
  const activeSources = useRef<Set<ScheduledSource>>(new Set());
  const visualTimers = useRef<Set<number>>(new Set());
  const timer = useRef<number | null>(null);
  const nextNoteTime = useRef(0);
  const stepRef = useRef(-1);
  const audibleStepRef = useRef(-1);
  const patternRef = useRef(pattern);
  const bpmRef = useRef(bpm);
  const volumeRef = useRef(volume);
  patternRef.current = pattern; bpmRef.current = bpm; volumeRef.current = volume;

  const getCatalog = useCallback(() => {
    if (!catalogRequest.current) {
      catalogRequest.current = fetch("/drumkits/catalog.json")
        .then(async response => {
          if (!response.ok) throw new Error("Catálogo indisponível");
          const data = await response.json() as DrumkitCatalog;
          if (!data.packs.some(pack => pack.id === "boochi-free-drum-samples")) {
            throw new Error("Pacote de samples não encontrado no catálogo");
          }
          setCatalog("ready");
          return data;
        })
        .catch(error => {
          catalogRequest.current = null;
          setCatalog("error");
          throw error;
        });
    }
    return catalogRequest.current;
  }, []);

  useEffect(() => { void getCatalog().catch(() => undefined); }, [getCatalog]);

  const unlock = useCallback(async () => {
    if (!audio.current) { audio.current = new AudioContext(); gain.current = audio.current.createGain(); gain.current.connect(audio.current.destination); }
    if (audio.current.state === "suspended") await audio.current.resume();
    if (gain.current) gain.current.gain.value = volumeRef.current / 100;
  }, []);

  const loadBuffer = useCallback(async (row: number) => {
    await unlock();
    const ctx = audio.current!;
    const item = instruments[row];
    if (buffers.current[item.file]) return buffers.current[item.file];
    if (!bufferLoads.current[item.file]) {
      bufferLoads.current[item.file] = (async () => {
        setAudioStatus(`Carregando ${item.name.toLowerCase()}...`);
        const data = await getCatalog();
        const pack = data.packs.find(candidate => candidate.id === "boochi-free-drum-samples")!;
        const url = `/drumkits/${pack.path}/drum-samples/01-hard-trap/${item.file}`;
        const response = await fetch(encodeURI(url));
        if (!response.ok) throw new Error(`Sample indisponível: ${item.name}`);
        const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        buffers.current[item.file] = buffer;
        setAudioStatus("Samples locais carregados");
        return buffer;
      })().catch(error => {
        delete bufferLoads.current[item.file];
        setAudioStatus("Não foi possível carregar o sample");
        throw error;
      });
    }
    return bufferLoads.current[item.file];
  }, [getCatalog, unlock]);

  const playBuffer = useCallback((row: number, when: number) => {
    const ctx = audio.current;
    const buffer = buffers.current[instruments[row].file];
    if (!ctx || !buffer || !gain.current) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain.current);
    const scheduled = { source, when };
    activeSources.current.add(scheduled);
    source.onended = () => {
      activeSources.current.delete(scheduled);
      source.disconnect();
    };
    source.start(when);
  }, []);

  const clearVisualTimers = () => {
    visualTimers.current.forEach(id => window.clearTimeout(id));
    visualTimers.current.clear();
  };

  const schedule = useCallback(() => {
    const ctx = audio.current;
    if (!ctx) return;
    while (nextNoteTime.current < ctx.currentTime + 0.1) {
      stepRef.current = (stepRef.current + 1) % 16;
      const step = stepRef.current;
      const when = nextNoteTime.current;
      patternRef.current.forEach((row, index) => { if (row[step]) playBuffer(index, when); });
      const visualTimer = window.setTimeout(() => {
        visualTimers.current.delete(visualTimer);
        audibleStepRef.current = step;
        setCurrentStep(step);
      }, Math.max(0, (when - ctx.currentTime) * 1000));
      visualTimers.current.add(visualTimer);
      nextNoteTime.current += 60 / bpmRef.current / 4;
    }
  }, [playBuffer]);

  useEffect(() => {
    if (!playing) return;
    schedule();
    timer.current = window.setInterval(schedule, 25);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      timer.current = null;
    };
  }, [playing, schedule]);

  const start = async () => {
    if (playing) return;
    await unlock();
    const usedRows = patternRef.current.flatMap((row, index) => row.some(Boolean) ? [index] : []);
    setAudioStatus("Preparando o groove...");
    try {
      await Promise.all(usedRows.map(loadBuffer));
      nextNoteTime.current = audio.current!.currentTime + 0.05;
      setPlaying(true);
      setAudioStatus("Groove em reprodução");
    } catch {
      setAudioStatus("Não foi possível preparar os samples");
    }
  };
  const pause = () => {
    setPlaying(false);
    const now = audio.current?.currentTime ?? 0;
    activeSources.current.forEach(item => {
      if (item.when > now) {
        try { item.source.stop(); } catch { /* source already ended */ }
      }
    });
    clearVisualTimers();
    stepRef.current = audibleStepRef.current;
    setAudioStatus("Groove pausado");
  };
  const stop = () => {
    setPlaying(false);
    activeSources.current.forEach(item => {
      try { item.source.stop(); } catch { /* source already ended */ }
    });
    activeSources.current.clear();
    clearVisualTimers();
    stepRef.current = -1;
    audibleStepRef.current = -1;
    setCurrentStep(-1);
    setAudioStatus("Parado no início");
  };
  const toggle = (r: number, c: number) => setPattern(old => {
    const next = clone(old);
    next[r][c] = !next[r][c];
    if (next[r][c]) void loadBuffer(r).catch(() => undefined);
    return next;
  });
  const randomize = () => {
    const next = instruments.map((_, r) => Array.from({ length: 16 }, (_, i) =>
      r === 0 ? [0, 3, 7, 8, 11, 15].includes(i) : Math.random() > (r < 4 ? .7 : .82)
    ));
    setPattern(next);
    if (!playing) return;
    setPlaying(false);
    const now = audio.current?.currentTime ?? 0;
    activeSources.current.forEach(item => {
      if (item.when > now) {
        try { item.source.stop(); } catch { /* source already ended */ }
      }
    });
    clearVisualTimers();
    stepRef.current = audibleStepRef.current;
    const usedRows = next.flatMap((row, index) => row.some(Boolean) ? [index] : []);
    setAudioStatus("Preparando novo groove...");
    void Promise.all(usedRows.map(loadBuffer)).then(() => {
      nextNoteTime.current = audio.current!.currentTime + 0.05;
      setPlaying(true);
      setAudioStatus("Novo groove em reprodução");
    }).catch(() => setAudioStatus("Não foi possível preparar os samples"));
  };
  const hitPad = (index: number) => {
    setHit(index);
    window.setTimeout(() => setHit(null), 130);
    void loadBuffer(index).then(() => playBuffer(index, audio.current!.currentTime)).catch(() => undefined);
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;
      if (e.code === "Space") { e.preventDefault(); playing ? pause() : void start(); }
      if (e.key.toLowerCase() === "r") randomize();
      const key = Number(e.key); if (key >= 1 && key <= 8) hitPad(key - 1);
    };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [playing]);

  return <div className="app">
    <header className="topbar"><div className="brand"><span className="brand-mark">B/</span> BATIDÃO STUDIO</div><div className="top-status"><span className="status-dot" /> {catalog === "ready" ? "CATÁLOGO LOCAL ONLINE" : catalog === "error" ? "CATÁLOGO OFFLINE" : "LENDO DRUMKITS..."}</div></header>
    <main className="shell">
      <section className="hero"><div><div className="eyebrow">Playground de ritmo · v.01</div><h1>Crie seu beat,<br /><span>do zero ao groove.</span></h1></div><p className="hero-copy">Uma caixa de som na tela para testar ideias rápidas, descobrir seu balanço e apertar play sem cerimônia.</p></section>
      <div className="workbench">
        <section className="panel sequencer-panel">
          <div className="panel-head"><div><div className="panel-title">Sequenciador principal</div><div className="panel-kicker">16 passos · 4/4 · hard trap kit</div></div><div className="transport"><button className={`play ${playing ? "is-playing" : ""}`} onClick={() => playing ? pause() : void start()} aria-label={playing ? "Pausar" : "Tocar"}>{playing ? "PAUSE" : "PLAY"}</button><button onClick={stop} aria-label="Parar e voltar ao início">STOP</button><button onClick={randomize} aria-label="Gerar padrão aleatório">RND</button></div></div>
          <div className="controls"><div className="control"><label>BPM</label><input aria-label="BPM" type="range" min="60" max="180" value={bpm} onChange={e => setBpm(Number(e.target.value))} /><div className="bpm-value mono">{bpm}<small> BPM</small></div></div><div className="control volume"><label>MASTER</label><input aria-label="Volume master" type="range" min="0" max="100" value={volume} onChange={e => { const v = Number(e.target.value); setVolume(v); if (gain.current) gain.current.gain.value = v / 100; }} /><span className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>{volume}%</span></div><button className="clear" onClick={() => setPattern(instruments.map(() => Array(16).fill(false)))}>limpar grade</button></div>
          <div className="grid-scroll"><div className="grid"><div className="corner" />{Array.from({ length: 16 }, (_, i) => <div className={`step-number ${i % 4 === 0 ? "bar" : ""}`} key={i}>{String(i + 1).padStart(2, "0")}</div>)}{instruments.map((item, r) => <Fragment key={item.name}><div className="row-label" style={{ "--row-color": item.color } as CSSProperties}><i />{item.name}</div>{pattern[r].map((active, c) => <button key={`${r}-${c}`} aria-label={`${item.name}, passo ${c + 1}, ${active ? "ativo" : "inativo"}`} className={`pad ${active ? "active" : ""} ${currentStep === c ? "current" : ""}`} style={{ "--row-color": item.color } as CSSProperties} onClick={() => toggle(r, c)} />)}</Fragment>)}</div></div>
        </section>
        <aside className="side"><section className="panel launch"><div className="launch-head"><div className="launch-title">Launchpad</div><div className="launch-tag">HOTKEYS 1—8</div></div><div className="launch-grid">{instruments.map((item, i) => <button key={item.name} className={`launch-pad ${hit === i ? "hit" : ""}`} style={{ "--pad": item.color } as CSSProperties} onClick={() => hitPad(i)} aria-label={`Tocar ${item.name}`}><strong>{item.short}</strong><span>tecla {item.key}</span></button>)}</div></section>
          <section className="panel meters"><div className="meter-row"><span className="meter-label">TEMPO</span><span className="meter-val mono">{bpm} BPM</span></div><div className="meter-row"><span className="meter-label">PATTERN</span><span className="meter-val mono">{pattern.flat().filter(Boolean).length} HITS</span></div><div className="meter-row"><span className="meter-label">OUTPUT</span><div className="meter-bars">{[10,18,25,21,27,16,23,12].map((h, i) => <b key={i} style={{ height: h }} />)}</div></div></section>
          <div className="hint"><strong>Dica de estúdio</strong>Pressione espaço para tocar. Use R para sortear uma nova batida e as teclas 1–8 para tocar os pads ao vivo.</div>
        </aside>
      </div>
      <footer className="footer-line"><span>BATIDÃO / RITMO EM PRIMEIRO LUGAR</span><span>{audioStatus.toUpperCase()}</span></footer>
    </main>
  </div>;
}
export default App;