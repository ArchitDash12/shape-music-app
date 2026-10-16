import React, { useEffect, useRef, useState } from 'react';
import { AudioEngine } from '../audio/audioEngine';
import type { NoteEvent } from '../audio/audioEngine';
import { Play, Pause, Trash2, Download, Music2 } from 'lucide-react';

interface StoredNote {
  id: string;
  type: NoteEvent['type'];
  label: string;
  pitch?: string;
  octave?: number;
  midi?: number;
  staffPosition?: number;
  clef?: 'treble' | 'bass' | 'percussion';
  isAccidental?: boolean;
  drumType?: string;
  color: string;
  spawnTime: number; // millisecond timestamp
  x: number;         // visual X position on scrolling ribbon
}

export const SheetMusicStaff: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const notesRef = useRef<StoredNote[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [noteCount, setNoteCount] = useState(0);
  const scrollSpeed = 80; // pixels per second


  useEffect(() => {
    const audioEngine = AudioEngine.getInstance();

    const unsubscribe = audioEngine.subscribeNote((event: NoteEvent) => {
      if (isPaused) return;

      const canvas = canvasRef.current;
      const initialX = canvas ? canvas.width - 60 : 800;

      const newNote: StoredNote = {
        id: event.id,
        type: event.type,
        label: event.label,
        pitch: event.note?.pitch,
        octave: event.note?.octave,
        midi: event.note?.midi,
        staffPosition: event.note?.staffPosition ?? (event.type === 'drum' ? -2 : 2),
        clef: event.note?.clef ?? (event.type === 'drum' ? 'percussion' : 'treble'),
        isAccidental: event.note?.isAccidental ?? false,
        drumType: event.drumType,
        color: event.color || '#00f3ff',
        spawnTime: performance.now(),
        x: initialX
      };

      notesRef.current.push(newNote);
      setNoteCount(c => c + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [isPaused]);

  // Animation Loop for Smooth 60 FPS Notation Rendering
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(render);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark vaporwave translucency
      ctx.clearRect(0, 0, width, height);

      // Staff Geometry:
      // Line spacing: 9px
      // Treble staff: 5 lines centered around y = 46
      // Bass staff: 5 lines centered around y = 104
      const lineStep = 9;
      const trebleBaseY = 58; // Bottom line of treble staff (E4)
      const bassBaseY = 118;   // Bottom line of bass staff (G2)

      // 1. Draw Neon Staff Guidelines (Treble & Bass)
      ctx.lineWidth = 1;

      // Treble Staff (5 lines)
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.35)';
      for (let i = 0; i < 5; i++) {
        const y = trebleBaseY - i * lineStep;
        ctx.beginPath();
        ctx.moveTo(70, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Bass Staff (5 lines)
      ctx.strokeStyle = 'rgba(255, 42, 133, 0.35)';
      for (let i = 0; i < 5; i++) {
        const y = bassBaseY - i * lineStep;
        ctx.beginPath();
        ctx.moveTo(70, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Measure / Bar Lines scrolling with tempo
      const beatWidth = 140; // width per measure
      const measureOffset = (time * (scrollSpeed / 1000)) % beatWidth;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      for (let mx = width - measureOffset; mx > 70; mx -= beatWidth) {
        ctx.beginPath();
        ctx.moveTo(mx, trebleBaseY - 4 * lineStep - 4);
        ctx.lineTo(mx, bassBaseY + 4);
        ctx.stroke();
      }

      // 3. Clef Markers & Time Signature on the Left Sidebar
      // Treble Clef Graphic / Label
      ctx.fillStyle = '#00f3ff';
      ctx.font = '28px serif';
      ctx.fillText('𝄞', 20, trebleBaseY - 10);

      // Bass Clef Graphic / Label
      ctx.fillStyle = '#ff2a85';
      ctx.font = '24px serif';
      ctx.fillText('𝄢', 22, bassBaseY - 14);

      // Cyber Time Signature "4 / 4"
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 12px "Orbitron", monospace';
      ctx.fillText('4', 50, trebleBaseY - 2 * lineStep - 2);
      ctx.fillText('4', 50, trebleBaseY - 2);
      ctx.fillText('4', 50, bassBaseY - 2 * lineStep - 2);
      ctx.fillText('4', 50, bassBaseY - 2);

      // Left Fade Gradient Mask to smoothly clip scrolling notes
      const fadeGrad = ctx.createLinearGradient(70, 0, 110, 0);
      fadeGrad.addColorStop(0, 'rgba(8, 2, 15, 1)');
      fadeGrad.addColorStop(1, 'rgba(8, 2, 15, 0)');
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(70, 0, 40, height);

      // Vertical Red/Cyan Live Playhead Line
      const playheadX = width - 60;
      ctx.strokeStyle = '#ff2a85';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(playheadX, 10);
      ctx.lineTo(playheadX, height - 10);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ff2a85';
      ctx.font = '9px "Share Tech Mono", monospace';
      ctx.fillText('PLAYHEAD', playheadX - 22, height - 2);

      // 4. Update and Render Moving Notes
      const notes = notesRef.current;
      for (let i = notes.length - 1; i >= 0; i--) {
        const note = notes[i];

        if (!isPaused) {
          note.x -= scrollSpeed * dt;
        }

        // Remove notes that scrolled offscreen
        if (note.x < 75) {
          notes.splice(i, 1);
          continue;
        }

        // Calculate Y position based on staffPosition and clef
        let noteY = trebleBaseY;
        const step = lineStep / 2; // Each diatonic step is half a line space

        if (note.type === 'drum') {
          // Drum line positioning
          if (note.drumType === 'kick') noteY = bassBaseY + 6;
          else if (note.drumType === 'snare') noteY = trebleBaseY + 4;
          else if (note.drumType === 'hihat' || note.drumType === 'hihatOpen') noteY = trebleBaseY - 4 * lineStep - 8;
          else if (note.drumType === 'tom') noteY = bassBaseY - 2 * lineStep;
          else noteY = trebleBaseY - 2 * lineStep;
        } else {
          const staffPos = note.staffPosition ?? 0;
          if (staffPos >= 1) {
            // Treble Staff: E4 (staffPos 2) is trebleBaseY
            noteY = trebleBaseY - (staffPos - 2) * step;
          } else {
            // Middle C (staffPos 0) or Bass Staff: D3 (staffPos -5), E2 (staffPos -12)
            // Middle C is 1 ledger line below treble (trebleBaseY + 2 * step = trebleBaseY + lineStep)
            // Or relative to bass staff top line A3 (bassBaseY - 4 * lineStep)
            noteY = bassBaseY - (staffPos - (-5)) * step;
          }
        }

        // Draw Ledger Line for Middle C or out-of-staff notes
        const staffPos = note.staffPosition ?? 0;
        if (note.type !== 'drum') {
          if (staffPos === 0) {
            // Middle C ledger line
            const ledgerY = trebleBaseY + lineStep;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(note.x - 10, ledgerY);
            ctx.lineTo(note.x + 10, ledgerY);
            ctx.stroke();
          } else if (staffPos > 10) {
            // High ledger lines
            for (let lp = 12; lp <= staffPos; lp += 2) {
              const ly = trebleBaseY - (lp - 2) * step;
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(note.x - 9, ly);
              ctx.lineTo(note.x + 9, ly);
              ctx.stroke();
            }
          }
        }

        // Draw Accidental '#' if applicable
        if (note.isAccidental) {
          ctx.fillStyle = note.color;
          ctx.font = 'bold 12px "Share Tech Mono", monospace';
          ctx.fillText('♯', note.x - 12, noteY + 4);
        }

        // Draw Notehead
        ctx.save();
        ctx.translate(note.x, noteY);

        if (note.drumType === 'hihat' || note.drumType === 'hihatOpen') {
          // Hi-Hat '✕' Notehead
          ctx.strokeStyle = note.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-5, -5);
          ctx.lineTo(5, 5);
          ctx.moveTo(5, -5);
          ctx.lineTo(-5, 5);
          ctx.stroke();
        } else {
          // Angled Elliptical Notehead
          ctx.rotate(-0.25);
          ctx.fillStyle = note.color;
          ctx.shadowColor = note.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.ellipse(0, 0, 6, 4.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Draw Stem
        ctx.strokeStyle = note.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(note.x + 5, noteY);
        ctx.lineTo(note.x + 5, noteY - 24);
        ctx.stroke();

        // Note Label Pill on hover/top
        ctx.fillStyle = 'rgba(10, 4, 25, 0.85)';
        ctx.fillRect(note.x - 12, noteY - 36, 26, 12);
        ctx.strokeStyle = note.color;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(note.x - 12, noteY - 36, 26, 12);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(note.label, note.x + 1, noteY - 27);
        ctx.textAlign = 'start';
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, scrollSpeed]);


  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (container && canvas) {
        canvas.width = container.clientWidth;
        canvas.height = 160;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleClear = () => {
    notesRef.current = [];
    setNoteCount(0);
  };

  const handleExportScore = () => {
    const notesData = notesRef.current.map(n => ({
      pitch: n.pitch,
      octave: n.octave,
      label: n.label,
      type: n.type,
      timeOffsetMs: n.spawnTime
    }));
    const blob = new Blob([JSON.stringify(notesData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaporwave-score-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[160px] glass-panel border-t border-cyan-500/30 flex flex-col justify-between overflow-hidden shadow-[0_-8px_25px_rgba(0,243,255,0.15)]"
    >
      {/* Top Header Strip with Controls */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#0e041d]/80 border-b border-white/5 z-20">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-cyan-400 font-mono text-xs tracking-wider">
            <Music2 size={14} className="animate-pulse" />
            <span className="font-bold tracking-widest text-[#00f3ff]">LIVE SHEET MUSIC</span>
            <span className="text-gray-400 text-[10px]">// 楽譜リアルタイム</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
            {noteCount} NOTES RECORDED
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Pause / Play */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1.5 rounded text-xs flex items-center space-x-1 font-mono transition-all ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
            }`}
            title={isPaused ? 'Resume Scrolling' : 'Pause Scrolling'}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            <span className="hidden sm:inline">{isPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            className="p-1.5 rounded text-xs flex items-center space-x-1 font-mono bg-pink-500/20 text-pink-300 border border-pink-500/40 hover:bg-pink-500/30 transition-all"
            title="Clear Sheet"
          >
            <Trash2 size={12} />
            <span className="hidden sm:inline">CLEAR</span>
          </button>

          {/* Export JSON Score */}
          <button
            onClick={handleExportScore}
            className="p-1.5 rounded text-xs flex items-center space-x-1 font-mono bg-acid-lime/20 text-[#bbf400] border border-[#bbf400]/40 hover:bg-[#bbf400]/30 transition-all"
            title="Export Sheet Notes JSON"
          >
            <Download size={12} />
            <span className="hidden sm:inline">EXPORT SCORE</span>
          </button>
        </div>
      </div>

      {/* Main Notation Canvas */}
      <canvas ref={canvasRef} className="w-full h-[126px] block cursor-crosshair" />
    </div>
  );
};
