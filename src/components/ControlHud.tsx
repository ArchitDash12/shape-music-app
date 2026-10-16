import React from 'react';
import { SCALES } from '../audio/scaleQuantizer';
import type { ScaleDefinition } from '../audio/scaleQuantizer';
import { PhysicsEngine } from '../physics/engine';

import {
  Sparkles,
  Magnet,
  Zap,
  Volume2,
  VolumeX,
  RefreshCw,
  PlusCircle,
  Tv,
  HelpCircle,
  Activity,
  Compass
} from 'lucide-react';

interface ControlHudProps {
  physics: PhysicsEngine;
  activeScale: ScaleDefinition;
  onScaleChange: (scale: ScaleDefinition) => void;
  currentTool: 'interact' | 'add-well' | 'add-bumper';
  onToolChange: (tool: 'interact' | 'add-well' | 'add-bumper') => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  gravityStrength: number;
  onGravityChange: (g: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ControlHud: React.FC<ControlHudProps> = ({
  physics,
  activeScale,
  onScaleChange,
  currentTool,
  onToolChange,
  crtEnabled,
  onToggleCrt,
  bpm,
  onBpmChange,
  gravityStrength,
  onGravityChange,
  isMuted,
  onToggleMute
}) => {
  const [showHelp, setShowHelp] = React.useState(false);

  const handleSpawnBurst = () => {
    const colors = ['#00f3ff', '#ff2a85', '#bbf400', '#ffb703', '#a855f7'];
    const cx = physics.width * 0.5;
    const cy = physics.height * 0.35;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 3.5 + Math.random() * 2;
      const c = colors[i % colors.length];
      physics.spawnOrb(
        cx + Math.cos(angle) * 30,
        cy + Math.sin(angle) * 30,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        c
      );
    }
  };

  const handleClearOrbs = () => {
    physics.orbs = [];
  };

  const handleResetLayout = () => {
    physics.initializeDefaults();
  };

  return (
    <header className="relative z-30 w-full flex flex-col gap-2 p-3 bg-[#0c031a]/85 backdrop-blur-md border-b border-cyan-500/25 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
      {/* Top Main Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 via-purple-600 to-cyan-400 p-[1.5px] shadow-[0_0_12px_rgba(255,42,133,0.5)]">
              <div className="w-full h-full bg-[#0d021c] rounded-lg flex items-center justify-center">
                <span className="text-sm">🎸</span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold tracking-widest text-sm sm:text-base font-orbitron bg-gradient-to-r from-[#00f3ff] via-[#ff2a85] to-[#bbf400] bg-clip-text text-transparent">
                  VAPOR STRINGS
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40 font-mono">
                  ACID WAVE
                </span>
              </div>
              <p className="text-[9px] font-mono text-cyan-400/80 tracking-wider">
                酸性波 // 物理的リズム音響
              </p>
            </div>
          </div>
        </div>

        {/* Center Controls: Scale, BPM, Gravity */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Musical Scale Selector */}
          <div className="flex items-center space-x-1.5 glass-panel px-2.5 py-1 rounded-lg">
            <Compass size={13} className="text-[#00f3ff]" />
            <span className="text-[10px] font-mono text-gray-400 uppercase hidden md:inline">Scale:</span>
            <select
              value={activeScale.id}
              onChange={e => {
                const found = SCALES.find(s => s.id === e.target.value);
                if (found) {
                  onScaleChange(found);
                  physics.setScale(found);
                }
              }}
              className="bg-transparent text-xs font-mono text-[#00f3ff] outline-none cursor-pointer pr-1"
            >
              {SCALES.map(s => (
                <option key={s.id} value={s.id} className="bg-[#120826] text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* BPM Control */}
          <div className="flex items-center space-x-1.5 glass-panel px-2.5 py-1 rounded-lg">
            <Activity size={13} className="text-[#bbf400] animate-pulse" />
            <span className="text-[10px] font-mono text-gray-400">BPM:</span>
            <input
              type="range"
              min="70"
              max="160"
              value={bpm}
              onChange={e => {
                const val = Number(e.target.value);
                onBpmChange(val);
                physics.bpm = val;
              }}
              className="w-16 h-1 accent-[#bbf400] cursor-pointer"
            />
            <span className="text-xs font-mono text-[#bbf400] w-7 text-right">{bpm}</span>
          </div>

          {/* Gravity Constant */}
          <div className="flex items-center space-x-1.5 glass-panel px-2.5 py-1 rounded-lg">
            <Magnet size={13} className="text-[#ff2a85]" />
            <span className="text-[10px] font-mono text-gray-400">GRAVITY:</span>
            <input
              type="range"
              min="800"
              max="5000"
              step="200"
              value={gravityStrength}
              onChange={e => {
                const val = Number(e.target.value);
                onGravityChange(val);
                physics.gravityConstant = val;
              }}
              className="w-16 h-1 accent-[#ff2a85] cursor-pointer"
            />
            <span className="text-xs font-mono text-[#ff2a85] w-8 text-right">
              {Math.round(gravityStrength / 100)}
            </span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* CRT Scanlines Toggle */}
          <button
            onClick={onToggleCrt}
            className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1 font-mono transition-all ${
              crtEnabled
                ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                : 'glass-panel text-gray-400 hover:text-white'
            }`}
            title="Toggle CRT Scanline Overlay"
          >
            <Tv size={13} />
            <span className="hidden xl:inline text-[10px]">CRT</span>
          </button>

          {/* Mute Toggle */}
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-lg border text-xs flex items-center space-x-1 font-mono transition-all ${
              isMuted
                ? 'bg-red-500/20 text-red-300 border-red-500/50'
                : 'glass-panel text-cyan-300 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>

          {/* Help Toggle */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1.5 rounded-lg glass-panel text-gray-300 hover:text-white border transition-all"
            title="Interaction Help"
          >
            <HelpCircle size={13} />
          </button>
        </div>
      </div>

      {/* Secondary Tool / Interaction Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
        {/* Tool Mode Buttons */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span className="text-[10px] font-mono text-gray-400 uppercase mr-1">TOOL:</span>

          <button
            onClick={() => onToolChange('interact')}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center space-x-1.5 transition-all ${
              currentTool === 'interact'
                ? 'bg-cyan-500/30 text-[#00f3ff] border border-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.4)]'
                : 'glass-panel text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles size={12} />
            <span>INTERACT & SLINGSHOT</span>
          </button>

          <button
            onClick={() => onToolChange('add-well')}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center space-x-1.5 transition-all ${
              currentTool === 'add-well'
                ? 'bg-pink-500/30 text-[#ff2a85] border border-pink-400 shadow-[0_0_10px_rgba(255,42,133,0.4)]'
                : 'glass-panel text-gray-400 hover:text-gray-200'
            }`}
          >
            <Magnet size={12} />
            <span>+ GRAVITY WELL</span>
          </button>

          <button
            onClick={() => onToolChange('add-bumper')}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center space-x-1.5 transition-all ${
              currentTool === 'add-bumper'
                ? 'bg-[#bbf400]/30 text-[#bbf400] border border-[#bbf400] shadow-[0_0_10px_rgba(187,244,0,0.4)]'
                : 'glass-panel text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap size={12} />
            <span>+ BUMPER</span>
          </button>
        </div>

        {/* Quick Action Spawners */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleSpawnBurst}
            className="px-2 py-0.8 rounded text-[11px] font-mono bg-purple-600/25 text-purple-200 border border-purple-500/40 hover:bg-purple-600/40 transition-all flex items-center space-x-1"
          >
            <PlusCircle size={11} />
            <span>SPAWN 5 ORBS</span>
          </button>

          <button
            onClick={handleClearOrbs}
            className="px-2 py-0.8 rounded text-[11px] font-mono bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600/30 transition-all"
          >
            CLEAR ORBS ({physics.orbs.length})
          </button>

          <button
            onClick={handleResetLayout}
            className="p-1 rounded glass-panel text-gray-400 hover:text-cyan-300 transition-all"
            title="Reset Stage Layout"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Expandable Help Modal / Banner */}
      {showHelp && (
        <div className="mt-2 p-3 rounded-lg bg-[#140628]/95 border border-cyan-500/40 text-xs font-mono text-gray-300 grid grid-cols-1 md:grid-cols-4 gap-3 animate-fade-in shadow-2xl">
          <div className="border-l-2 border-[#00f3ff] pl-2">
            <p className="font-bold text-[#00f3ff]">🎸 GUITAR STRINGS</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Hover/drag your cursor across the 6 strings to strum. Orbs also pluck strings whenever they cross!
            </p>
          </div>
          <div className="border-l-2 border-[#ff2a85] pl-2">
            <p className="font-bold text-[#ff2a85]">🧲 GRAVITY WELLS</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Drag wells around to attract moving orbs. When an orb sweeps past or enters the event horizon, a resonant chime note is plucked!
            </p>
          </div>
          <div className="border-l-2 border-[#bbf400] pl-2">
            <p className="font-bold text-[#bbf400]">⚡ DEFLECTION BUMPERS</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Bumpers deflect orbs elastically, generating rhythmic patterns and percussive melodic plucks with shockwaves.
            </p>
          </div>
          <div className="border-l-2 border-[#ffb703] pl-2">
            <p className="font-bold text-[#ffb703]">🥁 DRUMS & SLINGSHOT</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Click drum pads or press keys 1-6. Click & drag anywhere on the empty space to pull back a slingshot vector and launch new orbs!
            </p>
          </div>
        </div>
      )}
    </header>
  );
};
