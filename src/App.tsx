import React, { useState, useMemo } from 'react';
import { PhysicsEngine } from './physics/engine';
import { SCALES } from './audio/scaleQuantizer';
import type { ScaleDefinition } from './audio/scaleQuantizer';
import { AudioEngine } from './audio/audioEngine';
import { ThreeBackground } from './components/ThreeBackground';
import { InteractiveCanvas } from './components/InteractiveCanvas';
import { SheetMusicStaff } from './components/SheetMusicStaff';
import { ControlHud } from './components/ControlHud';
import { Radio } from 'lucide-react';


export const App: React.FC = () => {
  // Initialize Physics Engine singleton
  const physics = useMemo(() => new PhysicsEngine(), []);

  // UI State
  const [activeScale, setActiveScale] = useState<ScaleDefinition>(SCALES[0]);
  const [currentTool, setCurrentTool] = useState<'interact' | 'add-well' | 'add-bumper'>('interact');
  const [crtEnabled, setCrtEnabled] = useState(true);
  const [bpm, setBpm] = useState(110);
  const [gravityStrength, setGravityStrength] = useState(2500);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Initialize Web Audio on first user interaction
  const handleUserGesture = () => {
    if (!hasInteracted) {
      AudioEngine.getInstance().init();
      setHasInteracted(true);
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    AudioEngine.getInstance().setMasterVolume(nextMute ? 0 : 0.85);
  };

  return (
    <div
      onClick={handleUserGesture}
      className="relative w-screen h-screen overflow-hidden flex flex-col bg-[#08020f] font-sans select-none"
    >
      {/* 3D Three.js Perspective Horizon Grid & Sun */}
      <ThreeBackground />

      {/* CRT Scanline & Vignette Effect Overlays */}
      {crtEnabled && (
        <>
          <div className="crt-overlay" />
          <div className="crt-vignette" />
        </>
      )}

      {/* Top Floating Control HUD */}
      <ControlHud
        physics={physics}
        activeScale={activeScale}
        onScaleChange={setActiveScale}
        currentTool={currentTool}
        onToolChange={setCurrentTool}
        crtEnabled={crtEnabled}
        onToggleCrt={() => setCrtEnabled(!crtEnabled)}
        bpm={bpm}
        onBpmChange={setBpm}
        gravityStrength={gravityStrength}
        onGravityChange={setGravityStrength}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Audio Activation Banner for Browser Autoplay Unlock */}
      {!hasInteracted && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-40 px-6 py-2 rounded-full glass-panel-active border border-cyan-400 text-cyan-300 font-mono text-xs flex items-center space-x-2 animate-bounce shadow-[0_0_20px_rgba(0,243,255,0.6)] pointer-events-none">
          <Radio size={14} className="text-[#ff2a85] animate-pulse" />
          <span className="tracking-wider">CLICK ANYWHERE TO ENGAGE ACID AUDIO ENGINE</span>
        </div>
      )}

      {/* Main Interactive Physics Stage */}
      <main className="relative flex-1 w-full h-full overflow-hidden flex flex-col z-10">
        <InteractiveCanvas
          physics={physics}
          currentTool={currentTool}
          onToolChange={setCurrentTool}
        />
      </main>

      {/* Real-Time Live Sheet Music Dock at Bottom */}
      <footer className="relative w-full z-20">
        <SheetMusicStaff />
      </footer>
    </div>
  );
};

export default App;

