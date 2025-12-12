import { useEffect, useMemo, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Click/tap fireworks with instanced mesh particles
export function Fireworks({ enabled = true }) {
  const { camera, gl, size } = useThree()
  const max = 2000
  const mesh = useRef()
  const velocities = useRef([])
  const life = useRef([])
  const colors = useMemo(() => [new THREE.Color('#ff6b6b'), new THREE.Color('#ffd86b'), new THREE.Color('#6bc7ff'), new THREE.Color('#b06bff')], [])

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
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
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

export default Fireworks

