import { AudioEngine } from '../audio/audioEngine';
import { DEFAULT_GUITAR_STRINGS, SCALES, quantizeToScale } from '../audio/scaleQuantizer';
import type {
  InteractiveDrumPad,
  InteractiveShape,
  Orb,
  Particle,
  PhysicalString,
  Shockwave
} from './types';


export class PhysicsEngine {
  public width = 1200;
  public height = 800;

  public orbs: Orb[] = [];
  public shapes: InteractiveShape[] = [];
  public strings: PhysicalString[] = [];
  public drumPads: InteractiveDrumPad[] = [];
  public shockwaves: Shockwave[] = [];
  public particles: Particle[] = [];

  // Configuration
  public gravityConstant = 2500;
  public damping = 0.999;
  public bpm = 110;
  public activeScale = SCALES[0];
  public autoEmitter = true;
  private lastEmitTime = 0;
  private audioEngine: AudioEngine;

  constructor() {
    this.audioEngine = AudioEngine.getInstance();
    this.initializeDefaults();
  }

  public resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
    this.repositionElements();
  }

  public initializeDefaults(): void {
    this.orbs = [];
    this.shapes = [];
    this.strings = [];
    this.drumPads = [];
    this.shockwaves = [];
    this.particles = [];

    // Setup Strings in upper-middle area (spanning 80% of width)
    const stringStartY = this.height * 0.22;
    const stringSpacing = Math.min(48, this.height * 0.055);
    const marginX = this.width * 0.1;

    DEFAULT_GUITAR_STRINGS.forEach((s, i) => {
      this.strings.push({
        index: i,
        y: stringStartY + i * stringSpacing,
        xStart: marginX,
        xEnd: this.width - marginX,
        note: s.note,
        color: s.color,
        thickness: s.thickness,
        amplitude: 0,
        frequency: 20 + i * 4,
        pluckX: 0.5,
        decay: 0.94,
        phase: 0
      });
    });

    // Setup Default Shapes (Gravity Wells & Bumpers in orbital arrangement)
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.58;

    // Center Gravity Well (Hirajoshi / Vapor Root Chime)
    this.shapes.push({
      id: 'well-main',
      type: 'gravity-well',
      x: centerX,
      y: centerY,
      radius: 42,
      mass: 5500,
      elasticity: 0.8,
      color: '#ff2a85',
      note: quantizeToScale(0.3, this.activeScale),
      glowIntensity: 1.0,
      pulsePhase: 0,
      shapeForm: 'circle'
    });

    // Left Bumper (Prism / Diamond)
    this.shapes.push({
      id: 'bumper-left',
      type: 'bumper',
      x: centerX - 240,
      y: centerY - 40,
      radius: 34,
      mass: 0,
      elasticity: 1.25,
      color: '#00f3ff',
      note: quantizeToScale(0.6, this.activeScale),
      glowIntensity: 1.0,
      pulsePhase: 1.2,
      shapeForm: 'diamond'
    });

    // Right Bumper (Hexagon / Harmonic Gate)
    this.shapes.push({
      id: 'bumper-right',
      type: 'bumper',
      x: centerX + 240,
      y: centerY - 40,
      radius: 34,
      mass: 0,
      elasticity: 1.25,
      color: '#bbf400',
      note: quantizeToScale(0.85, this.activeScale),
      glowIntensity: 1.0,
      pulsePhase: 2.4,
      shapeForm: 'hexagon'
    });

    // Top Well (Pulls orbs near strings)
    this.shapes.push({
      id: 'well-top',
      type: 'gravity-well',
      x: centerX,
      y: stringStartY - 50,
      radius: 28,
      mass: 3200,
      elasticity: 0.8,
      color: '#a855f7',
      note: quantizeToScale(0.1, this.activeScale),
      glowIntensity: 0.9,
      pulsePhase: 3.1,
      shapeForm: 'circle'
    });

    // Setup Drum Pads along the lower-middle zone above sheet music
    const drumY = Math.min(this.height * 0.76, this.height - 180);
    const drumDefs: { type: import('../audio/drumSynth').DrumType; name: string; color: string; key: string }[] = [
      { type: 'kick', name: '808 KICK', color: '#ff2a85', key: '1' },
      { type: 'snare', name: 'GATED SNARE', color: '#00f3ff', key: '2' },
      { type: 'hihat', name: 'CLOSED HAT', color: '#bbf400', key: '3' },
      { type: 'hihatOpen', name: 'OPEN HAT', color: '#ffb703', key: '4' },
      { type: 'tom', name: 'SYNTH TOM', color: '#a855f7', key: '5' },
      { type: 'clap', name: 'VAPOR CLAP', color: '#ec4899', key: '6' },
    ];

    const drumSpacing = Math.min(95, (this.width - 120) / drumDefs.length);
    const drumStart = centerX - ((drumDefs.length - 1) * drumSpacing) / 2;

    drumDefs.forEach((d, i) => {
      this.drumPads.push({
        id: `pad-${d.type}`,
        type: d.type,
        name: d.name,
        x: drumStart + i * drumSpacing,
        y: drumY,
        radius: 32,
        color: d.color,
        hitState: 0,
        shortcutKey: d.key
      });
    });

    // Spawn 3 initial rhythmic orbs
    this.spawnOrb(centerX - 160, centerY - 140, 2.2, 1.4, '#00f3ff');
    this.spawnOrb(centerX + 160, centerY - 140, -2.0, 1.6, '#ff2a85');
    this.spawnOrb(centerX, centerY + 180, 2.8, -1.8, '#bbf400');
  }

  private repositionElements(): void {
    const stringStartY = this.height * 0.22;
    const stringSpacing = Math.min(48, this.height * 0.055);
    const marginX = this.width * 0.1;

    this.strings.forEach((s, i) => {
      s.y = stringStartY + i * stringSpacing;
      s.xStart = marginX;
      s.xEnd = this.width - marginX;
    });

    const drumY = Math.min(this.height * 0.76, this.height - 180);
    const centerX = this.width * 0.5;
    const drumSpacing = Math.min(95, (this.width - 120) / Math.max(1, this.drumPads.length));
    const drumStart = centerX - ((this.drumPads.length - 1) * drumSpacing) / 2;

    this.drumPads.forEach((d, i) => {
      d.x = drumStart + i * drumSpacing;
      d.y = drumY;
    });
  }

  public spawnOrb(x: number, y: number, vx: number, vy: number, color = '#00f3ff'): Orb {
    const orb: Orb = {
      id: `orb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      x,
      y,
      vx,
      vy,
      radius: 9,
      color,
      trail: [],
      lastWellTriggerTimes: {},
      lastStringCrossTimes: {},
      speed: Math.hypot(vx, vy)
    };
    this.orbs.push(orb);
    return orb;
  }

  public pluckString(index: number, pluckX = 0.5, velocity = 0.85): void {
    const str = this.strings[index];
    if (!str) return;

    str.amplitude = Math.min(26, 12 + velocity * 14);
    str.pluckX = Math.max(0.05, Math.min(0.95, pluckX));
    str.phase = 0;

    this.audioEngine.playGuitarString(str.note, index, velocity);

    // Spawn pluck shockwave and sparks
    const px = str.xStart + (str.xEnd - str.xStart) * str.pluckX;
    this.createShockwave(px, str.y, str.color, 45);
    this.createParticleBurst(px, str.y, str.color, 12);
  }

  public hitDrumPad(pad: InteractiveDrumPad, velocity = 0.9): void {
    pad.hitState = 1.0;
    this.audioEngine.playDrum(pad.type, velocity);
    this.createShockwave(pad.x, pad.y, pad.color, pad.radius * 2.2);
    this.createParticleBurst(pad.x, pad.y, pad.color, 16);
  }

  public createShockwave(x: number, y: number, color: string, maxRadius = 60): void {
    this.shockwaves.push({
      id: `${Date.now()}-${Math.random()}`,
      x,
      y,
      color,
      radius: 4,
      maxRadius,
      lineWidth: 3,
      alpha: 1.0
    });
  }

  public createParticleBurst(x: number, y: number, color: string, count = 10): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        maxLife: 20 + Math.random() * 25,
        life: 0
      });
    }
  }

  public setScale(scale: import('../audio/scaleQuantizer').ScaleDefinition): void {
    this.activeScale = scale;
    // Re-quantize shape notes to the newly selected scale
    this.shapes.forEach((shape, i) => {
      shape.note = quantizeToScale(i / Math.max(1, this.shapes.length), scale);
    });
  }

  public update(dt: number, currentTime: number): void {
    const timeSec = currentTime * 0.001;

    // 1. Auto Emitter: Rhythmically release orbs if enabled (synced to BPM)
    if (this.autoEmitter && this.orbs.length < 12) {
      const beatInterval = 60 / this.bpm; // seconds per beat
      if (timeSec - this.lastEmitTime >= beatInterval * 4) { // every 4 beats
        this.lastEmitTime = timeSec;
        const colors = ['#00f3ff', '#ff2a85', '#bbf400', '#ffb703', '#a855f7'];
        const c = colors[Math.floor(Math.random() * colors.length)];
        const startX = this.width * 0.2 + Math.random() * this.width * 0.6;
        const angle = Math.PI * 0.25 + Math.random() * Math.PI * 0.5;
        const speed = 3.5;
        this.spawnOrb(startX, 60, Math.cos(angle) * speed, Math.sin(angle) * speed, c);
      }
    }

    // 2. Update Strings Oscillation
    for (const str of this.strings) {
      if (str.amplitude > 0.05) {
        str.phase += str.frequency * dt;
        str.amplitude *= Math.pow(str.decay, dt * 60);
      } else {
        str.amplitude = 0;
      }
    }

    // 3. Update Drum Pad Animations
    for (const pad of this.drumPads) {
      if (pad.hitState > 0.01) {
        pad.hitState -= dt * 4.5;
      } else {
        pad.hitState = 0;
      }
    }

    // 4. Update Shapes (Pulse phases)
    for (const shape of this.shapes) {
      shape.pulsePhase += dt * 2.5;
    }

    // 5. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += (sw.maxRadius - sw.radius) * (dt * 12);
      sw.alpha -= dt * 2.2;
      if (sw.alpha <= 0.02 || sw.radius >= sw.maxRadius - 1) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 6. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life += 1;
      p.alpha = 1 - p.life / p.maxLife;
      if (p.life >= p.maxLife || p.alpha <= 0.01) {
        this.particles.splice(i, 1);
      }
    }

    // 7. Update Orbs (Physics, Gravity Wells, Bumpers, String Crossings, Bounds)
    for (let oIdx = this.orbs.length - 1; oIdx >= 0; oIdx--) {
      const orb = this.orbs[oIdx];
      const prevY = orb.y;


      // Gravity Wells Acceleration
      for (const shape of this.shapes) {
        if (shape.type === 'gravity-well') {
          const dx = shape.x - orb.x;
          const dy = shape.y - orb.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq);

          // Force = G * mass / (r^2 + softening)
          const softening = 900;
          const force = (this.gravityConstant * (shape.mass / 1000)) / (distSq + softening);
          const ax = (dx / (dist + 0.001)) * force * dt;
          const ay = (dy / (dist + 0.001)) * force * dt;

          orb.vx += ax;
          orb.vy += ay;

          // Periapsis / Event Horizon Proximity Trigger
          // When orb sweeps past the gravity well within trigger perimeter
          const triggerDist = shape.radius * 2.2;
          const lastTrigger = orb.lastWellTriggerTimes[shape.id] || 0;

          if (dist < triggerDist && currentTime - lastTrigger > 320) {
            // Check if passing closest point (dot product of velocity and displacement changes sign)
            const dot = orb.vx * dx + orb.vy * dy;
            if (Math.abs(dot) < 40 || dist < shape.radius * 1.3) {
              orb.lastWellTriggerTimes[shape.id] = currentTime;
              const velNorm = Math.min(1.0, Math.hypot(orb.vx, orb.vy) / 6);
              this.audioEngine.playChime(shape.note, 'well', 0.65 + velNorm * 0.35, shape.color);
              this.createShockwave(shape.x, shape.y, shape.color, shape.radius * 2.0);
              this.createParticleBurst(orb.x, orb.y, shape.color, 8);
            }
          }
        } else if (shape.type === 'bumper' || shape.type === 'prism') {
          // Bumper / Prism Elastic Collision & Deflection
          const dx = orb.x - shape.x;
          const dy = orb.y - shape.y;
          const dist = Math.hypot(dx, dy);
          const minDist = orb.radius + shape.radius;

          if (dist < minDist) {
            // Normal vector
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);

            // Separate orb
            orb.x = shape.x + nx * minDist;
            orb.y = shape.y + ny * minDist;

            // Reflect velocity with bumper restitution
            const dot = orb.vx * nx + orb.vy * ny;
            if (dot < 0) {
              const elasticity = shape.elasticity || 1.2;
              orb.vx = orb.vx - (1 + elasticity) * dot * nx;
              orb.vy = orb.vy - (1 + elasticity) * dot * ny;

              // Speed stabilizer: ensure snappy rhythmic bounce
              const currentSpeed = Math.hypot(orb.vx, orb.vy);
              if (currentSpeed < 3.0) {
                orb.vx *= 1.4;
                orb.vy *= 1.4;
              } else if (currentSpeed > 10.0) {
                orb.vx *= 0.85;
                orb.vy *= 0.85;
              }

              // Trigger Chime
              this.audioEngine.playChime(shape.note, 'bumper', 0.85, shape.color);
              this.createShockwave(shape.x, shape.y, shape.color, shape.radius * 2.4);
              this.createParticleBurst(orb.x, orb.y, shape.color, 14);
            }
          }
        }
      }

      // Drum Pad Collisions
      for (const pad of this.drumPads) {
        const dx = orb.x - pad.x;
        const dy = orb.y - pad.y;
        const dist = Math.hypot(dx, dy);
        const minDist = orb.radius + pad.radius;

        if (dist < minDist) {
          const nx = dx / (dist || 1);
          const ny = dy / (dist || 1);
          orb.x = pad.x + nx * minDist;
          orb.y = pad.y + ny * minDist;

          const dot = orb.vx * nx + orb.vy * ny;
          if (dot < 0) {
            orb.vx = (orb.vx - 2.2 * dot * nx);
            orb.vy = (orb.vy - 2.2 * dot * ny);
            this.hitDrumPad(pad, 0.9);
          }
        }
      }

      // String Crossings: Check if orb traversed any guitar string
      for (const str of this.strings) {
        const crossedY = (prevY <= str.y && orb.y >= str.y) || (prevY >= str.y && orb.y <= str.y);
        const inBoundsX = orb.x >= str.xStart && orb.x <= str.xEnd;
        const lastCross = orb.lastStringCrossTimes[str.index] || 0;

        if (crossedY && inBoundsX && currentTime - lastCross > 200) {
          orb.lastStringCrossTimes[str.index] = currentTime;
          const pluckRelX = (orb.x - str.xStart) / (str.xEnd - str.xStart);
          const orbSpeed = Math.hypot(orb.vx, orb.vy);
          const vel = Math.min(1.0, 0.5 + orbSpeed * 0.1);
          this.pluckString(str.index, pluckRelX, vel);

          // String gives slight elastic tactile nudge to orb
          orb.vy *= -0.7;
        }
      }

      // Speed clamping & Damping
      orb.vx *= this.damping;
      orb.vy *= this.damping;
      const speed = Math.hypot(orb.vx, orb.vy);
      if (speed > 14) {
        orb.vx = (orb.vx / speed) * 14;
        orb.vy = (orb.vy / speed) * 14;
      }

      // Move Orb
      orb.x += orb.vx;
      orb.y += orb.vy;

      // Update Trail
      orb.trail.unshift({ x: orb.x, y: orb.y, alpha: 1.0 });
      if (orb.trail.length > 20) {
        orb.trail.pop();
      }
      for (let t = 0; t < orb.trail.length; t++) {
        orb.trail[t].alpha = 1 - t / orb.trail.length;
      }

      // Canvas Boundary Bounce
      const margin = orb.radius + 2;
      const bottomLimit = this.height - 130; // Above sheet music bar

      if (orb.x < margin) {
        orb.x = margin;
        orb.vx = Math.abs(orb.vx) * 0.95;
      } else if (orb.x > this.width - margin) {
        orb.x = this.width - margin;
        orb.vx = -Math.abs(orb.vx) * 0.95;
      }

      if (orb.y < margin + 15) {
        orb.y = margin + 15;
        orb.vy = Math.abs(orb.vy) * 0.95;
      } else if (orb.y > bottomLimit) {
        orb.y = bottomLimit;
        orb.vy = -Math.abs(orb.vy) * 0.95;
      }
    }
  }
}
