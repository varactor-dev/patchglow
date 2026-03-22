// ─── Canvas Drawing Utilities ─────────────────────────────────────────────────

/**
 * Clear canvas with a partial-alpha fade for phosphor trail effect.
 * Instead of clearing completely, we paint a semi-transparent dark rectangle
 * so previous frames slowly fade out, creating a "persistence of vision" glow.
 */
export function clearWithFade(ctx: CanvasRenderingContext2D, alpha = 0.25): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#0d0d14'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.restore()
}

/**
 * Full clear — no trail effect.
 */
export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.fillStyle = '#0d0d14'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}

/**
 * Draw a faint grid on the canvas background.
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  divisions = 4,
  color = '#1a1a28',
): void {
  const { width, height } = ctx.canvas
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 0.5

  // Vertical lines
  for (let i = 1; i < divisions; i++) {
    const x = (width / divisions) * i
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  // Horizontal lines
  for (let i = 1; i < divisions; i++) {
    const y = (height / divisions) * i
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  // Center line (zero reference) — slightly brighter
  ctx.strokeStyle = '#222234'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()

  ctx.restore()
}

/**
 * Draw a glowing line by layering: thick dim stroke + thin bright stroke.
 * This creates a neon phosphor glow effect.
 */
export function drawGlowLine(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
  thickness = 1.5,
): void {
  if (points.length < 2) return
  ctx.save()

  const path = new Path2D()
  path.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y)
  }

  // Outer glow (wide, dim)
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.25
  ctx.lineWidth = thickness * 8
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke(path)

  // Mid glow
  ctx.globalAlpha = 0.4
  ctx.lineWidth = thickness * 3
  ctx.stroke(path)

  // Core (bright, sharp)
  ctx.globalAlpha = 1.0
  ctx.lineWidth = thickness
  ctx.stroke(path)

  ctx.restore()
}

/**
 * Draw a waveform (Float32Array of samples in -1..1) as a glowing line.
 */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,
  color: string,
  yOffset = 0,       // 0 = use full canvas height; use 0.5 for top half
  yScale = 1.0,      // fraction of canvas height to use
  thickness = 1.5,   // line thickness — increase for hero displays
): void {
  const { width, height } = ctx.canvas
  const centerY = height * yOffset + (height * yScale) / 2
  const amplitude = (height * yScale) / 2 * 0.85

  const step = data.length / width
  const pts: { x: number; y: number }[] = []

  for (let x = 0; x < width; x++) {
    const i = Math.floor(x * step)
    const y = centerY - data[i] * amplitude
    pts.push({ x, y })
  }

  drawGlowLine(ctx, pts, color, thickness)
}

/**
 * Draw an FFT spectrum as vertical bars.
 */
export function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  data: Float32Array,  // values typically 0..255 from Tone.js Analyser (fft)
  color: string,
  yStart = 0,
  yEnd = 1,
): void {
  const { width, height } = ctx.canvas
  const regionTop = height * yStart
  const regionHeight = height * (yEnd - yStart)

  ctx.save()
  ctx.strokeStyle = color

  const binWidth = width / data.length
  const hexColor = color

  for (let i = 0; i < data.length; i++) {
    const normalized = data[i] / 255
    const barHeight = normalized * regionHeight

    const x = i * binWidth

    // Glow effect: outer dim bar
    ctx.globalAlpha = 0.25
    ctx.fillStyle = hexColor
    ctx.fillRect(x, regionTop + regionHeight - barHeight, binWidth * 0.85, barHeight)

    // Bright core with shadowBlur glow on peaks
    ctx.globalAlpha = 0.9
    ctx.shadowColor = hexColor
    ctx.shadowBlur = 6
    ctx.fillRect(x, regionTop + regionHeight - barHeight * 0.7, binWidth * 0.5, barHeight * 0.7)
    ctx.shadowBlur = 0
  }

  ctx.restore()
}

/**
 * Map a value from one range to another.
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin)
}

/**
 * Find the first zero-crossing in a waveform for stable oscilloscope display.
 * Returns the sample index of the crossing.
 */
export function findZeroCrossing(data: Float32Array, startSearch = 0): number {
  for (let i = startSearch; i < data.length - 1; i++) {
    if (data[i] <= 0 && data[i + 1] > 0) return i
  }
  return 0
}
