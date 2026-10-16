import { DrumSynthesizer } from './drumSynth';
import type { DrumType } from './drumSynth';
import { KarplusStrongGuitar } from './karplusStrong';
import type { MusicalNote } from './scaleQuantizer';


export interface NoteEvent {
  id: string;
  type: 'string' | 'well' | 'bumper' | 'drum';
  note?: MusicalNote;
  drumType?: DrumType;
  label: string;
  velocity: number;
  timestamp: number;
  color?: string;
}

export type NoteEventListener = (event: NoteEvent) => void;

export class AudioEngine {
  private static instance: AudioEngine | null = null;
  public ctx: AudioContext | null = null;

  public guitar: KarplusStrongGuitar | null = null;
  public drums: DrumSynthesizer | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  private listeners: Set<NoteEventListener> = new Set();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public init(): void {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master Dynamics Compressor for punchy analog warmth & prevent clipping
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
    this.compressor.knee.setValueAtTime(24, this.ctx.currentTime);
    this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.compressor.release.setValueAtTime(0.18, this.ctx.currentTime);

    // Analyser Node for reactive 3D visualizers & neon oscilloscopes
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    // Subtle Vaporwave Stereo Echo Delay
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.setValueAtTime(0.28, this.ctx.currentTime); // ~107 bpm 8th note
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.setValueAtTime(0.22, this.ctx.currentTime);

    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(2600, this.ctx.currentTime);

    // Routing
    // Synth -> Compressor -> Analyser -> MasterGain -> Destination
    // Delay loop: Compressor -> Delay -> Filter -> Feedback -> Delay & Master
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.compressor.connect(this.delayNode);
    this.delayNode.connect(delayFilter);
    delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    delayFilter.connect(this.masterGain);

    // Instruments
    this.guitar = new KarplusStrongGuitar(this.ctx, this.compressor);
    this.drums = new DrumSynthesizer(this.ctx, this.compressor);

    this.isInitialized = true;
  }

  public playGuitarString(note: MusicalNote, stringIndex: number, velocity = 0.85): void {
    this.init();
    if (!this.guitar) return;

    this.guitar.pluck(note.frequency, velocity, 0.88, stringIndex, 2.6);

    this.notifyNote({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'string',
      note,
      label: note.name,
      velocity,
      timestamp: performance.now(),
      color: '#00f3ff'
    });
  }

  public playDrum(type: DrumType, velocity = 0.9): void {
    this.init();
    if (!this.drums) return;

    this.drums.trigger(type, velocity);

    const labels: Record<DrumType, string> = {
      kick: 'Kick 808',
      snare: 'Snare Gated',
      hihat: 'Hi-Hat (C)',
      hihatOpen: 'Hi-Hat (O)',
      tom: 'Synth Tom',
      clap: 'Vapor Clap'
    };

    const colors: Record<DrumType, string> = {
      kick: '#ff2a85',
      snare: '#00f3ff',
      hihat: '#bbf400',
      hihatOpen: '#ffb703',
      tom: '#a855f7',
      clap: '#ec4899'
    };

    this.notifyNote({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'drum',
      drumType: type,
      label: labels[type],
      velocity,
      timestamp: performance.now(),
      color: colors[type]
    });
  }

  /**
   * Plays an ethereal resonant chime when an orb passes near a Gravity Well or hits a Bumper
   */
  public playChime(
    note: MusicalNote,
    type: 'well' | 'bumper',
    velocity = 0.8,
    color = '#bbf400'
  ): void {
    this.init();
    if (!this.ctx || !this.compressor) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // FM/Sine Chime for lush vaporwave gravity well harmonic resonance
    if (type === 'well') {
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(note.frequency, now);
      osc2.frequency.setValueAtTime(note.frequency * 2.002, now); // subtle crystalline chorus

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.4 * velocity, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    } else {
      // Bumper: brighter glass/rhodes metallic pluck
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(note.frequency, now);
      osc2.frequency.setValueAtTime(note.frequency * 3.01, now);

      gain.gain.setValueAtTime(0.6 * velocity, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    }

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.compressor);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.0);
    osc2.stop(now + 2.0);

    this.notifyNote({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      note,
      label: note.name,
      velocity,
      timestamp: performance.now(),
      color
    });
  }

  public getAudioFrequencyData(): Uint8Array {
    if (!this.analyser) {
      return new Uint8Array(128);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  public subscribeNote(listener: NoteEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyNote(event: NoteEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  public setMasterVolume(val: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
  }
}
