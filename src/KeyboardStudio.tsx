import { useEffect, useMemo, useRef, useState } from "react";
import { instruments, instrumentById } from "./instruments";
import {
  correctedEvent,
  correctNote,
  defaultAssist,
  gridTicks,
  loopTicks,
  midiName,
  noteNames,
  scaleNames,
  TICKS_PER_STEP,
} from "./melodic";
import type {
  MasterSettings,
  MelodicTrack,
  NoteEvent,
  Pattern,
  PerformanceAssist,
} from "./types";
import type { AudioEngine } from "./audioEngine";

const keyboardMap: Record<string, number> = {
  KeyZ: 0,
  KeyS: 1,
  KeyX: 2,
  KeyD: 3,
  KeyC: 4,
  KeyV: 5,
  KeyG: 6,
  KeyB: 7,
  KeyH: 8,
  KeyN: 9,
  KeyJ: 10,
  KeyM: 11,
  KeyQ: 12,
  Digit2: 13,
  KeyW: 14,
  Digit3: 15,
  KeyE: 16,
  KeyR: 17,
  Digit5: 18,
  KeyT: 19,
  Digit6: 20,
  KeyY: 21,
  Digit7: 22,
  KeyU: 23,
};
const keyLabels = [
  "Z",
  "S",
  "X",
  "D",
  "C",
  "V",
  "G",
  "B",
  "H",
  "N",
  "J",
  "M",
  "Q",
  "2",
  "W",
  "3",
  "E",
  "R",
  "5",
  "T",
  "6",
  "Y",
  "7",
  "U",
];
const isBlack = (note: number) => [1, 3, 6, 8, 10].includes(note % 12);
const makeId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

export function makeMelodicTracks(): MelodicTrack[] {
  return ["grand-piano", "clean-guitar", "solo-flute", "analog-bass"].map(
    (instrumentId, index) => ({
      id: makeId("melodic"),
      name: ["Piano", "Guitarra", "Flauta", "Baixo"][index],
      color: ["#59d9d0", "#f7c95c", "#9d8bea", "#ff9c6e"][index],
      instrumentId,
      volume: 72,
      pan: 0,
      mute: false,
      solo: false,
    }),
  );
}

type Props = {
  pattern: Pattern;
  tracks: MelodicTrack[];
  selectedTrackId: string;
  bpm: number;
  swing: number;
  master: MasterSettings;
  playing: boolean;
  engine: AudioEngine;
  onSelectTrack: (id: string) => void;
  onTracksChange: (tracks: MelodicTrack[]) => void;
  onPatternChange: (pattern: Pattern) => void;
  onStartFromBeginning: () => Promise<number>;
  onStop: () => void;
  onStatus: (status: string) => void;
};

export function KeyboardStudio(props: Props) {
  const {
    pattern,
    tracks,
    selectedTrackId,
    bpm,
    swing,
    master,
    playing,
    engine,
  } = props;
  const track = tracks.find((item) => item.id === selectedTrackId) ?? tracks[0];
  const instrument = instrumentById[track?.instrumentId] ?? instruments[0];
  const assist = pattern.assist ?? defaultAssist();
  const notes = pattern.melodicNotes?.[track?.id] ?? [];
  const maxTick = loopTicks(pattern.length);
  const [octave, setOctave] = useState(3);
  const [recording, setRecording] = useState(false);
  const [countIn, setCountIn] = useState(0);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const pressed = useRef(
    new Map<string, { voiceId: string; note: number; startTick?: number }>(),
  );
  const recordStart = useRef(0);
  const take = useRef(0);
  const countdownTimer = useRef<number | null>(null);
  const notesRef = useRef(notes);
  const drag = useRef<{
    id: string;
    mode: "move" | "resize";
    x: number;
    y: number;
    note: NoteEvent;
    width: number;
    height: number;
  } | null>(null);

  const updateAssist = (change: Partial<PerformanceAssist>) =>
    props.onPatternChange({ ...pattern, assist: { ...assist, ...change } });
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  const updateNotes = (next: NoteEvent[]) => {
    notesRef.current = next;
    props.onPatternChange({
      ...pattern,
      melodicNotes: { ...pattern.melodicNotes, [track.id]: next },
    });
  };
  const currentTick = () => {
    const elapsed = Math.max(
      0,
      (engine.context?.currentTime ?? recordStart.current) -
        recordStart.current,
    );
    return Math.min(maxTick - 1, (((elapsed * bpm) / 60) * 96) % maxTick);
  };

  const releaseKey = (code: string) => {
    const active = pressed.current.get(code);
    if (!active) return;
    pressed.current.delete(code);
    engine.stopVoice(active.voiceId);
    if (recording && active.startTick !== undefined) {
      const endTick = currentTick();
      const raw: NoteEvent = {
        id: makeId("note"),
        note: active.note,
        startTick: active.startTick,
        durationTicks: Math.max(
          1,
          endTick >= active.startTick
            ? endTick - active.startTick
            : maxTick - active.startTick,
        ),
        velocity: 0.82,
        take: take.current,
      };
      updateNotes([
        ...notesRef.current,
        correctedEvent(raw, assist, swing, maxTick),
      ]);
    }
  };

  const releaseAll = () => [...pressed.current.keys()].forEach(releaseKey);
  const pressKey = async (code: string, rawNote: number) => {
    if (!track || pressed.current.has(code)) return;
    const note = assist.noteEnabled
      ? correctNote(rawNote, assist.root, assist.scale)
      : rawNote;
    const voiceId = `live-${code}`;
    pressed.current.set(code, {
      voiceId,
      note,
      startTick: recording ? currentTick() : undefined,
    });
    try {
      await engine.startInstrumentVoice(
        instrument,
        note,
        0.82,
        track.volume,
        track.pan,
        engine.context?.currentTime ?? 0,
        master,
        engine.token(),
        voiceId,
      );
      props.onStatus(`${instrument.name} · ${midiName(note)}`);
    } catch {
      pressed.current.delete(code);
      props.onStatus(`Não foi possível carregar ${instrument.name}`);
    }
  };

  useEffect(() => {
    void engine
      .preloadInstrument(instrument, master)
      .catch(() =>
        props.onStatus(`Instrumento aguardando áudio: ${instrument.name}`),
      );
    releaseAll();
  }, [instrument.id]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement
      )
        return;
      const semitone = keyboardMap[event.code];
      if (semitone === undefined) return;
      event.preventDefault();
      void pressKey(event.code, (octave + 1) * 12 + semitone);
    };
    const up = (event: KeyboardEvent) => {
      if (keyboardMap[event.code] !== undefined) releaseKey(event.code);
    };
    const blur = () => releaseAll();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", blur);
    };
  });

  useEffect(
    () => () => {
      if (countdownTimer.current !== null)
        window.clearInterval(countdownTimer.current);
      releaseAll();
    },
    [],
  );

  const toggleRecord = async () => {
    if (recording) {
      releaseAll();
      setRecording(false);
      props.onStatus("Gravação finalizada");
      return;
    }
    if (countIn) return;
    props.onStop();
    await engine.preloadInstrument(instrument, master);
    setCountIn(4);
    let beat = 4;
    countdownTimer.current = window.setInterval(async () => {
      beat -= 1;
      setCountIn(beat);
      if (beat <= 0) {
        if (countdownTimer.current !== null)
          window.clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        const startedAt = await props.onStartFromBeginning();
        recordStart.current = startedAt;
        take.current = Math.max(0, ...notes.map((note) => note.take)) + 1;
        setRecording(true);
        props.onStatus("Gravando teclado em loop");
      }
    }, 60000 / bpm);
  };

  const selected = notes.find((note) => note.id === selectedNote);
  const editNote = (id: string, change: Partial<NoteEvent>) =>
    updateNotes(
      notes.map((note) => (note.id === id ? { ...note, ...change } : note)),
    );
  const removeNote = (id: string) => {
    updateNotes(notes.filter((note) => note.id !== id));
    setSelectedNote(null);
  };
  const beginDrag = (
    event: React.PointerEvent,
    note: NoteEvent,
    mode: "move" | "resize",
  ) => {
    const grid = event.currentTarget.closest(
      ".piano-roll-grid",
    ) as HTMLElement | null;
    if (!grid) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: note.id,
      mode,
      x: event.clientX,
      y: event.clientY,
      note,
      width: grid.clientWidth,
      height: grid.clientHeight,
    };
    setSelectedNote(note.id);
    event.stopPropagation();
  };
  const moveDrag = (event: React.PointerEvent) => {
    const state = drag.current;
    if (!state) return;
    const deltaTick = Math.round(
      ((event.clientX - state.x) / state.width) * maxTick,
    );
    if (state.mode === "resize")
      editNote(state.id, {
        durationTicks: Math.max(
          1,
          Math.min(
            maxTick - state.note.startTick,
            state.note.durationTicks + deltaTick,
          ),
        ),
      });
    else
      editNote(state.id, {
        startTick: Math.max(
          0,
          Math.min(
            maxTick - state.note.durationTicks,
            state.note.startTick + deltaTick,
          ),
        ),
        note: Math.max(
          36,
          Math.min(
            84,
            state.note.note -
              Math.round((event.clientY - state.y) / (state.height / 49)),
          ),
        ),
      });
  };

  const rollNotes = useMemo(
    () => [...notes].sort((a, b) => a.startTick - b.startTick),
    [notes],
  );

  return (
    <div className="keyboard-studio">
      <div className="melodic-track-tabs">
        {tracks.map((item) => (
          <button
            key={item.id}
            className={item.id === track.id ? "selected" : ""}
            onClick={() => props.onSelectTrack(item.id)}
          >
            <i style={{ background: item.color }} />
            {item.name}
          </button>
        ))}
      </div>
      <div className="keyboard-toolbar">
        <label>
          INSTRUMENTO
          <select
            aria-label="Instrumento"
            value={track.instrumentId}
            onChange={(event) =>
              props.onTracksChange(
                tracks.map((item) =>
                  item.id === track.id
                    ? { ...item, instrumentId: event.target.value }
                    : item,
                ),
              )
            }
          >
            {instruments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          NOME
          <input
            aria-label="Nome da trilha melódica"
            value={track.name}
            onChange={(event) =>
              props.onTracksChange(
                tracks.map((item) =>
                  item.id === track.id
                    ? { ...item, name: event.target.value || "Melodia" }
                    : item,
                ),
              )
            }
          />
        </label>
        <label>
          VOL
          <input
            aria-label="Volume da trilha melódica"
            type="range"
            min="0"
            max="100"
            value={track.volume}
            onChange={(event) =>
              props.onTracksChange(
                tracks.map((item) =>
                  item.id === track.id
                    ? { ...item, volume: Number(event.target.value) }
                    : item,
                ),
              )
            }
          />
        </label>
        <button
          className={track.mute ? "engaged" : ""}
          onClick={() =>
            props.onTracksChange(
              tracks.map((item) =>
                item.id === track.id ? { ...item, mute: !item.mute } : item,
              ),
            )
          }
        >
          MUTE
        </button>
        <button
          className={track.solo ? "engaged" : ""}
          onClick={() =>
            props.onTracksChange(
              tracks.map((item) =>
                item.id === track.id ? { ...item, solo: !item.solo } : item,
              ),
            )
          }
        >
          SOLO
        </button>
      </div>
      <section className="assist-panel">
        <div>
          <b>Assistência musical</b>
          <small>Ajuda a tocar no tempo e dentro da tonalidade.</small>
        </div>
        <label>
          <input
            type="checkbox"
            checked={assist.timingEnabled}
            onChange={(event) =>
              updateAssist({ timingEnabled: event.target.checked })
            }
          />{" "}
          ENCAIXAR TEMPO
        </label>
        <select
          aria-label="Grade de encaixe"
          value={assist.grid}
          onChange={(event) =>
            updateAssist({
              grid: event.target.value as PerformanceAssist["grid"],
            })
          }
        >
          <option value="1/8">1/8</option>
          <option value="1/16">1/16</option>
          <option value="1/32">1/32</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={assist.noteEnabled}
            onChange={(event) =>
              updateAssist({ noteEnabled: event.target.checked })
            }
          />{" "}
          NOTAS NA ESCALA
        </label>
        <select
          aria-label="Tônica"
          value={assist.root}
          onChange={(event) =>
            updateAssist({
              root: Number(event.target.value),
              keySource: "manual",
            })
          }
        >
          {noteNames.map((name, index) => (
            <option value={index} key={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Escala"
          value={assist.scale}
          onChange={(event) =>
            updateAssist({
              scale: event.target.value as PerformanceAssist["scale"],
              keySource: "manual",
            })
          }
        >
          {Object.entries(scaleNames).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            updateNotes(
              notes.map((note) => correctedEvent(note, assist, swing, maxTick)),
            )
          }
        >
          CORRIGIR LOOP
        </button>
      </section>
      <div className="record-bar">
        <button
          className={recording ? "recording" : ""}
          onClick={() => void toggleRecord()}
        >
          {recording
            ? "PARAR GRAVAÇÃO"
            : countIn
              ? `ENTRADA EM ${countIn}`
              : "● GRAVAR"}
        </button>
        <button
          disabled={!notes.length}
          onClick={() => {
            const last = Math.max(...notes.map((note) => note.take));
            updateNotes(notes.filter((note) => note.take !== last));
          }}
        >
          DESFAZER ÚLTIMA PASSAGEM
        </button>
        <button disabled={!notes.length} onClick={() => updateNotes([])}>
          LIMPAR TRILHA
        </button>
        <span>
          {recording
            ? "GRAVANDO EM LOOP"
            : playing
              ? "REPRODUZINDO"
              : `${notes.length} NOTAS`}
        </span>
      </div>
      <div className="piano" role="group" aria-label="Teclado virtual">
        {Array.from({ length: 24 }, (_, semitone) => {
          const note = (octave + 1) * 12 + semitone;
          return (
            <button
              key={note}
              className={isBlack(note) ? "black" : "white"}
              aria-label={midiName(note)}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                void pressKey(`pointer-${event.pointerId}`, note);
              }}
              onPointerUp={(event) => releaseKey(`pointer-${event.pointerId}`)}
              onPointerCancel={(event) =>
                releaseKey(`pointer-${event.pointerId}`)
              }
            >
              <span>{midiName(note)}</span>
              <kbd>{keyLabels[semitone]}</kbd>
            </button>
          );
        })}
      </div>
      <div className="octave-controls">
        <button onClick={() => setOctave((value) => Math.max(1, value - 1))}>
          − OITAVA
        </button>
        <strong>
          C{octave}–B{octave + 1}
        </strong>
        <button onClick={() => setOctave((value) => Math.min(6, value + 1))}>
          + OITAVA
        </button>
        <small>
          {instrument.description} · {instrument.license}
        </small>
      </div>
      <section className="piano-roll">
        <div className="piano-roll-head">
          <div>
            <b>Piano roll</b>
            <small>
              Arraste para mudar tempo e nota; use a alça para a duração.
            </small>
          </div>
          <span>
            {pattern.length / 16} compasso(s) · {assist.grid}
          </span>
        </div>
        <div
          className="piano-roll-grid"
          onPointerMove={moveDrag}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          {Array.from({ length: pattern.length }, (_, index) => (
            <i
              key={index}
              style={{ left: `${(index / pattern.length) * 100}%` }}
            />
          ))}
          {rollNotes.map((note) => (
            <button
              key={note.id}
              className={`roll-note ${selectedNote === note.id ? "selected" : ""}`}
              style={{
                left: `${(note.startTick / maxTick) * 100}%`,
                width: `${Math.max(1.2, (note.durationTicks / maxTick) * 100)}%`,
                top: `${((84 - note.note) / 49) * 100}%`,
                background: track.color,
              }}
              onPointerDown={(event) => beginDrag(event, note, "move")}
              onDoubleClick={() => removeNote(note.id)}
              title={`${midiName(note.note)} · velocity ${Math.round(note.velocity * 100)}%`}
            >
              <span>{midiName(note.note)}</span>
              <i onPointerDown={(event) => beginDrag(event, note, "resize")} />
            </button>
          ))}
        </div>
        {selected && (
          <div className="note-inspector">
            <b>{midiName(selected.note)}</b>
            <button
              onClick={() => editNote(selected.id, { note: selected.note - 1 })}
            >
              NOTA −
            </button>
            <button
              onClick={() => editNote(selected.id, { note: selected.note + 1 })}
            >
              NOTA +
            </button>
            <button
              onClick={() =>
                editNote(selected.id, {
                  startTick: Math.max(
                    0,
                    selected.startTick - gridTicks(assist.grid),
                  ),
                })
              }
            >
              TEMPO ←
            </button>
            <button
              onClick={() =>
                editNote(selected.id, {
                  startTick: Math.min(
                    maxTick - selected.durationTicks,
                    selected.startTick + gridTicks(assist.grid),
                  ),
                })
              }
            >
              TEMPO →
            </button>
            <label>
              INTENSIDADE{" "}
              <input
                aria-label="Intensidade da nota"
                type="range"
                min="10"
                max="100"
                value={selected.velocity * 100}
                onChange={(event) =>
                  editNote(selected.id, {
                    velocity: Number(event.target.value) / 100,
                  })
                }
              />
            </label>
            <button className="danger" onClick={() => removeNote(selected.id)}>
              EXCLUIR
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
