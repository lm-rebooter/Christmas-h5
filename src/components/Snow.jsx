import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Draw a soft hex-snowflake sprite on a canvas and cache as texture
function makeSnowflakeTexture(size = 128) {
  const key = `__snowflake_${size}`
  if (globalThis[key]) return globalThis[key]
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, size, size)

  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = Math.max(1, size * 0.03)
  ctx.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    const x = Math.cos(a), y = Math.sin(a)
    ctx.beginPath()
    ctx.moveTo(size / 2 - x * size * 0.05, size / 2 - y * size * 0.05)
    ctx.lineTo(size / 2 + x * size * 0.38, size / 2 + y * size * 0.38)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  globalThis[key] = tex
  return tex
}

// Pretty, stable snow. On mobile we can set useSprite to true to avoid shader artifacts.
export function Snow({ count = 2000, area = 120, speed = 0.2, minSize = 2.0, maxSize = 4.0, alpha = 0.95, soft = 0.25, useSprite = false }) {
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      p[i * 3 + 0] = (Math.random() - 0.5) * area
      p[i * 3 + 1] = Math.random() * area * 0.9
      p[i * 3 + 2] = (Math.random() - 0.5) * area
    }
    return p
  }, [count, area])

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

  useFrame((_, delta) => {
    const arr = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      const base = i * 3
      arr[base + 1] -= speed + Math.random() * 0.3
      if (arr[base + 1] < -area * 0.5) arr[base + 1] = area * 0.45
      arr[base + 0] += Math.sin((arr[base + 1] + i) * 0.02) * 0.01
      arr[base + 2] += Math.cos((arr[base + 1] + i) * 0.018) * 0.008
    }
    ref.current.geometry.attributes.position.needsUpdate = true
    if (mat.current) mat.current.uniforms.uTime.value += delta
  })

  // Sprite fallback for mobile stability
  if (useSprite) {
    const texture = makeSnowflakeTexture(128)
    return (
      <points ref={ref} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial map={texture} alphaMap={texture} transparent opacity={0.9} size={8} sizeAttenuation depthWrite={false} color={new THREE.Color('#ffffff')} blending={THREE.NormalBlending} />
      </points>
    )
  }

  const vertex = /* glsl */`
    attribute float aSize; attribute float aTwirl; uniform float uTime; varying float vTwirl; void main(){ vTwirl=aTwirl+uTime*0.3; vec3 pos=position; pos.x += sin(uTime*0.3 + position.y*0.11 + aTwirl)*0.05; pos.z += cos(uTime*0.25 + position.y*0.09 + aTwirl)*0.05; vec4 mv=modelViewMatrix*vec4(pos,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=aSize*(240.0/ -mv.z); }
  `

  const fragment = /* glsl */`
    precision highp float; uniform vec3 uColor; uniform float uAlpha; uniform float uSoft; varying float vTwirl; mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c);} float sdHex(vec2 p,float r){ p=abs(p); return max(p.x*0.866025 + p.y*0.5, p.y) - r; } void main(){ vec2 uv=gl_PointCoord.xy; vec2 p=uv*2.0-1.0; p*=rot(vTwirl*0.35); float r=length(p); float disc=smoothstep(1.0,1.0-uSoft,1.0-r); float hex=1.0 - smoothstep(0.0, 0.12, sdHex(p, 0.65)); float l0=abs(p.y); vec2 p1=rot(3.14159265/3.0)*p; float l1=abs(p1.y); vec2 p2=rot(2.0*3.14159265/3.0)*p; float l2=abs(p2.y); float spokes=1.0 - smoothstep(0.04, 0.0, min(l0, min(l1,l2))); spokes *= smoothstep(0.95, 0.2, r); float snow=clamp(max(hex*0.8, spokes*0.9) + disc*0.4, 0.0, 1.0); float a=snow*uAlpha; if(a<0.02) discard; gl_FragColor=vec4(uColor,a); }
  `

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aTwirl" args={[twirls, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={mat} args={[{ uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#ffffff') }, uAlpha: { value: alpha }, uSoft: { value: soft } }, vertexShader: vertex, fragmentShader: fragment, transparent: true }]} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

export default Snow

