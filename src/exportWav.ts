import type {
  InstrumentDescriptor,
  MasterSettings,
  Pattern,
  SampleDescriptor,
  StudioProject,
  Track,
} from "./types";

type TimelineEvent = { pattern: Pattern; step: number; offset: number };

function timeline(project: StudioProject) {
  const sequence = project.arrangement.flatMap((clip) => {
    const item = project.patterns.find(
      (pattern) => pattern.id === clip.patternId,
    );
    return item ? Array.from({ length: clip.repeats }, () => item) : [];
  });
  const events: TimelineEvent[] = [];
  let offset = 0;
  sequence.forEach((pattern) => {
    for (let step = 0; step < pattern.length; step++) {
      events.push({ pattern, step, offset });
      offset += 60 / (pattern.bpm ?? project.bpm) / 4;
    }
  });
  return { sequence, events, seconds: offset };
}

function connectMaster(ctx: BaseAudioContext, settings: MasterSettings) {
  const low = ctx.createBiquadFilter();
  low.type = "lowshelf";
  low.frequency.value = 180;
  low.gain.value = settings.low;
  const mid = ctx.createBiquadFilter();
  mid.type = "peaking";
  mid.frequency.value = 1200;
  mid.Q.value = 0.8;
  mid.gain.value = settings.mid;
  const high = ctx.createBiquadFilter();
  high.type = "highshelf";
  high.frequency.value = 6500;
  high.gain.value = settings.high;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24 + settings.compressor * 0.2;
  compressor.ratio.value = 1 + settings.compressor / 12;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = settings.limiter ? -1 : 0;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.08;
  const gain = ctx.createGain();
  gain.gain.value = settings.volume / 100;
  low
    .connect(mid)
    .connect(high)
    .connect(compressor)
    .connect(limiter)
    .connect(gain)
    .connect(ctx.destination);
  return low;
}

export async function exportWav(
  project: StudioProject,
  buffers: Record<string, AudioBuffer>,
  samples: Record<string, SampleDescriptor> = {},
  instrumentBuffers: Record<string, AudioBuffer> = {},
  instruments: Record<string, InstrumentDescriptor> = {},
) {
  const { sequence, events, seconds } = timeline(project);
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(
    2,
    Math.max(1, Math.ceil((seconds + 0.05) * sampleRate)),
    sampleRate,
  );
  const master = connectMaster(ctx, project.master);
  const hasSolo = project.tracks.some((track) => track.solo);

  let currentOffset = 0;
  let previousBaseId: string | null = null;
  let baseSource: AudioBufferSourceNode | null = null;
  for (const pattern of sequence) {
    const duration = (pattern.length * 60) / (pattern.bpm ?? project.bpm) / 4;
    const base =
      pattern.base && !pattern.base.muted
        ? samples[pattern.base.sampleId]
        : undefined;
    if (base && buffers[base.id] && base.id !== previousBaseId) {
      if (baseSource) {
        try {
          baseSource.stop(currentOffset);
        } catch {}
      }
      const source = ctx.createBufferSource();
      source.buffer = buffers[base.id];
      source.loop = true;
      const loopStart = Math.max(
        0,
        Math.min(base.musical?.loopStart ?? 0, source.buffer.duration),
      );
      const loopEnd = Math.max(
        loopStart + 0.001,
        Math.min(
          base.musical?.loopEnd ?? source.buffer.duration,
          source.buffer.duration,
        ),
      );
      source.loopStart = loopStart;
      source.loopEnd = loopEnd;
      const gain = ctx.createGain();
      gain.gain.value = pattern.base!.volume / 100;
      source.connect(gain).connect(master);
      source.start(currentOffset);
      baseSource = source;
    } else if (!base && baseSource) {
      try {
        baseSource.stop(currentOffset);
      } catch {}
      baseSource = null;
    }
    previousBaseId = base?.id ?? null;
    currentOffset += duration;
  }
  if (baseSource) {
    try {
      baseSource.stop(currentOffset + 0.015);
    } catch {}
  }

  events.forEach((event) => {
    const stepSeconds = 60 / (event.pattern.bpm ?? project.bpm) / 4;
    const swingDelay =
      event.step % 2 === 1 ? (stepSeconds / 3) * (project.swing / 60) : 0;
    const when = event.offset + swingDelay;
    project.tracks.forEach((track: Track) => {
      if (track.mute || (hasSolo && !track.solo)) return;
      const item = event.pattern.steps[track.id]?.[event.step];
      const buffer = buffers[track.sampleId];
      if (!item?.active || !buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = (track.volume / 100) * item.velocity;
      const pan = ctx.createStereoPanner();
      pan.pan.value = track.pan;
      source.connect(gain).connect(pan).connect(master);
      source.start(when);
    });
  });

  const melodicTracks = project.version === 3 ? project.melodicTracks : [];
  const melodicSolo = melodicTracks.some((track) => track.solo);
  let melodicOffset = 0;
  sequence.forEach((pattern) => {
    const eventBpm = pattern.bpm ?? project.bpm;
    const secondsPerTick = 60 / eventBpm / 96;
    melodicTracks.forEach((track) => {
      if (track.mute || (melodicSolo && !track.solo)) return;
      const instrument = instruments[track.instrumentId];
      if (!instrument) return;
      for (const note of pattern.melodicNotes?.[track.id] ?? []) {
        const when = melodicOffset + note.startTick * secondsPerTick;
        const duration = Math.max(0.02, note.durationTicks * secondsPerTick);
        const gain = ctx.createGain();
        const pan = ctx.createStereoPanner();
        pan.pan.value = track.pan;
        const peak = (track.volume / 100) * note.velocity;
        const envelope = instrument.envelope;
        gain.gain.setValueAtTime(0, when);
        gain.gain.linearRampToValueAtTime(peak, when + envelope.attack);
        gain.gain.linearRampToValueAtTime(
          peak * envelope.sustain,
          when + envelope.attack + envelope.decay,
        );
        gain.gain.setValueAtTime(peak * envelope.sustain, when + duration);
        gain.gain.linearRampToValueAtTime(
          0,
          when + duration + envelope.release,
        );
        if (instrument.engine === "sampler") {
          const zone =
            instrument.zones.find(
              (item) => note.note >= item.minNote && note.note <= item.maxNote,
            ) ?? instrument.zones[0];
          const buffer = zone && instrumentBuffers[zone.url];
          if (!zone || !buffer) continue;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.value = Math.pow(
            2,
            (note.note - zone.rootNote) / 12,
          );
          source.connect(gain).connect(pan).connect(master);
          source.start(when);
          source.stop(when + duration + envelope.release + 0.02);
        } else {
          const oscillator = ctx.createOscillator();
          oscillator.type = instrument.oscillator ?? "triangle";
          oscillator.frequency.value = 440 * Math.pow(2, (note.note - 69) / 12);
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = instrument.filterHz ?? 1800;
          filter.Q.value = instrument.id === "analog-bass" ? 2.2 : 0.7;
          oscillator.connect(filter).connect(gain).connect(pan).connect(master);
          oscillator.start(when);
          oscillator.stop(when + duration + envelope.release + 0.02);
        }
      }
    });
    melodicOffset += (pattern.length * 60) / eventBpm / 4;
  });
  return encodeWav(await ctx.startRendering());
}

function encodeWav(buffer: AudioBuffer) {
  const channels = 2;
  const length = buffer.length * channels * 2 + 44;
  const view = new DataView(new ArrayBuffer(length));
  const write = (offset: number, value: string) =>
    [...value].forEach((char, index) =>
      view.setUint8(offset + index, char.charCodeAt(0)),
    );
  write(0, "RIFF");
  view.setUint32(4, length - 8, true);
  write(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, length - 44, true);
  let offset = 44;
  for (let index = 0; index < buffer.length; index++)
    for (let channel = 0; channel < channels; channel++) {
      const value = Math.max(
        -1,
        Math.min(
          1,
          buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1))[
            index
          ],
        ),
      );
      view.setInt16(offset, value < 0 ? value * 0x8000 : value * 0x7fff, true);
      offset += 2;
    }
  return new Blob([view], { type: "audio/wav" });
}
