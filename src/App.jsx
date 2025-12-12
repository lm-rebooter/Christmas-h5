import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import Scene from './components/Scene'
import useBackgroundMusic from './hooks/useBackgroundMusic'
import musicA from './assets/2020-10-27_-_Presents_On_Christmas_Morning_-_www.FesliyanStudios.com_Steve_Oxen.mp3'
import musicB from './assets/ChristmasBackgroundMusic2018-12-5_-_A_Happy_Christmas_-_David_Fesliyan.mp3'

export default function App() {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 820 : false))
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 820)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [autoRotate, setAutoRotate] = useState(true)
  const [bloom, setBloom] = useState(() => !isMobile)
  const [bloomIntensity, setBloomIntensity] = useState(1.6)
  const [snow, setSnow] = useState(true)
  const [snowCount, setSnowCount] = useState(isMobile ? 1200 : 2200)
  const [treeDensity, setTreeDensity] = useState(isMobile ? 22000 : 36000)
  const [ringCount, setRingCount] = useState(() => (isMobile ? 1800 : 3000))
  const [fireworks, setFireworks] = useState(() => !isMobile)
  const [music, setMusic] = useState(false)
  const tracks = [
    { name: 'Presents On Christmas Morning', src: musicA },
    { name: 'A Happy Christmas', src: musicB },
  ]
  const [trackIdx, setTrackIdx] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [showHint, setShowHint] = useState(true)

  useBackgroundMusic(music, tracks[trackIdx]?.src, volume)

  useEffect(() => {
    setSnowCount(isMobile ? 1000 : 2200)
    setTreeDensity(isMobile ? 22000 : 36000)
  }, [isMobile])

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 5000)
    return () => clearTimeout(t)
  }, [])

  const settings = {
    autoRotate,
    bloom,
    bloomIntensity,
    snow,
    snowCount,
    treeDensity,
    ringCount,
    fireworks,
    isMobile,
    setQuality: (q) => {
      if (q === 'low') {
        setBloomIntensity(1.2)
        setSnowCount((c) => Math.max(500, Math.floor(c * 0.6)))
        setTreeDensity((d) => Math.max(15000, Math.floor(d * 0.75)))
      } else {
        setBloomIntensity(1.6)
      }
    }
  }

  return (
    <>
      <div className="overlay merry">Merry<br/>Christmas</div>
      {!isMobile && (
        <div className="overlay panel">
          <label><input type="checkbox" checked={autoRotate} onChange={(e)=>setAutoRotate(e.target.checked)} /> rotate</label>
          <label><input type="checkbox" checked={bloom} onChange={(e)=>setBloom(e.target.checked)} /> bloom</label>
          <label><input type="checkbox" checked={snow} onChange={(e)=>setSnow(e.target.checked)} /> snow</label>
          <label><input type="checkbox" checked={fireworks} onChange={(e)=>setFireworks(e.target.checked)} /> fireworks</label>
          <label><input type="checkbox" checked={music} onChange={(e)=>setMusic(e.target.checked)} /> music</label>
          <label>vol <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e)=>setVolume(parseFloat(e.target.value))} /></label>
          <button className="btn" onClick={() => setTrackIdx((i)=> (i+1)%tracks.length)}>♪ {tracks[trackIdx].name}</button>
          <button className="btn" onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.() }}>⛶</button>
        </div>
      )}
      {isMobile && !music && (
        <button className="overlay music-btn" onClick={() => setMusic(true)}>🎵 Tap for music</button>
      )}
      {isMobile && showHint && (
        <div className="overlay hint">Tap anywhere for fireworks ✨</div>
      )}
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0, 6, 35], fov: 38, near: 0.6, far: 200 }}
          dpr={isMobile ? 1 : [1, 2]}
          gl={{ antialias: !isMobile, powerPreference: 'high-performance', alpha: false, logarithmicDepthBuffer: !isMobile }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = isMobile ? 0.95 : 1
          }}
        >
          <Scene settings={settings} />
        </Canvas>
      </Suspense>
    </>
  )
}
