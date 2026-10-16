import type { DrumType } from '../audio/drumSynth';
import type { MusicalNote } from '../audio/scaleQuantizer';


export interface Vector2D {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
}

export interface Shockwave {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  maxRadius: number;
  lineWidth: number;
  alpha: number;
}

export interface Orb {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  trail: { x: number; y: number; alpha: number }[];
  lastWellTriggerTimes: Record<string, number>; // prevent machine-gunning same well every frame
  lastStringCrossTimes: Record<number, number>; // prevent re-triggering same string within milliseconds
  speed: number;
}

export type ShapeType = 'gravity-well' | 'bumper' | 'prism';

export interface InteractiveShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  radius: number;
  mass: number;           // For gravity wells
  elasticity: number;     // For bumpers
  color: string;
  note: MusicalNote;
  glowIntensity: number;
  pulsePhase: number;
  isDragging?: boolean;
  shapeForm?: 'circle' | 'triangle' | 'diamond' | 'hexagon';
}

export interface PhysicalString {
  index: number;
  y: number;              // Baseline Y position
  xStart: number;
  xEnd: number;
  note: MusicalNote;
  color: string;
  thickness: number;
  amplitude: number;      // Current vibration amplitude
  frequency: number;      // Oscillation speed
  pluckX: number;         // Relative pluck point (0..1)
  decay: number;          // Damping factor
  phase: number;          // Wave phase
}

export interface InteractiveDrumPad {
  id: string;
  type: DrumType;
  name: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  hitState: number; // 0..1 for visual bounce animation
  shortcutKey: string;
}
