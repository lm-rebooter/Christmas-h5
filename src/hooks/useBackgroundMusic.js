// Lightweight audio hook with local track support
import { useEffect, useRef } from 'react'

export default function useBackgroundMusic(enabled, src, volume = 0.5) {
  const audioRef = useRef(null)
  useEffect(() => {
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

