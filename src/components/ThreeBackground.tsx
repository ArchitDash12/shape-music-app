import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AudioEngine } from '../audio/audioEngine';

export const ThreeBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08020f, 0.008);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 45);
    camera.lookAt(0, 8, -60);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Infinite Neon Grid Floor
    const gridGeometry = new THREE.PlaneGeometry(300, 300, 40, 40);
    gridGeometry.rotateX(-Math.PI / 2);

    const gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridMesh.position.y = -10;
    scene.add(gridMesh);

    // Second lower grid with magenta wireframe for retro dual-depth
    const gridGeo2 = new THREE.PlaneGeometry(300, 300, 30, 30);
    gridGeo2.rotateX(-Math.PI / 2);
    const gridMat2 = new THREE.MeshBasicMaterial({
      color: 0xff2a85,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const gridMesh2 = new THREE.Mesh(gridGeo2, gridMat2);
    gridMesh2.position.y = -10.5;
    scene.add(gridMesh2);

    // 3. Vaporwave Synth Sun on the Horizon
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 512;
    sunCanvas.height = 512;
    const sunCtx = sunCanvas.getContext('2d');
    if (sunCtx) {
      // Sunset Gradient
      const grad = sunCtx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#ffb703');
      grad.addColorStop(0.5, '#ff2a85');
      grad.addColorStop(1, '#7000ff');
      sunCtx.fillStyle = grad;
      sunCtx.beginPath();
      sunCtx.arc(256, 256, 240, 0, Math.PI * 2);
      sunCtx.fill();

      // Horizontal Cutout Stripes (80s Outrun Sun look)
      sunCtx.fillStyle = '#08020f';
      for (let i = 0; i < 9; i++) {
        const y = 260 + i * 26;
        const h = 4 + i * 2.5;
        sunCtx.fillRect(16, y, 480, h);
      }
    }

    const sunTexture = new THREE.CanvasTexture(sunCanvas);
    const sunGeo = new THREE.PlaneGeometry(55, 55);
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(0, 18, -120);
    scene.add(sunMesh);

    // 4. Floating Cosmic Dust Particles
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorPalette = [
      new THREE.Color(0x00f3ff),
      new THREE.Color(0xff2a85),
      new THREE.Color(0xbbf400),
      new THREE.Color(0xffb703)
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = -Math.random() * 140;

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 5. Audio Engine reference for reactive pulsation
    const audioEngine = AudioEngine.getInstance();

    // 6. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Scroll Grid Floor forward continuously

      gridMesh.position.z = (gridMesh.position.z + delta * 24) % 15;
      gridMesh2.position.z = (gridMesh2.position.z + delta * 18) % 15;

      // Audio Frequency Reactivity
      const freqData = audioEngine.getAudioFrequencyData();
      let bassAvg = 0;
      for (let i = 0; i < 8; i++) {
        bassAvg += freqData[i] || 0;
      }
      bassAvg /= 8 * 255; // 0..1

      // Subtle Sun Scale Reactivity
      const sunScale = 1.0 + bassAvg * 0.14;
      sunMesh.scale.set(sunScale, sunScale, 1);

      // Rotate and slowly float particles
      const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        let y = posAttr.getY(i);
        y -= delta * 3.5;
        if (y < 0) y = 60;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      gridGeometry.dispose();
      gridMaterial.dispose();
      gridGeo2.dispose();
      gridMat2.dispose();
      sunGeo.dispose();
      sunMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-85"
    />
  );
};
