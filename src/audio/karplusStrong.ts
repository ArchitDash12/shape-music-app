/**
 * Karplus-Strong Physical Modeling Guitar Pluck Synthesizer
 * Uses delay-line feedback loop with low-pass damping filter and stereo placement.
 */

export class KarplusStrongGuitar {
  private ctx: AudioContext;
  private outputNode: GainNode;

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.value = 0.85;
    this.outputNode.connect(destination);
  }

  /**
   * Plucks a guitar string at a given frequency with velocity and brightness
   */
  public pluck(
    frequency: number,
    velocity = 0.8,
    brightness = 0.85,
    stringIndex = 0,
    sustain = 2.5
  ): void {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const period = 1 / Math.max(30, Math.min(2000, frequency));

    // Stereo Panning (-0.5 for low strings to +0.5 for high strings)
    const panVal = -0.5 + (stringIndex / 5) * 1.0;
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(panVal, now);
      panner.connect(this.outputNode);
    }

    const pluckDestination = panner ? panner : this.outputNode;

    // Excitation Noise Burst Buffer
    const bufferSize = Math.max(128, Math.floor(this.ctx.sampleRate * Math.min(0.015, period * 2)));
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Filtered pinkish/white noise burst for pluck transient
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // 1-pole lowpass filter for smoother, warmer acoustic pick attack
      lastOut = lastOut * 0.4 + white * 0.6;
      // Exponential decay envelope on the excitation burst
      const env = Math.exp(-4 * (i / bufferSize));
      output[i] = lastOut * env * velocity;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Delay line for feedback
    const delay = this.ctx.createDelay(1.0);
    delay.delayTime.setValueAtTime(period, now);

    // Feedback Damping Filter (Simulates string stiffness and internal friction)
    const dampingFilter = this.ctx.createBiquadFilter();
    dampingFilter.type = 'lowpass';
    const cutoff = Math.min(16000, Math.max(1200, frequency * 8 * brightness));
    dampingFilter.frequency.setValueAtTime(cutoff, now);
    dampingFilter.frequency.exponentialRampToValueAtTime(Math.max(400, frequency * 2), now + sustain);

    // Feedback Gain (String decay rate)
    // Higher frequencies decay faster in physical strings
    const feedbackGain = this.ctx.createGain();
    const decayFactor = 0.988 - Math.min(0.04, frequency * 0.00003);
    feedbackGain.gain.setValueAtTime(decayFactor, now);
    feedbackGain.gain.exponentialRampToValueAtTime(0.0001, now + sustain);

    // Body Resonator (Guitar body formant peak around 100-250Hz for warm acoustic resonance)
    const bodyFilter = this.ctx.createBiquadFilter();
    bodyFilter.type = 'peaking';
    bodyFilter.frequency.setValueAtTime(180, now);
    bodyFilter.Q.setValueAtTime(2.0, now);
    bodyFilter.gain.setValueAtTime(4.0, now);

    // Master Pluck Envelope
    const stringEnvelope = this.ctx.createGain();
    stringEnvelope.gain.setValueAtTime(velocity, now);
    stringEnvelope.gain.exponentialRampToValueAtTime(0.0001, now + sustain + 0.1);

    // Connect Feedback Loop:
    // Noise -> Delay -> DampingFilter -> FeedbackGain -> Delay
    noiseSource.connect(delay);
    delay.connect(dampingFilter);
    dampingFilter.connect(feedbackGain);
    feedbackGain.connect(delay);

    // Connect To Output via Body Resonator
    dampingFilter.connect(bodyFilter);
    bodyFilter.connect(stringEnvelope);
    stringEnvelope.connect(pluckDestination);

    // Start & auto-cleanup
    noiseSource.start(now);
    noiseSource.stop(now + 0.02);

    setTimeout(() => {
      try {
        noiseSource.disconnect();
        delay.disconnect();
        dampingFilter.disconnect();
        feedbackGain.disconnect();
        bodyFilter.disconnect();
        stringEnvelope.disconnect();
        if (panner) panner.disconnect();
      } catch {
        // already cleaned up
      }
    }, (sustain + 0.2) * 1000);
  }
}
