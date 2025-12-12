import * as THREE from 'three'
import { Stars, OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import Tree from './Tree'
import GroundRing from './GroundRing'
import Snow from './Snow'
import Fireworks from './Fireworks'

// The composed scene; accepts a settings object from App
export default function Scene({ settings }) {
  return (
    <>
      <color attach="background" args={[0x000000]} />
      <fog attach="fog" args={[new THREE.Color('#000010'), 30, 120]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 12, 5]} intensity={1.2} />
      <Stars radius={120} depth={40} count={settings.isMobile ? 900 : 2000} factor={3} saturation={0} fade speed={0.5} />

      <Tree density={settings.treeDensity} />
      <GroundRing count={settings.ringCount} alpha={settings.isMobile ? 0.45 : 0.6} radius={settings.isMobile ? 16 : 18} thickness={settings.isMobile ? 3 : 4} yOffset={-6.5} />
      {settings.snow && (
        <Snow
          count={settings.snowCount}
          minSize={settings.isMobile ? 1.2 : 2.0}
          maxSize={settings.isMobile ? 2.6 : 4.0}
          alpha={settings.isMobile ? 0.8 : 0.95}
          soft={settings.isMobile ? 0.35 : 0.25}
          useSprite={settings.isMobile}
          spriteSize={settings.isMobile ? 3.5 : 6}
        />
      )}
      <Fireworks enabled={settings.fireworks} />
      {settings.bloom && (
        <EffectComposer multisampling={settings.isMobile ? 0 : 2}>
          <Bloom mipmapBlur intensity={settings.isMobile ? Math.min(1.0, settings.bloomIntensity) : settings.bloomIntensity} luminanceThreshold={0.2} luminanceSmoothing={0.3} radius={0.6} />
          {!settings.isMobile && <Noise premultiply opacity={0.02} />}
          <Vignette eskil={false} offset={0.2} darkness={0.65} />
        </EffectComposer>
      )}
      <OrbitControls enablePan={false} enableZoom={false} autoRotate={settings.autoRotate} autoRotateSpeed={0.8} />
      <PerformanceMonitor onDecline={() => settings.setQuality('low')} onIncline={() => settings.setQuality('high')} />
    </>
  )
}
