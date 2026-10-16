/**
 * Vaporwave / 80s Drum Synthesizer Engine
 * Pure Web Audio API synthesis for punchy, latency-free retro percussion.
 */

export type DrumType = 'kick' | 'snare' | 'hihat' | 'hihatOpen' | 'tom' | 'clap';

export interface DrumHitEvent {
  type: DrumType;
  label: string;
  velocity: number;
  time: number;
}

export class DrumSynthesizer {
  private ctx: AudioContext;
  private outputNode: GainNode;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.value = 0.9;
    this.outputNode.connect(destination);
  }

  public trigger(type: DrumType, velocity = 0.9): void {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    switch (type) {
      case 'kick':
        this.playKick(velocity);
        break;
      case 'snare':
        this.playSnare(velocity);
        break;
      case 'hihat':
        this.playHiHat(false, velocity);
        break;
      case 'hihatOpen':
        this.playHiHat(true, velocity);
        break;
      case 'tom':
        this.playTom(velocity);
        break;
      case 'clap':
        this.playClap(velocity);
        break;
    }
  }

  private playKick(velocity: number): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // 808 Pitch drop: 160Hz snap down to 42Hz sub
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

    // Click transient
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(300, now);
    clickGain.gain.setValueAtTime(0.4 * velocity, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    // Amplitude envelope
    gain.gain.setValueAtTime(1.0 * velocity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    clickOsc.connect(clickGain);
    clickGain.connect(this.outputNode);
    gain.connect(this.outputNode);

    osc.start(now);
    clickOsc.start(now);
    osc.stop(now + 0.45);
    clickOsc.stop(now + 0.03);
  }

  private playSnare(velocity: number): void {
    const now = this.ctx.currentTime;

    // Dual-tone body (180Hz & 330Hz)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(180, now);
    osc1.frequency.exponentialRampToValueAtTime(90, now + 0.12);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(330, now);
    osc2.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    bodyGain.gain.setValueAtTime(0.7 * velocity, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(bodyGain);
    osc2.connect(bodyGain);
    bodyGain.connect(this.outputNode);

    // Gated 80s Reverb Snare Noise Snare
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.3);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1000, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9 * velocity, now);
    // Gated release: punchy decay then cut
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    noiseGain.gain.linearRampToValueAtTime(0.0, now + 0.25);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.outputNode);

    osc1.start(now);
    osc2.start(now);
    noise.start(now);

    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
    noise.stop(now + 0.26);
  }

  private playHiHat(isOpen: boolean, velocity: number): void {
    const now = this.ctx.currentTime;
    const duration = isOpen ? 0.35 : 0.06;

    // Metallic ring with 6 inharmonic square wave oscillators
    const freqs = [205, 304, 369, 522, 540, 800];
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(8000, now);
    bandpass.Q.setValueAtTime(2.0, now);

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(7000, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6 * velocity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    bandpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.outputNode);

    const oscs: OscillatorNode[] = [];
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, now);
      osc.connect(bandpass);
      osc.start(now);
      osc.stop(now + duration + 0.05);
      oscs.push(osc);
    });
  }

  private playTom(velocity: number): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.25);

    gain.gain.setValueAtTime(0.85 * velocity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.outputNode);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  private playClap(velocity: number): void {
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = this.ctx.createGain();
    // 3 quick transient bursts (flam effect) followed by main decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.setValueAtTime(0.7 * velocity, now + 0.01);
    gain.gain.setValueAtTime(0.05, now + 0.02);
    gain.gain.setValueAtTime(0.8 * velocity, now + 0.03);
    gain.gain.setValueAtTime(0.05, now + 0.04);
    gain.gain.setValueAtTime(0.9 * velocity, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    noise.start(now);
    noise.stop(now + 0.27);
  }
}
