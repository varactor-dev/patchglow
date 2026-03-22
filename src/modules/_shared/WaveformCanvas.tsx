import { useRef, useEffect } from 'react'
import { clearWithFade, drawGrid, drawWaveform } from './drawUtils'
import { useAnimationFrame } from './useAnimationFrame'

interface WaveformCanvasProps {
  width: number
  height: number
  getData: () => Float32Array | undefined
  color: string
  fade?: boolean  // use phosphor fade (default true)
  className?: string
  style?: React.CSSProperties
}

export default function WaveformCanvas({
  width,
  height,
  getData,
  color,
  fade = true,
  className,
  style,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Set canvas pixel size on mount / resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio ?? 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
  }, [width, height])

  useAnimationFrame(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const data = getData()

    if (fade) {
      clearWithFade(ctx, 0.3)
    } else {
      ctx.fillStyle = '#0d0d14'
      ctx.fillRect(0, 0, width, height)
    }

    drawGrid(ctx)

    if (data && data.length > 0) {
      drawWaveform(ctx, data, color)
    }
  })

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block', ...style }}
      className={className}
    />
  )
}
