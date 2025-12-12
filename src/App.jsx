import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { Stars, OrbitControls, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import musicA from './assets/2020-10-27_-_Presents_On_Christmas_Morning_-_www.FesliyanStudios.com_Steve_Oxen.mp3'
import musicB from './assets/ChristmasBackgroundMusic2018-12-5_-_A_Happy_Christmas_-_David_Fesliyan.mp3'

function makeSnowflakeTexture(size = 128) {
  const key = `__snowflake_${size}`
  if (globalThis[key]) return globalThis[key]
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, size, size)
  // soft disc
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(size/2, size/2, size*0.5, 0, Math.PI*2)
  ctx.fill()
  // hex spokes
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = Math.max(1, size*0.03)
  ctx.lineCap = 'round'
  for (let i=0;i<6;i++){
    const a = (Math.PI/3)*i
    const x = Math.cos(a), y = Math.sin(a)
    ctx.beginPath()
    ctx.moveTo(size/2 - x*size*0.05, size/2 - y*size*0.05)
    ctx.lineTo(size/2 + x*size*0.38, size/2 + y*size*0.38)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  globalThis[key] = tex
  return tex
}

function Snow({ count = 2000, area = 120, speed = 0.2, minSize = 2.0, maxSize = 4.0, alpha = 0.95, soft = 0.25, useSprite = false }) {
  // positions
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3 + 0] = (Math.random() - 0.5) * area
      p[i * 3 + 1] = Math.random() * area * 0.9
      p[i * 3 + 2] = (Math.random() - 0.5) * area
    }
    return p
  }, [count, area])

  // per-flake size and rotation seed
  const sizes = useMemo(() => {
    const s = new Float32Array(count)
    const range = Math.max(0.1, maxSize - minSize)
    for (let i = 0; i < count; i++) s[i] = minSize + Math.random() * range
    return s
  }, [count, minSize, maxSize])

  const twirls = useMemo(() => {
    const t = new Float32Array(count)
    for (let i = 0; i < count; i++) t[i] = Math.random() * Math.PI * 2
    return t
  }, [count])

  const ref = useRef()
  const mat = useRef()

  useFrame((state, delta) => {
    // animate fall
    const arr = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      const base = i * 3
      arr[base + 1] -= speed + Math.random() * 0.3
      if (arr[base + 1] < -area * 0.5) arr[base + 1] = area * 0.45
      // slow horizontal drift
      arr[base + 0] += Math.sin((arr[base + 1] + i) * 0.02) * 0.01
      arr[base + 2] += Math.cos((arr[base + 1] + i) * 0.018) * 0.008
    }
    ref.current.geometry.attributes.position.needsUpdate = true
    if (mat.current) mat.current.uniforms.uTime.value += delta
  })

  const vertex = /* glsl */`
    attribute float aSize;
    attribute float aTwirl;
    uniform float uTime;
    varying float vTwirl;
    void main(){
      vTwirl = aTwirl + uTime * 0.3;
      vec3 pos = position;
      // tiny flutter
      pos.x += sin(uTime*0.3 + position.y*0.11 + aTwirl)*0.05;
      pos.z += cos(uTime*0.25 + position.y*0.09 + aTwirl)*0.05;
      vec4 mv = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = aSize * (240.0 / -mv.z);
    }
  `

  const fragment = /* glsl */`
    precision highp float;
    uniform vec3 uColor;
    uniform float uAlpha;
    uniform float uSoft;
    varying float vTwirl;

    mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

    float sdHex(vec2 p, float r){
      // Regular hexagon SDF, r ~ radius
      p = abs(p);
      return max(p.x*0.866025 + p.y*0.5, p.y) - r;
    }

    void main(){
      vec2 uv = gl_PointCoord.xy;      // 0..1
      vec2 p = uv*2.0 - 1.0;           // -1..1
      p *= rot(vTwirl * 0.35);
      float r = length(p);

      // base soft disc
      float disc = smoothstep(1.0, 1.0-uSoft, 1.0 - r);

      // snowflake: hex core + 6 spokes
      float hex = 1.0 - smoothstep(0.0, 0.12, sdHex(p, 0.65));
      // spokes: min of |y| after rotating by 0,60,120 degrees
      float l0 = abs(p.y);
      vec2 p1 = rot(3.14159265/3.0) * p;
      float l1 = abs(p1.y);
      vec2 p2 = rot(2.0*3.14159265/3.0) * p;
      float l2 = abs(p2.y);
      float spokes = 1.0 - smoothstep(0.04, 0.0, min(l0, min(l1, l2)));
      // fade spokes near edge
      spokes *= smoothstep(0.95, 0.2, r);

      float snow = clamp(max(hex*0.8, spokes*0.9) + disc*0.4, 0.0, 1.0);
      float alpha = snow * uAlpha;
      if (alpha < 0.02) discard;
      gl_FragColor = vec4(uColor, alpha);
    }
  `

  if (useSprite) {
    const texture = makeSnowflakeTexture(128)
    return (
      <points ref={ref} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={texture}
          alphaMap={texture}
          transparent
          opacity={0.9}
          size={8}
          sizeAttenuation
          depthWrite={false}
          color={new THREE.Color('#ffffff')}
          blending={THREE.NormalBlending}
        />
      </points>
    )
  }

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aTwirl" args={[twirls, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        args={[{ uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#ffffff') }, uAlpha: { value: alpha }, uSoft: { value: soft } }, vertexShader: vertex, fragmentShader: fragment, transparent: true }]} 
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function GroundRing({ count = 1200, radius = 19, thickness = 3.2, yOffset = -6.8, colorA = '#6fc5ff', colorB = '#e9f6ff', alpha = 0.38, speed = 0.28 }) {
  // Base polar params for smooth orbiting fireflies
  const angles = useRef(new Float32Array(count))
  const radii = useRef(new Float32Array(count))
  const phases = useRef(new Float32Array(count))
  const speeds = useRef(new Float32Array(count))

  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      angles.current[i] = Math.random() * Math.PI * 2
      radii.current[i] = radius + (Math.random() - 0.5) * thickness
      phases.current[i] = Math.random() * Math.PI * 2
      speeds.current[i] = speed * (0.6 + Math.random() * 0.8) * (Math.random() < 0.5 ? 1 : -1)
      const a = angles.current[i]
      p[i * 3 + 0] = Math.cos(a) * radii.current[i]
      p[i * 3 + 1] = yOffset + Math.sin(a * 3.0 + phases.current[i]) * 0.6
      p[i * 3 + 2] = Math.sin(a) * radii.current[i]
    }
    return p
  }, [count, radius, thickness, yOffset, speed])

  const sizes = useMemo(() => {
    const s = new Float32Array(count)
    for (let i = 0; i < count; i++) s[i] = 0.6 + Math.random() * 1.4
    return s
  }, [count])

  const twinkle = useMemo(() => {
    const s = new Float32Array(count)
    for (let i = 0; i < count; i++) s[i] = Math.random() * Math.PI * 2
    return s
  }, [count])

  const ref = useRef()
  const mat = useRef()
  useFrame((_, dt) => {
    const arr = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      angles.current[i] += speeds.current[i] * dt
      const a = angles.current[i]
      const r = radii.current[i]
      arr[i * 3 + 0] = Math.cos(a) * r
      arr[i * 3 + 1] = yOffset + Math.sin(a * 3.0 + phases.current[i]) * 0.6
      arr[i * 3 + 2] = Math.sin(a) * r
    }
    ref.current.geometry.attributes.position.needsUpdate = true
    if (mat.current) mat.current.uniforms.uTime.value += dt
  })

  const vertex = /* glsl */`
    attribute float aSize; attribute float aPhase; uniform float uTime; varying float vPhase; void main(){ vPhase=aPhase; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=aSize*(210.0/ -mv.z); }
  `
  const fragment = /* glsl */`
    precision highp float; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uAlpha; uniform float uSoft; uniform float uTime; varying float vPhase; void main(){ vec2 p=gl_PointCoord*2.0-1.0; float r=length(p); float disc=smoothstep(1.0,1.0-uSoft,1.0-r); float tw=0.5+0.5*sin(uTime*2.0+vPhase); vec3 col=mix(uColorA,uColorB,0.35+0.25*tw); float a=disc*uAlpha*(0.8+0.2*tw); if(a<0.02) discard; gl_FragColor=vec4(col,a); }
  `

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[twinkle, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        args={[{ uniforms: { uTime: { value: 0 }, uColorA: { value: new THREE.Color(colorA) }, uColorB: { value: new THREE.Color(colorB) }, uAlpha: { value: alpha }, uSoft: { value: 0.45 } }, vertexShader: vertex, fragmentShader: fragment, transparent: true }]} 
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function Tree({ height = 22, radius = 9, density = 38000 }) {
  // Create a cone-like point cloud with branchy noise
  const positions = useMemo(() => {
    const p = new Float32Array(density * 3)
    for (let i = 0; i < density; i++) {
      const y = Math.random() * height // 0..h
      const t = 1 - y / height // 1 at top -> 0 at base
      const r = (t ** 1.1) * radius * (0.6 + Math.random() * 0.6)
      const angle = Math.random() * Math.PI * 2
      const branchWave = Math.sin(y * 1.4 + angle * 3) * 0.6 * t
      const jitter = (Math.random() - 0.5) * 0.6 * t
      const x = Math.cos(angle) * (r + branchWave) + jitter
      const z = Math.sin(angle) * (r + branchWave) + jitter
      // Slight inward curvature
      const bend = (1 - t) * 0.15
      p[i * 3 + 0] = x
      p[i * 3 + 1] = y - height / 2 + bend
      p[i * 3 + 2] = z
    }
    return p
  }, [height, radius, density])

  const colors = useMemo(() => {
    const c = new Float32Array(density * 3)
    const green = new THREE.Color('#35ff9b')
    const red = new THREE.Color('#ff3d65')
    const gold = new THREE.Color('#ffd27d')
    for (let i = 0; i < density; i++) {
      const y = positions[i * 3 + 1]
      const mix = (y + height / 2) / height
      const base = green.clone().multiplyScalar(0.6 + mix * 0.6)
      const ornament = Math.random() < 0.05
      const col = ornament ? (Math.random() < 0.5 ? red : gold) : base
      c[i * 3 + 0] = col.r
      c[i * 3 + 1] = col.g
      c[i * 3 + 2] = col.b
    }
    return c
  }, [density, height, positions])

  const ref = useRef()
  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.4
  })

  return (
    <group>
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.15}
          sizeAttenuation
          vertexColors
          blending={THREE.AdditiveBlending}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </points>
      {/* Top star */}
      <mesh position={[0, height / 2 + 0.5, 0]}>
        <icosahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial
          color={new THREE.Color('#fffed1')}
          emissive={new THREE.Color('#fff6a8')}
          emissiveIntensity={2.5}
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>
      {/* Twinkles are handled by GroundRing + background Stars for softer look on mobile */}
    </group>
  )
}

function Fireworks({ enabled = true }) {
  const { camera, gl, size } = useThree()
  const max = 2000
  const mesh = useRef()
  const velocities = useRef([])
  const life = useRef([])
  const colors = useMemo(() => [new THREE.Color('#ff6b6b'), new THREE.Color('#ffd86b'), new THREE.Color('#6bc7ff'), new THREE.Color('#b06bff')], [])

  // init instances once
  useEffect(() => {
    if (!mesh.current) return
    const m = mesh.current
    for (let i = 0; i < max; i++) {
      const mat = new THREE.Matrix4()
      mat.setPosition(0, -9999, 0)
      m.setMatrixAt(i, mat)
      m.setColorAt(i, colors[i % colors.length])
      velocities.current[i] = new THREE.Vector3()
      life.current[i] = 0
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [max, colors])

  const tmp = new THREE.Object3D()
  function spawnBurst(origin) {
    const count = 120
    for (let i = 0; i < max && count > 0; i++) {
      if (life.current[i] <= 0) {
        // spherical distribution
        const dir = new THREE.Vector3().randomDirection().multiplyScalar(6 + Math.random() * 6)
        velocities.current[i].copy(dir)
        life.current[i] = 1.6 + Math.random() * 0.7
        tmp.position.copy(origin)
        tmp.scale.setScalar(0.08 + Math.random() * 0.06)
        tmp.updateMatrix()
        mesh.current.setMatrixAt(i, tmp.matrix)
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }

  useEffect(() => {
    if (!enabled) return
    const raycaster = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) // y=0 plane
    const v2 = new THREE.Vector2()
    const onDown = (e) => {
      v2.x = (e.clientX / size.width) * 2 - 1
      v2.y = -(e.clientY / size.height) * 2 + 1
      raycaster.setFromCamera(v2, camera)
      const p = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, p)
      if (p) spawnBurst(p)
    }
    gl.domElement.addEventListener('pointerdown', onDown)
    return () => gl.domElement.removeEventListener('pointerdown', onDown)
  }, [camera, gl, size, enabled])

  // animate
  useFrame((_, dt) => {
    if (!mesh.current) return
    const g = 5
    for (let i = 0; i < max; i++) {
      if (life.current[i] > 0) {
        life.current[i] -= dt
        velocities.current[i].y -= g * dt
        mesh.current.getMatrixAt(i, tmp.matrix)
        tmp.position.setFromMatrixPosition(tmp.matrix)
        tmp.position.addScaledVector(velocities.current[i], dt)
        tmp.rotation.x += dt * 3
        tmp.rotation.y += dt * 2
        tmp.scale.multiplyScalar(0.995)
        tmp.updateMatrix()
        mesh.current.setMatrixAt(i, tmp.matrix)
      } else {
        tmp.position.set(0, -9999, 0)
        tmp.updateMatrix()
        mesh.current.setMatrixAt(i, tmp.matrix)
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[null, null, max]} frustumCulled={false}>
      <sphereGeometry args={[0.12, 6, 6]} />
      <meshStandardMaterial emissive="#ffffff" emissiveIntensity={2.5} color="#ffffff" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  )
}

function Scene({ settings }) {
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

function useBackgroundMusic(enabled, src, volume = 0.5) {
  const audioRef = useRef(null)
  useEffect(() => {
    // stop old
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (!enabled || !src) return
    const el = new Audio(src)
    el.loop = true
    el.preload = 'auto'
    el.volume = Math.max(0, Math.min(1, volume))
    audioRef.current = el
    const tryPlay = () => el.play().catch(() => {})
    document.addEventListener('click', tryPlay, { once: true })
    tryPlay()
    return () => {
      document.removeEventListener('click', tryPlay)
      el.pause()
    }
  }, [enabled, src])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, volume))
  }, [volume])

  return audioRef
}

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
    // 旋转或尺寸变化时，按需调整粒子数
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
      <div className="overlay panel">
        <label><input type="checkbox" checked={autoRotate} onChange={(e)=>setAutoRotate(e.target.checked)} /> rotate</label>
        <label><input type="checkbox" checked={bloom} onChange={(e)=>setBloom(e.target.checked)} /> bloom</label>
        <label><input type="checkbox" checked={snow} onChange={(e)=>setSnow(e.target.checked)} /> snow</label>
        <label><input type="checkbox" checked={fireworks} onChange={(e)=>setFireworks(e.target.checked)} /> fireworks</label>
        <label><input type="checkbox" checked={music} onChange={(e)=>setMusic(e.target.checked)} /> music</label>
        <label>vol <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e)=>setVolume(parseFloat(e.target.value))} /></label>
        <button className="btn" onClick={() => setTrackIdx((i)=> (i+1)%tracks.length)}>♪ {tracks[trackIdx].name}</button>
        <button className="btn" onClick={() => {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
          else document.exitFullscreen?.()
        }}>⛶</button>
      </div>
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
