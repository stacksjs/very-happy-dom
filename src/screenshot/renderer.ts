/**
 * HTML Renderer
 * Renders HTML content to image buffers using a pure JS rendering pipeline
 * This provides a zero-dependency way to render HTML to images
 */

import { Buffer } from 'node:buffer'
import { parseColor, type RGBA } from './css-utils'
import { crc32, deflate } from './deflate'
import { computeLayout } from './layout'
import { PixelBuffer, renderLayoutTree } from './pixel-renderer'
import { encodeWebP } from './webp'

/**
 * Render options
 */
export interface RenderOptions {
  /** Width of the output image */
  width?: number
  /** Height of the output image */
  height?: number
  /** Device pixel ratio for high-DPI rendering */
  deviceScaleFactor?: number
  /** Background color (default: white) */
  backgroundColor?: string
  /** Whether to render with transparent background */
  transparent?: boolean
  /** Output format */
  format?: 'png' | 'jpeg' | 'webp' | 'svg'
  /** Quality for jpeg/webp (0-100) */
  quality?: number
  /** CSS to inject */
  css?: string
  /** Base URL for resolving relative URLs */
  baseUrl?: string
  /** Fonts to preload */
  fonts?: Array<{ family: string, url: string, weight?: string, style?: string }>
}

/**
 * Render result
 */
export interface RenderResult {
  /** Image data as Buffer */
  data: Buffer
  /** Width of rendered image */
  width: number
  /** Height of rendered image */
  height: number
  /** Format of the image */
  format: string
  /** Render duration in ms */
  duration: number
}

/**
 * HTML Renderer class
 * Converts HTML to images using pure JS rendering
 */
export class HtmlRenderer {
  private defaultOptions: RenderOptions = {
    width: 800,
    height: 600,
    deviceScaleFactor: 1,
    backgroundColor: '#ffffff',
    transparent: false,
    format: 'png',
    quality: 90,
  }

  /**
   * Render HTML string to image
   */
  async render(html: string, options: RenderOptions = {}): Promise<RenderResult> {
    const startTime = performance.now()
    const opts = { ...this.defaultOptions, ...options }

    const width = Math.round(opts.width! * opts.deviceScaleFactor!)
    const height = Math.round(opts.height! * opts.deviceScaleFactor!)

    if (opts.format === 'svg') {
      const svg = this.generateSvg(html, opts.width!, opts.height!, opts)
      return {
        data: Buffer.from(svg),
        width: opts.width!,
        height: opts.height!,
        format: 'svg',
        duration: performance.now() - startTime,
      }
    }

    // Parse background color
    const bgColor: RGBA = opts.transparent
      ? { r: 0, g: 0, b: 0, a: 0 }
      : parseColor(opts.backgroundColor)

    // Create pixel buffer
    const pixelBuffer = new PixelBuffer(width, height)
    pixelBuffer.fill(bgColor)

    // Compute layout and render
    const css = opts.css || ''
    const layout = computeLayout(html, css, width, height)
    renderLayoutTree(layout, pixelBuffer)

    // Encode to requested format
    let imageData: Uint8Array

    if (opts.format === 'webp') {
      imageData = encodeWebP(pixelBuffer.data, width, height, {
        lossless: true,
        quality: opts.quality,
      })
    }
    else {
      // Default to PNG
      imageData = this.encodePng(pixelBuffer.data, width, height)
    }

    return {
      data: Buffer.from(imageData),
      width,
      height,
      format: opts.format!,
      duration: performance.now() - startTime,
    }
  }

  /**
   * Render a URL to image (fetches content first)
   */
  async renderUrl(url: string, options: RenderOptions = {}): Promise<RenderResult> {
    const response = await fetch(url)
    const html = await response.text()
    return this.render(html, { ...options, baseUrl: url })
  }

  /**
   * Generate SVG with foreignObject containing HTML
   */
  private generateSvg(
    html: string,
    width: number,
    height: number,
    options: RenderOptions,
  ): string {
    const backgroundColor = options.transparent ? 'transparent' : (options.backgroundColor || '#ffffff')
    const baseTag = options.baseUrl ? `<base href="${this.escapeXml(options.baseUrl)}">` : ''
    const customCss = options.css ? `<style>${options.css}</style>` : ''

    // Font face declarations
    const fontFaces = (options.fonts || []).map(font => `
      @font-face {
        font-family: '${font.family}';
        src: url('${font.url}');
        ${font.weight ? `font-weight: ${font.weight};` : ''}
        ${font.style ? `font-style: ${font.style};` : ''}
      }
    `).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <style type="text/css">
      ${fontFaces}
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${backgroundColor}"/>
  <foreignObject width="100%" height="100%">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        ${baseTag}
        <meta charset="UTF-8"/>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
        </style>
        ${customCss}
      </head>
      <body>
        ${html}
      </body>
    </html>
  </foreignObject>
</svg>`
  }

  /**
   * Pure JavaScript PNG encoder
   * Implements a complete PNG encoder without external dependencies
   */
  private encodePng(pixels: Uint8Array, width: number, height: number): Uint8Array {
    // PNG signature
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

    // IHDR chunk (image header)
    const ihdr = this.createIhdrChunk(width, height)

    // IDAT chunk (image data)
    const idat = this.createIdatChunk(pixels, width, height)

    // IEND chunk (image end)
    const iend = this.createIendChunk()

    // Combine all chunks
    const png = new Uint8Array(
      signature.length + ihdr.length + idat.length + iend.length,
    )
    let offset = 0

    png.set(signature, offset)
    offset += signature.length

    png.set(ihdr, offset)
    offset += ihdr.length

    png.set(idat, offset)
    offset += idat.length

    png.set(iend, offset)

    return png
  }

  /**
   * Create IHDR chunk
   */
  private createIhdrChunk(width: number, height: number): Uint8Array {
    const data = new Uint8Array(13)
    const view = new DataView(data.buffer)

    view.setUint32(0, width, false) // Width
    view.setUint32(4, height, false) // Height
    data[8] = 8 // Bit depth
    data[9] = 6 // Color type (RGBA)
    data[10] = 0 // Compression method
    data[11] = 0 // Filter method
    data[12] = 0 // Interlace method

    return this.createChunk('IHDR', data)
  }

  /**
   * Create IDAT chunk with compressed image data
   */
  private createIdatChunk(pixels: Uint8Array, width: number, height: number): Uint8Array {
    // Add filter byte (0 = None) to each row
    // Use filtering for better compression
    const rowSize = width * 4
    const filtered = new Uint8Array(height * (rowSize + 1))

    for (let y = 0; y < height; y++) {
      const filterType = this.selectFilter(pixels, y, width, height)
      const rowOffset = y * (rowSize + 1)
      filtered[rowOffset] = filterType

      const srcOffset = y * rowSize

      switch (filterType) {
        case 0: // None
          filtered.set(pixels.subarray(srcOffset, srcOffset + rowSize), rowOffset + 1)
          break

        case 1: // Sub
          for (let x = 0; x < rowSize; x++) {
            const left = x >= 4 ? pixels[srcOffset + x - 4] : 0
            filtered[rowOffset + 1 + x] = (pixels[srcOffset + x] - left) & 0xFF
          }
          break

        case 2: // Up
          for (let x = 0; x < rowSize; x++) {
            const up = y > 0 ? pixels[srcOffset - rowSize + x] : 0
            filtered[rowOffset + 1 + x] = (pixels[srcOffset + x] - up) & 0xFF
          }
          break

        case 3: // Average
          for (let x = 0; x < rowSize; x++) {
            const left = x >= 4 ? pixels[srcOffset + x - 4] : 0
            const up = y > 0 ? pixels[srcOffset - rowSize + x] : 0
            filtered[rowOffset + 1 + x] = (pixels[srcOffset + x] - Math.floor((left + up) / 2)) & 0xFF
          }
          break

        case 4: // Paeth
          for (let x = 0; x < rowSize; x++) {
            const left = x >= 4 ? pixels[srcOffset + x - 4] : 0
            const up = y > 0 ? pixels[srcOffset - rowSize + x] : 0
            const upLeft = (y > 0 && x >= 4) ? pixels[srcOffset - rowSize + x - 4] : 0
            filtered[rowOffset + 1 + x] = (pixels[srcOffset + x] - this.paethPredictor(left, up, upLeft)) & 0xFF
          }
          break
      }
    }

    // Compress using deflate
    const compressed = deflate(filtered)

    return this.createChunk('IDAT', compressed)
  }

  /**
   * Select best filter for a row
   */
  private selectFilter(pixels: Uint8Array, y: number, width: number, height: number): number {
    // For simplicity, use heuristic: None for solid colors, Sub for gradients
    const rowSize = width * 4
    const srcOffset = y * rowSize

    // Check if row is uniform
    let isUniform = true
    const firstPixel = [
      pixels[srcOffset],
      pixels[srcOffset + 1],
      pixels[srcOffset + 2],
      pixels[srcOffset + 3],
    ]

    for (let x = 4; x < rowSize && isUniform; x += 4) {
      if (pixels[srcOffset + x] !== firstPixel[0]
        || pixels[srcOffset + x + 1] !== firstPixel[1]
        || pixels[srcOffset + x + 2] !== firstPixel[2]
        || pixels[srcOffset + x + 3] !== firstPixel[3]) {
        isUniform = false
      }
    }

    if (isUniform) {
      return 0 // None filter for uniform rows
    }

    // For non-uniform rows, try different filters and pick best
    // Simple heuristic: use Sub for horizontal gradients, Up for vertical
    if (y === 0) {
      return 1 // Sub for first row
    }

    // Check if similar to previous row
    const prevOffset = (y - 1) * rowSize
    let diffFromPrev = 0
    let diffFromLeft = 0

    for (let x = 0; x < Math.min(rowSize, 32); x++) {
      diffFromPrev += Math.abs(pixels[srcOffset + x] - pixels[prevOffset + x])
      if (x >= 4) {
        diffFromLeft += Math.abs(pixels[srcOffset + x] - pixels[srcOffset + x - 4])
      }
    }

    return diffFromPrev < diffFromLeft ? 2 : 1 // Up or Sub
  }

  /**
   * Paeth predictor
   */
  private paethPredictor(a: number, b: number, c: number): number {
    const p = a + b - c
    const pa = Math.abs(p - a)
    const pb = Math.abs(p - b)
    const pc = Math.abs(p - c)

    if (pa <= pb && pa <= pc)
      return a
    if (pb <= pc)
      return b
    return c
  }

  /**
   * Create IEND chunk
   */
  private createIendChunk(): Uint8Array {
    return this.createChunk('IEND', new Uint8Array(0))
  }

  /**
   * Create a PNG chunk with CRC
   */
  private createChunk(type: string, data: Uint8Array): Uint8Array {
    const chunk = new Uint8Array(4 + 4 + data.length + 4)
    const view = new DataView(chunk.buffer)

    // Length
    view.setUint32(0, data.length, false)

    // Type
    for (let i = 0; i < 4; i++) {
      chunk[4 + i] = type.charCodeAt(i)
    }

    // Data
    chunk.set(data, 8)

    // CRC (calculated over type + data)
    const crcData = chunk.subarray(4, 8 + data.length)
    const crcValue = crc32(crcData)
    view.setUint32(8 + data.length, crcValue, false)

    return chunk
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}

/**
 * Create a default renderer instance
 */
export function createRenderer(): HtmlRenderer {
  return new HtmlRenderer()
}
