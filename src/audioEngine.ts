import { sampleUrl } from "./catalog";
import type { MasterSettings, SampleDescriptor } from "./types";

export type AudioGraph = {
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  limiter: DynamicsCompressorNode;
  gain: GainNode;
};

/** Owns every source node so Stop is a real audio operation, not only a UI change. */
export class AudioEngine {
  context: AudioContext | null = null;
  graph: AudioGraph | null = null;
  private buffers: Record<string, AudioBuffer> = {};
  private unavailable = new Set<string>();
  private activeSources = new Set<AudioBufferSourceNode>();
  private previewSource: AudioBufferSourceNode | null = null;
  private generation = 0;

  async unlock(master: MasterSettings) {
    if (!this.context) {
      const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) throw new Error("Web Audio não disponível neste navegador");
      const context = new Context();
      const low = context.createBiquadFilter(); low.type = "lowshelf"; low.frequency.value = 180;
      const mid = context.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 1200; mid.Q.value = .8;
      const high = context.createBiquadFilter(); high.type = "highshelf"; high.frequency.value = 6500;
      const compressor = context.createDynamicsCompressor();
      const limiter = context.createDynamicsCompressor(); limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = .001; limiter.release.value = .08;
      const gain = context.createGain();
      low.connect(mid).connect(high).connect(compressor).connect(limiter).connect(gain).connect(context.destination);
      this.context = context;
      this.graph = { low, mid, high, compressor, limiter, gain };
    }
    if (this.context.state === "suspended") await this.context.resume();
    this.applyMaster(master);
  }

  applyMaster(settings: MasterSettings) {
    if (!this.graph) return;
    this.graph.low.gain.value = settings.low;
    this.graph.mid.gain.value = settings.mid;
    this.graph.high.gain.value = settings.high;
    this.graph.compressor.threshold.value = -24 + settings.compressor * .2;
    this.graph.compressor.ratio.value = 1 + settings.compressor / 12;
    this.graph.limiter.threshold.value = settings.limiter ? -1 : 0;
    this.graph.gain.gain.value = settings.volume / 100;
  }

  token() { return this.generation; }

  async bufferFor(sample: SampleDescriptor, master: MasterSettings) {
    await this.unlock(master);
    if (this.buffers[sample.id]) return this.buffers[sample.id];
    if (this.unavailable.has(sample.id)) throw new Error(`Sample incompatível: ${sample.name}`);
    let lastError: unknown;
    for (const variant of sample.variants) {
      try {
        const response = await fetch(sampleUrl(sample, variant));
        if (!response.ok) continue;
        const buffer = await this.context!.decodeAudioData(await response.arrayBuffer());
        this.buffers[sample.id] = buffer;
        return buffer;
      } catch (error) { lastError = error; }
    }
    this.unavailable.add(sample.id);
    throw lastError ?? new Error(`Sample indisponível: ${sample.name}`);
  }

  async preload(samples: SampleDescriptor[], master: MasterSettings) {
    const results = await Promise.allSettled(samples.map(sample => this.bufferFor(sample, master)));
    return results.reduce((failed, result, index) => result.status === "rejected" ? [...failed, samples[index].id] : failed, [] as string[]);
  }

  isAvailable(sampleId: string) { return Boolean(this.buffers[sampleId]) && !this.unavailable.has(sampleId); }

  private register(source: AudioBufferSourceNode) {
    this.activeSources.add(source);
    source.addEventListener("ended", () => { this.activeSources.delete(source); try { source.disconnect(); } catch {} }, { once: true });
  }

  async startOneShot(sample: SampleDescriptor, volume: number, pan: number, when: number, master: MasterSettings, token: number, velocity = 1) {
    const buffer = await this.bufferFor(sample, master);
    if (token !== this.generation || !this.context || !this.graph) return false;
    const source = this.context.createBufferSource(); source.buffer = buffer;
    const gain = this.context.createGain(); gain.gain.value = Math.max(0, Math.min(1, volume / 100 * velocity));
    const stereo = this.context.createStereoPanner(); stereo.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(gain).connect(stereo).connect(this.graph.low);
    this.register(source); source.start(Math.max(when, this.context.currentTime));
    return true;
  }

  async startLoop(sample: SampleDescriptor, volume: number, when: number, master: MasterSettings, token: number, duration?: number, offset = 0) {
    const buffer = await this.bufferFor(sample, master);
    if (token !== this.generation || !this.context || !this.graph) return false;
    const source = this.context.createBufferSource(); source.buffer = buffer; source.loop = true;
    const loopStart = Math.max(0, Math.min(sample.musical?.loopStart ?? 0, buffer.duration));
    const loopEnd = Math.max(loopStart + .001, Math.min(sample.musical?.loopEnd ?? buffer.duration, buffer.duration));
    source.loopStart = loopStart; source.loopEnd = loopEnd;
    const gain = this.context.createGain(); gain.gain.setValueAtTime(0, Math.max(when, this.context.currentTime)); gain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume / 100)), Math.max(when, this.context.currentTime) + .01);
    source.connect(gain).connect(this.graph.low);
    this.register(source);
    const startOffset = loopStart + ((offset - loopStart) % (loopEnd - loopStart) + (loopEnd - loopStart)) % (loopEnd - loopStart);
    source.start(Math.max(when, this.context.currentTime), startOffset);
    if (duration !== undefined) { const stopAt = Math.max(when, this.context.currentTime) + duration; gain.gain.setValueAtTime(Math.max(0, Math.min(1, volume / 100)), Math.max(when, stopAt - .01)); gain.gain.linearRampToValueAtTime(0, stopAt); source.stop(stopAt + .015); }
    return true;
  }

  async preview(sample: SampleDescriptor, master: MasterSettings, onStatus?: (status: string) => void) {
    this.previewSource?.stop(); this.previewSource = null;
    const token = this.generation;
    const buffer = await this.bufferFor(sample, master);
    if (token !== this.generation || !this.context || !this.graph) return;
    const source = this.context.createBufferSource(); source.buffer = buffer; source.connect(this.graph.low); this.register(source); this.previewSource = source;
    source.addEventListener("ended", () => { if (this.previewSource === source) this.previewSource = null; }, { once: true });
    source.start(); onStatus?.(`Pré-escutando ${sample.name}`);
  }

  stopAll() {
    this.generation += 1;
    for (const source of this.activeSources) { try { source.stop(); } catch {} try { source.disconnect(); } catch {} }
    this.activeSources.clear(); this.previewSource = null;
  }

  activeCount() { return this.activeSources.size; }

  getBuffers() { return this.buffers; }

  async close() { this.stopAll(); if (this.context) await this.context.close(); this.context = null; this.graph = null; }
}
