import { useEffect, useRef } from 'react'

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const c = canvas
    const g = ctx

    let raf = 0
    const stars: { x: number; y: number; z: number; s: number }[] = []
    const n = 120
    let w = 0
    let h = 0

    function resize() {
      w = innerWidth
      h = innerHeight
      const dpr = Math.min(2, devicePixelRatio || 1)
      c.width = w * dpr
      c.height = h * dpr
      c.style.width = `${w}px`
      c.style.height = `${h}px`
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars.length = 0
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random(),
          s: 0.3 + Math.random() * 1.2,
        })
      }
    }

    function frame() {
      g.clearRect(0, 0, w, h)
      for (const st of stars) {
        st.y += st.s * 0.15
        st.x += Math.sin(st.y * 0.01) * 0.12
        if (st.y > h) {
          st.y = 0
          st.x = Math.random() * w
        }
        const a = 0.15 + st.z * 0.55
        g.fillStyle = `rgba(200, 230, 255, ${a})`
        g.beginPath()
        g.arc(st.x, st.y, st.s, 0, Math.PI * 2)
        g.fill()
      }
      raf = requestAnimationFrame(frame)
    }

    resize()
    frame()
    addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
    }
  }, [])

  return <canvas className="starfield-canvas" ref={ref} aria-hidden />
}
