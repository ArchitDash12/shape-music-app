import React, { useEffect, useRef, useCallback } from 'react';
import { PhysicsEngine } from '../physics/engine';
import type { InteractiveShape } from '../physics/types';
import { quantizeToScale } from '../audio/scaleQuantizer';

interface InteractiveCanvasProps {
  physics: PhysicsEngine;
  currentTool: 'interact' | 'add-well' | 'add-bumper';
  onToolChange?: (tool: 'interact' | 'add-well' | 'add-bumper') => void;
}

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({
  physics,
  currentTool,
  onToolChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Interaction State
  const mousePosRef = useRef({ x: 0, y: 0, prevX: 0, prevY: 0, isDown: false });
  const draggedShapeRef = useRef<InteractiveShape | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const slingshotStartRef = useRef<{ x: number; y: number } | null>(null);


  // Resize handler
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    physics.resize(w, h);
  }, [physics]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Main 60 FPS Render & Simulation Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.033, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      const canvas = canvasRef.current;
      if (!canvas) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      // 1. Update Physics
      physics.update(dt, currentTime);

      // 2. Clear Screen
      ctx.clearRect(0, 0, w, h);

      // 3. Draw Guitar Fretboard & Nut Background Accent
      if (physics.strings.length > 0) {
        const topY = physics.strings[0].y - 20;
        const bottomY = physics.strings[physics.strings.length - 1].y + 20;
        const xStart = physics.strings[0].xStart;
        const xEnd = physics.strings[0].xEnd;

        // Fretboard Backdrop
        const fretGrad = ctx.createLinearGradient(0, topY, 0, bottomY);
        fretGrad.addColorStop(0, 'rgba(15, 6, 32, 0.4)');
        fretGrad.addColorStop(0.5, 'rgba(28, 10, 56, 0.6)');
        fretGrad.addColorStop(1, 'rgba(15, 6, 32, 0.4)');
        ctx.fillStyle = fretGrad;
        ctx.fillRect(xStart - 40, topY, (xEnd - xStart) + 80, bottomY - topY);

        // Fretboard border lines
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(xStart - 40, topY, (xEnd - xStart) + 80, bottomY - topY);

        // Fret wire markers (vertical frets)
        const numFrets = 12;
        const fretSpan = (xEnd - xStart) / numFrets;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        for (let f = 1; f < numFrets; f++) {
          const fx = xStart + f * fretSpan;
          ctx.beginPath();
          ctx.moveTo(fx, topY);
          ctx.lineTo(fx, bottomY);
          ctx.stroke();

          // Fret inlays (3, 5, 7, 9, 12)
          if ([3, 5, 7, 9].includes(f)) {
            ctx.fillStyle = 'rgba(0, 243, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(fx - fretSpan / 2, (topY + bottomY) / 2, 4, 0, Math.PI * 2);
            ctx.fill();
          } else if (f === 12) {
            // Double inlay at octave
            ctx.fillStyle = 'rgba(255, 42, 133, 0.4)';
            ctx.beginPath();
            ctx.arc(fx - fretSpan / 2, (topY + bottomY) / 2 - 14, 4, 0, Math.PI * 2);
            ctx.arc(fx - fretSpan / 2, (topY + bottomY) / 2 + 14, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 4. Draw Strings with Dynamic Waveform Ripple
      for (const str of physics.strings) {
        ctx.save();
        const L = str.xEnd - str.xStart;
        const numSegments = 60;
        const dx = L / numSegments;

        // String Oscillation Wave
        ctx.beginPath();
        ctx.moveTo(str.xStart, str.y);

        for (let s = 1; s <= numSegments; s++) {
          const sx = str.xStart + s * dx;
          const normX = s / numSegments;

          // Spatial envelope peaked at pluck point + fundamental standing wave
          const spatialWave = Math.sin(Math.PI * normX);
          const harmonic2 = 0.3 * Math.sin(2 * Math.PI * normX);
          const dy = str.amplitude * (spatialWave + harmonic2) * Math.sin(str.phase);

          ctx.lineTo(sx, str.y + dy);
        }

        ctx.strokeStyle = str.color;
        ctx.lineWidth = str.thickness + (str.amplitude > 0.5 ? 1.5 : 0);
        ctx.shadowColor = str.color;
        ctx.shadowBlur = str.amplitude > 1 ? 16 : 6;
        ctx.stroke();
        ctx.restore();

        // Left Note Badge
        ctx.save();
        ctx.fillStyle = 'rgba(10, 3, 24, 0.9)';
        ctx.fillRect(str.xStart - 75, str.y - 11, 30, 22);
        ctx.strokeStyle = str.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(str.xStart - 75, str.y - 11, 30, 22);

        ctx.fillStyle = str.color;
        ctx.font = 'bold 11px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(str.note.name, str.xStart - 60, str.y + 4);
        ctx.restore();
      }

      // 5. Draw Gravitational Lensing Vector Lines between Orbs & Wells
      for (const orb of physics.orbs) {
        for (const shape of physics.shapes) {
          if (shape.type === 'gravity-well') {
            const dx = shape.x - orb.x;
            const dy = shape.y - orb.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 260) {
              const alpha = Math.max(0, 1 - dist / 260) * 0.4;
              ctx.strokeStyle = shape.color;
              ctx.globalAlpha = alpha;
              ctx.lineWidth = 1.2;
              ctx.setLineDash([3, 5]);
              ctx.beginPath();
              ctx.moveTo(orb.x, orb.y);
              ctx.lineTo(shape.x, shape.y);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.globalAlpha = 1.0;
            }
          }
        }
      }

      // 6. Draw Shapes (Gravity Wells & Bumpers)
      for (const shape of physics.shapes) {
        ctx.save();
        ctx.translate(shape.x, shape.y);

        const pulseScale = 1 + Math.sin(shape.pulsePhase) * 0.08;

        if (shape.type === 'gravity-well') {
          // Event horizon outer aura
          const auraGrad = ctx.createRadialGradient(0, 0, shape.radius * 0.3, 0, 0, shape.radius * 2.2);
          auraGrad.addColorStop(0, 'rgba(255, 42, 133, 0.25)');
          auraGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.1)');
          auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(0, 0, shape.radius * 2.2, 0, Math.PI * 2);
          ctx.fill();

          // Concentric Orbit Perimeter Rings
          ctx.strokeStyle = shape.color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, shape.radius * 1.8 * pulseScale, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Central Well Body
          const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shape.radius);
          coreGrad.addColorStop(0, '#ffffff');
          coreGrad.addColorStop(0.3, shape.color);
          coreGrad.addColorStop(1, '#18002e');
          ctx.fillStyle = coreGrad;
          ctx.shadowColor = shape.color;
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(0, 0, shape.radius * pulseScale, 0, Math.PI * 2);
          ctx.fill();

          // Center Singularity Hole
          ctx.fillStyle = '#08020f';
          ctx.beginPath();
          ctx.arc(0, 0, shape.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();

          // Japanese Tag + Note Name
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px "Share Tech Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`WELL: ${shape.note.name}`, 0, shape.radius + 18);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = '9px sans-serif';
          ctx.fillText('引力井戸', 0, shape.radius + 30);
        } else {
          // Bumper / Prism Deflector
          ctx.shadowColor = shape.color;
          ctx.shadowBlur = 22;
          ctx.strokeStyle = shape.color;
          ctx.lineWidth = 3;

          // Outer Geometric Ring
          ctx.beginPath();
          if (shape.shapeForm === 'diamond') {
            ctx.moveTo(0, -shape.radius * 1.3 * pulseScale);
            ctx.lineTo(shape.radius * 1.3 * pulseScale, 0);
            ctx.lineTo(0, shape.radius * 1.3 * pulseScale);
            ctx.lineTo(-shape.radius * 1.3 * pulseScale, 0);
            ctx.closePath();
          } else if (shape.shapeForm === 'hexagon') {
            for (let a = 0; a < 6; a++) {
              const ang = (a * Math.PI) / 3;
              const px = Math.cos(ang) * shape.radius * 1.25 * pulseScale;
              const py = Math.sin(ang) * shape.radius * 1.25 * pulseScale;
              if (a === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
          } else {
            ctx.arc(0, 0, shape.radius * 1.2 * pulseScale, 0, Math.PI * 2);
          }
          ctx.stroke();

          // Chrome Glass Core
          const bumpGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shape.radius);
          bumpGrad.addColorStop(0, '#ffffff');
          bumpGrad.addColorStop(0.5, shape.color);
          bumpGrad.addColorStop(1, '#0e041d');
          ctx.fillStyle = bumpGrad;
          ctx.fill();

          // Label
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px "Share Tech Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`BUMP: ${shape.note.name}`, 0, shape.radius + 18);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.font = '9px sans-serif';
          ctx.fillText('反発体', 0, shape.radius + 30);
        }

        ctx.restore();
      }

      // 7. Draw Drum Pads
      for (const pad of physics.drumPads) {
        ctx.save();
        ctx.translate(pad.x, pad.y);

        const bounce = 1 - pad.hitState * 0.12;

        // Outer glow on hit
        if (pad.hitState > 0.05) {
          ctx.shadowColor = pad.color;
          ctx.shadowBlur = 30 * pad.hitState;
        }

        // Circular Pad Body
        const padGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, pad.radius * bounce);
        padGrad.addColorStop(0, pad.hitState > 0.1 ? '#ffffff' : 'rgba(25, 10, 50, 0.9)');
        padGrad.addColorStop(0.7, 'rgba(15, 5, 30, 0.95)');
        padGrad.addColorStop(1, pad.color);

        ctx.fillStyle = padGrad;
        ctx.beginPath();
        ctx.arc(0, 0, pad.radius * bounce, 0, Math.PI * 2);
        ctx.fill();

        // Neon border ring
        ctx.strokeStyle = pad.color;
        ctx.lineWidth = 2.5 + pad.hitState * 2;
        ctx.stroke();

        // Drum Icon / Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(pad.name, 0, 3);

        // Key Shortcut Pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-10, pad.radius + 4, 20, 14);
        ctx.strokeStyle = pad.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(-10, pad.radius + 4, 20, 14);

        ctx.fillStyle = pad.color;
        ctx.font = 'bold 9px "Share Tech Mono", monospace';
        ctx.fillText(pad.shortcutKey, 0, pad.radius + 15);

        ctx.restore();
      }

      // 8. Draw Orbs & Neon Trails
      for (const orb of physics.orbs) {
        // Render Trail
        if (orb.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(orb.trail[0].x, orb.trail[0].y);
          for (let t = 1; t < orb.trail.length; t++) {
            ctx.lineTo(orb.trail[t].x, orb.trail[t].y);
          }
          ctx.strokeStyle = orb.color;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.shadowColor = orb.color;
          ctx.shadowBlur = 12;
          ctx.globalAlpha = 0.6;
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }

        // Render Orb Body
        ctx.save();
        ctx.shadowColor = orb.color;
        ctx.shadowBlur = 18;

        const orbGrad = ctx.createRadialGradient(
          orb.x - orb.radius * 0.3,
          orb.y - orb.radius * 0.3,
          1,
          orb.x,
          orb.y,
          orb.radius
        );
        orbGrad.addColorStop(0, '#ffffff');
        orbGrad.addColorStop(0.4, orb.color);
        orbGrad.addColorStop(1, '#000000');

        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // 9. Draw Shockwaves
      for (const sw of physics.shockwaves) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = sw.lineWidth;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 10. Draw Particles
      for (const p of physics.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 11. Draw Slingshot Launcher Vector if aiming
      if (slingshotStartRef.current && mousePosRef.current.isDown) {
        const start = slingshotStartRef.current;
        const cur = mousePosRef.current;
        const dx = start.x - cur.x;
        const dy = start.y - cur.y;
        const dragDist = Math.hypot(dx, dy);

        ctx.save();
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(start.x + dx * 1.5, start.y + dy * 1.5);
        ctx.stroke();
        ctx.setLineDash([]);

        // Power Circle
        ctx.strokeStyle = '#ff2a85';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(start.x, start.y, Math.min(60, dragDist * 0.4), 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Share Tech Mono", monospace';
        ctx.fillText(`POWER: ${Math.round(dragDist)}`, start.x + 14, start.y - 14);
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [physics]);

  // Mouse / Touch Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    mousePosRef.current = { x, y, prevX: x, prevY: y, isDown: true };

    // 1. Tool check: Place new Well or Bumper
    if (currentTool === 'add-well') {
      physics.shapes.push({
        id: `well-${Date.now()}`,
        type: 'gravity-well',
        x,
        y,
        radius: 36,
        mass: 4800,
        elasticity: 0.8,
        color: '#ff2a85',
        note: quantizeToScale(Math.random(), physics.activeScale),
        glowIntensity: 1.0,
        pulsePhase: 0,
        shapeForm: 'circle'
      });
      physics.createShockwave(x, y, '#ff2a85', 60);
      if (onToolChange) onToolChange('interact');
      return;
    }

    if (currentTool === 'add-bumper') {
      physics.shapes.push({
        id: `bumper-${Date.now()}`,
        type: 'bumper',
        x,
        y,
        radius: 32,
        mass: 0,
        elasticity: 1.3,
        color: '#bbf400',
        note: quantizeToScale(Math.random(), physics.activeScale),
        glowIntensity: 1.0,
        pulsePhase: 0,
        shapeForm: 'hexagon'
      });
      physics.createShockwave(x, y, '#bbf400', 60);
      if (onToolChange) onToolChange('interact');
      return;
    }

    // 2. Check Drum Pad hit
    for (const pad of physics.drumPads) {
      if (Math.hypot(x - pad.x, y - pad.y) <= pad.radius) {
        physics.hitDrumPad(pad, 1.0);
        return;
      }
    }

    // 3. Check Shape Drag
    for (const shape of physics.shapes) {
      if (Math.hypot(x - shape.x, y - shape.y) <= shape.radius * 1.4) {
        draggedShapeRef.current = shape;
        dragOffsetRef.current = { x: shape.x - x, y: shape.y - y };
        return;
      }
    }

    // 4. Check Guitar String direct pluck
    for (const str of physics.strings) {
      if (Math.abs(y - str.y) < 16 && x >= str.xStart && x <= str.xEnd) {
        const pluckX = (x - str.xStart) / (str.xEnd - str.xStart);
        physics.pluckString(str.index, pluckX, 0.9);
        return;
      }
    }

    // 5. If empty space, start Slingshot to launch orb
    slingshotStartRef.current = { x, y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const prevX = mousePosRef.current.x;
    const prevY = mousePosRef.current.y;
    mousePosRef.current = { x, y, prevX, prevY, isDown: mousePosRef.current.isDown };

    // If dragging a shape, move it
    if (draggedShapeRef.current) {
      draggedShapeRef.current.x = x + dragOffsetRef.current.x;
      draggedShapeRef.current.y = y + dragOffsetRef.current.y;
      return;
    }

    // Swipe plucking guitar strings while moving cursor!
    for (const str of physics.strings) {
      const crossed = (prevY <= str.y && y >= str.y) || (prevY >= str.y && y <= str.y);
      const inBounds = x >= str.xStart && x <= str.xEnd;
      if (crossed && inBounds) {
        const speed = Math.hypot(x - prevX, y - prevY);
        const velocity = Math.min(1.0, 0.4 + speed * 0.04);
        const pluckX = (x - str.xStart) / (str.xEnd - str.xStart);
        physics.pluckString(str.index, pluckX, velocity);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    mousePosRef.current.isDown = false;

    // Release shape drag
    if (draggedShapeRef.current) {
      draggedShapeRef.current = null;
    }

    // Release slingshot: launch orb!
    if (slingshotStartRef.current) {
      const start = slingshotStartRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dx = start.x - x;
        const dy = start.y - y;
        const dist = Math.hypot(dx, dy);

        if (dist > 15) {
          const power = Math.min(11, dist * 0.08);
          const angle = Math.atan2(dy, dx);
          const vx = Math.cos(angle) * power;
          const vy = Math.sin(angle) * power;

          const colors = ['#00f3ff', '#ff2a85', '#bbf400', '#ffb703', '#a855f7'];
          const c = colors[Math.floor(Math.random() * colors.length)];
          physics.spawnOrb(start.x, start.y, vx, vy, c);
          physics.createShockwave(start.x, start.y, c, 50);
        }
      }
      slingshotStartRef.current = null;
    }
  };

  // Keyboard shortcut triggers for drums (1-6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const pad = physics.drumPads.find(p => p.shortcutKey === e.key);
      if (pad) {
        physics.hitDrumPad(pad, 1.0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [physics]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full overflow-hidden cursor-crosshair select-none"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full block touch-none"
      />
    </div>
  );
};
