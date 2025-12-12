import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Elegant orbiting fireflies ring around the tree (soft round particles)
export function GroundRing({ count = 1200, radius = 19, thickness = 3.2, yOffset = -6.8, colorA = '#6fc5ff', colorB = '#e9f6ff', alpha = 0.38, speed = 0.28 }) {
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
      <shaderMaterial ref={mat} args={[{ uniforms: { uTime: { value: 0 }, uColorA: { value: new THREE.Color(colorA) }, uColorB: { value: new THREE.Color(colorB) }, uAlpha: { value: alpha }, uSoft: { value: 0.45 } }, vertexShader: vertex, fragmentShader: fragment, transparent: true }]} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

export default GroundRing

