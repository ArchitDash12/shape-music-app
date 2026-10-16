export interface MusicalNote {
  name: string;        // e.g. "C4", "G#4", "E2"
  pitch: string;       // e.g. "C", "G#", "E"
  octave: number;      // e.g. 4
  frequency: number;   // in Hz
  midi: number;        // MIDI note number (e.g. 60 for C4)
  isAccidental: boolean; // sharp or flat
  staffPosition: number; // 0 = Middle C (C4), +1 = D4, +2 = E4, etc. (step distance in standard diatonic staff)
  clef: 'treble' | 'bass' | 'percussion';
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const DIATONIC_STEPS: Record<string, number> = {
  'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6
};

// Calculate staff position where C4 (Middle C) = 0
// D4 = 1, E4 = 2 (bottom line of treble), F4 = 3, G4 = 4, A4 = 5, B4 = 6, C5 = 7, etc.
// B3 = -1, A3 = -2, G3 = -3, F3 = -4 (fourth line of bass), C3 = -7, etc.
export function calculateStaffPosition(pitch: string, octave: number): number {
  const baseLetter = pitch.charAt(0);
  const step = DIATONIC_STEPS[baseLetter] ?? 0;
  return (octave - 4) * 7 + step;
}

export function createNoteFromMidi(midi: number): MusicalNote {
  const noteIndex = ((midi % 12) + 12) % 12;
  const nameWithoutOctave = NOTE_NAMES[noteIndex];
  const octave = Math.floor(midi / 12) - 1;
  const name = `${nameWithoutOctave}${octave}`;
  const frequency = 440 * Math.pow(2, (midi - 69) / 12);
  const isAccidental = nameWithoutOctave.includes('#');
  const staffPos = calculateStaffPosition(nameWithoutOctave, octave);
  const clef = staffPos < 0 ? 'bass' : 'treble';

  return {
    name,
    pitch: nameWithoutOctave,
    octave,
    frequency,
    midi,
    isAccidental,
    staffPosition: staffPos,
    clef
  };
}

export interface ScaleDefinition {
  id: string;
  name: string;
  description: string;
  intervals: number[]; // semitones relative to root
  rootMidi: number;
}

export const SCALES: ScaleDefinition[] = [
  {
    id: 'vaporwave-pentatonic',
    name: 'Vapor Neon (Pentatonic Maj)',
    description: 'Dreamy, nostalgic retro 80s mall aesthetics',
    intervals: [0, 2, 4, 7, 9], // C, D, E, G, A
    rootMidi: 60 // C4
  },
  {
    id: 'japanese-hirajoshi',
    name: 'Hirajoshi (平調子)',
    description: 'Mystical Japanese pentatonic with haunting intervals',
    intervals: [0, 2, 3, 7, 8], // C, D, Eb, G, Ab
    rootMidi: 60 // C4
  },
  {
    id: 'lofi-dorian',
    name: 'Cyberpunk Dorian',
    description: 'Futuristic moody groove with a bright 6th',
    intervals: [0, 2, 3, 5, 7, 9, 10], // D, E, F, G, A, B, C
    rootMidi: 62 // D4
  },
  {
    id: 'acid-lydian',
    name: 'Acid Wave Lydian',
    description: 'Sci-fi bright raised 4th, glowing retro-futurism',
    intervals: [0, 2, 4, 6, 7, 9, 11], // F, G, A, B, C, D, E
    rootMidi: 65 // F4
  },
  {
    id: 'synthwave-minor',
    name: 'Outrun Harmonic Minor',
    description: 'High tension neon highway night drive',
    intervals: [0, 2, 3, 5, 7, 8, 11], // A, B, C, D, E, F, G#
    rootMidi: 57 // A3
  }
];

// Standard 6 Guitar Strings
export interface GuitarStringDef {
  index: number;
  name: string;
  midi: number;
  note: MusicalNote;
  color: string;
  thickness: number;
}

export const DEFAULT_GUITAR_STRINGS: GuitarStringDef[] = [
  { index: 0, name: 'E4 (High E)', midi: 64, note: createNoteFromMidi(64), color: '#00f3ff', thickness: 1.5 },
  { index: 1, name: 'B3', midi: 59, note: createNoteFromMidi(59), color: '#38bdf8', thickness: 2.0 },
  { index: 2, name: 'G3', midi: 55, note: createNoteFromMidi(55), color: '#a855f7', thickness: 2.6 },
  { index: 3, name: 'D3', midi: 50, note: createNoteFromMidi(50), color: '#ec4899', thickness: 3.2 },
  { index: 4, name: 'A2', midi: 45, note: createNoteFromMidi(45), color: '#ff2a85', thickness: 3.8 },
  { index: 5, name: 'E2 (Low E)', midi: 40, note: createNoteFromMidi(40), color: '#bbf400', thickness: 4.5 },
];

export function quantizeToScale(normalizedValue: number, scale: ScaleDefinition, octaveSpan = 2): MusicalNote {
  const intervals = scale.intervals;
  const totalNotes = intervals.length * octaveSpan;
  const clamped = Math.max(0, Math.min(0.999, normalizedValue));
  const noteIndex = Math.floor(clamped * totalNotes);
  const octaveOffset = Math.floor(noteIndex / intervals.length);
  const semitoneOffset = intervals[noteIndex % intervals.length];
  const midi = scale.rootMidi + (octaveOffset * 12) + semitoneOffset;
  return createNoteFromMidi(midi);
}
