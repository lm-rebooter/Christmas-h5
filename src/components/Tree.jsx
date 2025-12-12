import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Particle tree with ornaments and rotating point cloud
export function Tree({ height = 22, radius = 9, density = 38000 }) {
  const positions = useMemo(() => {
    const p = new Float32Array(density * 3)
    for (let i = 0; i < density; i++) {
      const y = Math.random() * height
      const t = 1 - y / height
      const r = (t ** 1.1) * radius * (0.6 + Math.random() * 0.6)
      const angle = Math.random() * Math.PI * 2
      const branchWave = Math.sin(y * 1.4 + angle * 3) * 0.6 * t
      const jitter = (Math.random() - 0.5) * 0.6 * t
      const x = Math.cos(angle) * (r + branchWave) + jitter
      const z = Math.sin(angle) * (r + branchWave) + jitter
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
        <pointsMaterial size={0.15} sizeAttenuation vertexColors blending={THREE.AdditiveBlending} transparent opacity={0.9} depthWrite={false} />
      </points>
      <mesh position={[0, height / 2 + 0.5, 0]}>
        <icosahedronGeometry args={[1.2, 0]} />
        <meshStandardMaterial color={new THREE.Color('#fffed1')} emissive={new THREE.Color('#fff6a8')} emissiveIntensity={2.5} metalness={0.1} roughness={0.2} />
      </mesh>
    </group>
  )
}

export default Tree

