/**
 * Pixel Renderer
 * Renders layout tree to pixel buffer
 */

import type { RGBA } from './css-utils'
import { blendColors, parseColor } from './css-utils'
import type { LayoutNode } from './layout'

/**
 * Pixel buffer for rendering
 */
export class PixelBuffer {
  public readonly width: number
  public readonly height: number
  public readonly data: Uint8Array

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.data = new Uint8Array(width * height * 4)
  }

  /**
   * Fill entire buffer with a color
   */
  fill(color: RGBA): void {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = color.r
      this.data[i + 1] = color.g
      this.data[i + 2] = color.b
      this.data[i + 3] = color.a
    }
  }

  /**
   * Get pixel at coordinates
   */
  getPixel(x: number, y: number): RGBA {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return { r: 0, g: 0, b: 0, a: 0 }
    }
    const offset = (y * this.width + x) * 4
    return {
      r: this.data[offset],
      g: this.data[offset + 1],
      b: this.data[offset + 2],
      a: this.data[offset + 3],
    }
  }

  /**
   * Set pixel at coordinates with alpha blending
   */
  setPixel(x: number, y: number, color: RGBA): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height)
      return

    const offset = (y * this.width + x) * 4

    if (color.a === 255) {
      // Fully opaque - direct write
      this.data[offset] = color.r
      this.data[offset + 1] = color.g
      this.data[offset + 2] = color.b
      this.data[offset + 3] = color.a
    }
    else if (color.a > 0) {
      // Blend with existing pixel
      const bg: RGBA = {
        r: this.data[offset],
        g: this.data[offset + 1],
        b: this.data[offset + 2],
        a: this.data[offset + 3],
      }
      const blended = blendColors(color, bg)
      this.data[offset] = blended.r
      this.data[offset + 1] = blended.g
      this.data[offset + 2] = blended.b
      this.data[offset + 3] = blended.a
    }
  }

  /**
   * Draw a filled rectangle
   */
  fillRect(x: number, y: number, width: number, height: number, color: RGBA): void {
    if (color.a === 0)
      return

    const x1 = Math.max(0, Math.floor(x))
    const y1 = Math.max(0, Math.floor(y))
    const x2 = Math.min(this.width, Math.ceil(x + width))
    const y2 = Math.min(this.height, Math.ceil(y + height))

    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        this.setPixel(px, py, color)
      }
    }
  }

  /**
   * Draw a rectangle outline
   */
  strokeRect(x: number, y: number, width: number, height: number, color: RGBA, lineWidth: number = 1): void {
    if (color.a === 0 || lineWidth <= 0)
      return

    // Top border
    this.fillRect(x, y, width, lineWidth, color)
    // Bottom border
    this.fillRect(x, y + height - lineWidth, width, lineWidth, color)
    // Left border
    this.fillRect(x, y, lineWidth, height, color)
    // Right border
    this.fillRect(x + width - lineWidth, y, lineWidth, height, color)
  }

  /**
   * Draw a rounded rectangle
   */
  fillRoundedRect(x: number, y: number, width: number, height: number, radius: number, color: RGBA): void {
    if (color.a === 0)
      return

    radius = Math.min(radius, width / 2, height / 2)

    if (radius <= 0) {
      this.fillRect(x, y, width, height, color)
      return
    }

    const x1 = Math.floor(x)
    const y1 = Math.floor(y)
    const x2 = Math.ceil(x + width)
    const y2 = Math.ceil(y + height)

    for (let py = y1; py < y2; py++) {
      for (let px = x1; px < x2; px++) {
        // Check if point is inside rounded rect
        const dx = px - x
        const dy = py - y

        // Check corners
        let inside = true

        // Top-left corner
        if (dx < radius && dy < radius) {
          const dist = Math.sqrt((dx - radius) ** 2 + (dy - radius) ** 2)
          inside = dist <= radius
        }
        // Top-right corner
        else if (dx >= width - radius && dy < radius) {
          const dist = Math.sqrt((dx - (width - radius)) ** 2 + (dy - radius) ** 2)
          inside = dist <= radius
        }
        // Bottom-left corner
        else if (dx < radius && dy >= height - radius) {
          const dist = Math.sqrt((dx - radius) ** 2 + (dy - (height - radius)) ** 2)
          inside = dist <= radius
        }
        // Bottom-right corner
        else if (dx >= width - radius && dy >= height - radius) {
          const dist = Math.sqrt((dx - (width - radius)) ** 2 + (dy - (height - radius)) ** 2)
          inside = dist <= radius
        }

        if (inside) {
          this.setPixel(px, py, color)
        }
      }
    }
  }

  /**
   * Draw horizontal line
   */
  drawHLine(x: number, y: number, length: number, color: RGBA): void {
    if (color.a === 0)
      return

    const yi = Math.floor(y)
    const x1 = Math.max(0, Math.floor(x))
    const x2 = Math.min(this.width, Math.ceil(x + length))

    for (let px = x1; px < x2; px++) {
      this.setPixel(px, yi, color)
    }
  }

  /**
   * Draw vertical line
   */
  drawVLine(x: number, y: number, length: number, color: RGBA): void {
    if (color.a === 0)
      return

    const xi = Math.floor(x)
    const y1 = Math.max(0, Math.floor(y))
    const y2 = Math.min(this.height, Math.ceil(y + length))

    for (let py = y1; py < y2; py++) {
      this.setPixel(xi, py, color)
    }
  }
}

/**
 * Simple bitmap font data for basic text rendering
 * 5x7 pixel font for ASCII 32-126
 */
const FONT_WIDTH = 5
const FONT_HEIGHT = 7

// Simple 5x7 bitmap font (space through tilde)
// Each character is stored as 7 rows of 5-bit values
const FONT_DATA: Record<string, number[]> = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '!': [4, 4, 4, 4, 0, 0, 4],
  '"': [10, 10, 10, 0, 0, 0, 0],
  '#': [10, 10, 31, 10, 31, 10, 10],
  '$': [4, 15, 20, 14, 5, 30, 4],
  '%': [24, 25, 2, 4, 8, 19, 3],
  '&': [8, 20, 20, 8, 21, 18, 13],
  '\'': [4, 4, 4, 0, 0, 0, 0],
  '(': [2, 4, 8, 8, 8, 4, 2],
  ')': [8, 4, 2, 2, 2, 4, 8],
  '*': [0, 4, 21, 14, 21, 4, 0],
  '+': [0, 4, 4, 31, 4, 4, 0],
  ',': [0, 0, 0, 0, 0, 4, 8],
  '-': [0, 0, 0, 31, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0, 4],
  '/': [0, 1, 2, 4, 8, 16, 0],
  '0': [14, 17, 19, 21, 25, 17, 14],
  '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14],
  '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  ':': [0, 0, 4, 0, 0, 4, 0],
  ';': [0, 0, 4, 0, 0, 4, 8],
  '<': [2, 4, 8, 16, 8, 4, 2],
  '=': [0, 0, 31, 0, 31, 0, 0],
  '>': [8, 4, 2, 1, 2, 4, 8],
  '?': [14, 17, 1, 2, 4, 0, 4],
  '@': [14, 17, 23, 21, 23, 16, 14],
  'A': [14, 17, 17, 31, 17, 17, 17],
  'B': [30, 17, 17, 30, 17, 17, 30],
  'C': [14, 17, 16, 16, 16, 17, 14],
  'D': [30, 17, 17, 17, 17, 17, 30],
  'E': [31, 16, 16, 30, 16, 16, 31],
  'F': [31, 16, 16, 30, 16, 16, 16],
  'G': [14, 17, 16, 23, 17, 17, 15],
  'H': [17, 17, 17, 31, 17, 17, 17],
  'I': [14, 4, 4, 4, 4, 4, 14],
  'J': [7, 2, 2, 2, 2, 18, 12],
  'K': [17, 18, 20, 24, 20, 18, 17],
  'L': [16, 16, 16, 16, 16, 16, 31],
  'M': [17, 27, 21, 21, 17, 17, 17],
  'N': [17, 17, 25, 21, 19, 17, 17],
  'O': [14, 17, 17, 17, 17, 17, 14],
  'P': [30, 17, 17, 30, 16, 16, 16],
  'Q': [14, 17, 17, 17, 21, 18, 13],
  'R': [30, 17, 17, 30, 20, 18, 17],
  'S': [15, 16, 16, 14, 1, 1, 30],
  'T': [31, 4, 4, 4, 4, 4, 4],
  'U': [17, 17, 17, 17, 17, 17, 14],
  'V': [17, 17, 17, 17, 17, 10, 4],
  'W': [17, 17, 17, 21, 21, 21, 10],
  'X': [17, 17, 10, 4, 10, 17, 17],
  'Y': [17, 17, 10, 4, 4, 4, 4],
  'Z': [31, 1, 2, 4, 8, 16, 31],
  '[': [14, 8, 8, 8, 8, 8, 14],
  '\\': [0, 16, 8, 4, 2, 1, 0],
  ']': [14, 2, 2, 2, 2, 2, 14],
  '^': [4, 10, 17, 0, 0, 0, 0],
  '_': [0, 0, 0, 0, 0, 0, 31],
  '`': [8, 4, 2, 0, 0, 0, 0],
  'a': [0, 0, 14, 1, 15, 17, 15],
  'b': [16, 16, 22, 25, 17, 17, 30],
  'c': [0, 0, 14, 16, 16, 17, 14],
  'd': [1, 1, 13, 19, 17, 17, 15],
  'e': [0, 0, 14, 17, 31, 16, 14],
  'f': [6, 9, 8, 28, 8, 8, 8],
  'g': [0, 15, 17, 17, 15, 1, 14],
  'h': [16, 16, 22, 25, 17, 17, 17],
  'i': [4, 0, 12, 4, 4, 4, 14],
  'j': [2, 0, 6, 2, 2, 18, 12],
  'k': [16, 16, 18, 20, 24, 20, 18],
  'l': [12, 4, 4, 4, 4, 4, 14],
  'm': [0, 0, 26, 21, 21, 17, 17],
  'n': [0, 0, 22, 25, 17, 17, 17],
  'o': [0, 0, 14, 17, 17, 17, 14],
  'p': [0, 0, 30, 17, 30, 16, 16],
  'q': [0, 0, 13, 19, 15, 1, 1],
  'r': [0, 0, 22, 25, 16, 16, 16],
  's': [0, 0, 14, 16, 14, 1, 30],
  't': [8, 8, 28, 8, 8, 9, 6],
  'u': [0, 0, 17, 17, 17, 19, 13],
  'v': [0, 0, 17, 17, 17, 10, 4],
  'w': [0, 0, 17, 17, 21, 21, 10],
  'x': [0, 0, 17, 10, 4, 10, 17],
  'y': [0, 0, 17, 17, 15, 1, 14],
  'z': [0, 0, 31, 2, 4, 8, 31],
  '{': [2, 4, 4, 8, 4, 4, 2],
  '|': [4, 4, 4, 4, 4, 4, 4],
  '}': [8, 4, 4, 2, 4, 4, 8],
  '~': [0, 0, 8, 21, 2, 0, 0],
}

/**
 * Draw a character at position
 */
function drawChar(buffer: PixelBuffer, char: string, x: number, y: number, color: RGBA, scale: number): number {
  const data = FONT_DATA[char] || FONT_DATA['?'] || [0, 0, 0, 0, 0, 0, 0]

  for (let row = 0; row < FONT_HEIGHT; row++) {
    const rowData = data[row]
    for (let col = 0; col < FONT_WIDTH; col++) {
      if ((rowData >> (FONT_WIDTH - 1 - col)) & 1) {
        // Fill scaled pixel
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            buffer.setPixel(
              Math.floor(x + col * scale + sx),
              Math.floor(y + row * scale + sy),
              color,
            )
          }
        }
      }
    }
  }

  return (FONT_WIDTH + 1) * scale // Return character width + spacing
}

/**
 * Draw text string
 */
function drawText(
  buffer: PixelBuffer,
  text: string,
  x: number,
  y: number,
  color: RGBA,
  fontSize: number,
  maxWidth: number,
): void {
  // Calculate scale based on font size (base font is 7px high)
  const scale = Math.max(1, Math.round(fontSize / 7))

  let currentX = x
  let currentY = y

  for (const char of text) {
    if (char === '\n') {
      currentX = x
      currentY += FONT_HEIGHT * scale + 2 * scale
      continue
    }

    // Word wrap
    if (currentX + FONT_WIDTH * scale > x + maxWidth) {
      currentX = x
      currentY += FONT_HEIGHT * scale + 2 * scale
    }

    const charWidth = drawChar(buffer, char.toUpperCase(), currentX, currentY, color, scale)
    currentX += charWidth
  }
}

/**
 * Render a layout node tree to pixel buffer
 */
export function renderLayoutTree(
  layout: LayoutNode,
  buffer: PixelBuffer,
  clipX: number = 0,
  clipY: number = 0,
  clipWidth: number = buffer.width,
  clipHeight: number = buffer.height,
): void {
  if (!layout.visible)
    return

  const { box, styles, text, children } = layout

  // Apply opacity
  const applyOpacity = (color: RGBA): RGBA => {
    if (styles.opacity >= 1)
      return color
    return {
      ...color,
      a: Math.round(color.a * styles.opacity),
    }
  }

  // Draw background
  if (styles.backgroundColor.a > 0) {
    const bgColor = applyOpacity(styles.backgroundColor)
    if (styles.borderRadius > 0) {
      buffer.fillRoundedRect(box.x, box.y, box.width, box.height, styles.borderRadius, bgColor)
    }
    else {
      buffer.fillRect(box.x, box.y, box.width, box.height, bgColor)
    }
  }

  // Draw borders
  if (styles.borderTopWidth > 0) {
    buffer.fillRect(box.x, box.y, box.width, styles.borderTopWidth, applyOpacity(styles.borderTopColor))
  }
  if (styles.borderBottomWidth > 0) {
    buffer.fillRect(box.x, box.y + box.height - styles.borderBottomWidth, box.width, styles.borderBottomWidth, applyOpacity(styles.borderBottomColor))
  }
  if (styles.borderLeftWidth > 0) {
    buffer.fillRect(box.x, box.y, styles.borderLeftWidth, box.height, applyOpacity(styles.borderLeftColor))
  }
  if (styles.borderRightWidth > 0) {
    buffer.fillRect(box.x + box.width - styles.borderRightWidth, box.y, styles.borderRightWidth, box.height, applyOpacity(styles.borderRightColor))
  }

  // Draw text
  if (text) {
    const textX = box.x + styles.borderLeftWidth + styles.paddingLeft
    const textY = box.y + styles.borderTopWidth + styles.paddingTop
    const textWidth = box.width - styles.borderLeftWidth - styles.borderRightWidth - styles.paddingLeft - styles.paddingRight

    drawText(buffer, text, textX, textY, applyOpacity(styles.color), styles.fontSize, textWidth)
  }

  // Render children
  for (const child of children) {
    renderLayoutTree(child, buffer, clipX, clipY, clipWidth, clipHeight)
  }
}

/**
 * Render HTML to pixel buffer
 * Note: Import computeLayout from './layout' separately to avoid circular deps
 */
export function renderHtmlToPixels(
  html: string,
  width: number,
  height: number,
  backgroundColor: RGBA = { r: 255, g: 255, b: 255, a: 255 },
  css: string = '',
): PixelBuffer {
  // Dynamic import to avoid circular dependency
  // eslint-disable-next-line ts/no-require-imports
  const { computeLayout } = require('./layout') as typeof import('./layout')

  const buffer = new PixelBuffer(width, height)
  buffer.fill(backgroundColor)

  const layout = computeLayout(html, css, width, height)
  renderLayoutTree(layout, buffer)

  return buffer
}
