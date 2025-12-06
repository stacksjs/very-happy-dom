/**
 * Screenshot Capture
 * Captures screenshots from BrowserPage or HTML content
 */

import { Buffer } from 'node:buffer'
import type { BrowserPage } from '../browser/BrowserPage'
import { crc32, deflate, inflate } from './deflate'
import { HtmlRenderer, type RenderOptions, type RenderResult } from './renderer'

/**
 * Screenshot options
 */
export interface ScreenshotOptions extends RenderOptions {
  /** Capture full scrollable page */
  fullPage?: boolean
  /** Clip region */
  clip?: {
    x: number
    y: number
    width: number
    height: number
  }
  /** Encoding for output */
  encoding?: 'buffer' | 'base64' | 'binary'
  /** Path to save screenshot */
  path?: string
  /** Omit background (transparent) */
  omitBackground?: boolean
}

/**
 * PNG decoder for clipping operations
 */
interface DecodedPng {
  pixels: Uint8Array
  width: number
  height: number
}

/**
 * Screenshot capture class
 */
export class ScreenshotCapture {
  private renderer: HtmlRenderer

  constructor() {
    this.renderer = new HtmlRenderer()
  }

  /**
   * Capture screenshot from a BrowserPage
   */
  async capturePage(
    page: BrowserPage,
    options: ScreenshotOptions = {},
  ): Promise<Buffer | string> {
    const html = page.content
    const viewport = page.viewport

    const renderOptions: RenderOptions = {
      width: options.width || viewport.width,
      height: options.height || viewport.height,
      deviceScaleFactor: options.deviceScaleFactor || 1,
      backgroundColor: options.omitBackground ? undefined : options.backgroundColor,
      transparent: options.omitBackground,
      format: options.format || 'png',
      quality: options.quality,
      css: options.css,
    }

    const result = await this.renderer.render(html, renderOptions)

    return this.processResult(result, options)
  }

  /**
   * Capture screenshot from HTML string
   */
  async captureHtml(
    html: string,
    options: ScreenshotOptions = {},
  ): Promise<Buffer | string> {
    const result = await this.renderer.render(html, options)
    return this.processResult(result, options)
  }

  /**
   * Capture screenshot from URL
   */
  async captureUrl(
    url: string,
    options: ScreenshotOptions = {},
  ): Promise<Buffer | string> {
    const result = await this.renderer.renderUrl(url, options)
    return this.processResult(result, options)
  }

  /**
   * Process render result based on options
   */
  private async processResult(
    result: RenderResult,
    options: ScreenshotOptions,
  ): Promise<Buffer | string> {
    let data = result.data

    // Apply clip if specified
    if (options.clip) {
      data = await this.clipImage(data, result.width, result.height, options.clip)
    }

    // Save to file if path specified
    if (options.path) {
      await Bun.write(options.path, data)
    }

    // Return in requested encoding
    if (options.encoding === 'base64') {
      return data.toString('base64')
    }

    return data
  }

  /**
   * Decode a PNG to pixel data
   */
  private decodePng(data: Buffer): DecodedPng {
    // Check PNG signature
    const signature = [137, 80, 78, 71, 13, 10, 26, 10]
    for (let i = 0; i < 8; i++) {
      if (data[i] !== signature[i]) {
        throw new Error('Invalid PNG signature')
      }
    }

    let offset = 8
    let width = 0
    let height = 0
    let bitDepth = 0
    let colorType = 0
    const compressedData: Buffer[] = []

    // Read chunks
    while (offset < data.length) {
      const length = data.readUInt32BE(offset)
      const type = data.slice(offset + 4, offset + 8).toString('ascii')
      const chunkData = data.slice(offset + 8, offset + 8 + length)

      if (type === 'IHDR') {
        width = chunkData.readUInt32BE(0)
        height = chunkData.readUInt32BE(4)
        bitDepth = chunkData[8]
        colorType = chunkData[9]
      }
      else if (type === 'IDAT') {
        compressedData.push(chunkData)
      }
      else if (type === 'IEND') {
        break
      }

      offset += 12 + length
    }

    // Concatenate and decompress IDAT data
    const compressed = Buffer.concat(compressedData)
    const decompressed = inflate(new Uint8Array(compressed))

    // Unfilter rows
    const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 4
    const rowSize = width * bytesPerPixel
    const pixels = new Uint8Array(width * height * 4)

    let srcOffset = 0
    let prevRow: Uint8Array | null = null

    for (let y = 0; y < height; y++) {
      const filterType = decompressed[srcOffset++]
      const row = new Uint8Array(rowSize)

      for (let i = 0; i < rowSize; i++) {
        row[i] = decompressed[srcOffset + i]
      }
      srcOffset += rowSize

      // Apply reverse filter
      const unfiltered = this.unfilterRow(filterType, row, prevRow, bytesPerPixel)

      // Copy to output (convert RGB to RGBA if needed)
      for (let x = 0; x < width; x++) {
        const dstOffset = (y * width + x) * 4
        const srcPixelOffset = x * bytesPerPixel

        pixels[dstOffset] = unfiltered[srcPixelOffset]
        pixels[dstOffset + 1] = unfiltered[srcPixelOffset + 1]
        pixels[dstOffset + 2] = unfiltered[srcPixelOffset + 2]
        pixels[dstOffset + 3] = bytesPerPixel === 4 ? unfiltered[srcPixelOffset + 3] : 255
      }

      prevRow = unfiltered
    }

    return { pixels, width, height }
  }

  /**
   * Unfilter a PNG row
   */
  private unfilterRow(
    filterType: number,
    row: Uint8Array,
    prevRow: Uint8Array | null,
    bytesPerPixel: number,
  ): Uint8Array {
    const result = new Uint8Array(row.length)

    for (let i = 0; i < row.length; i++) {
      const a = i >= bytesPerPixel ? result[i - bytesPerPixel] : 0
      const b = prevRow ? prevRow[i] : 0
      const c = (i >= bytesPerPixel && prevRow) ? prevRow[i - bytesPerPixel] : 0

      let value = row[i]

      switch (filterType) {
        case 0: // None
          break
        case 1: // Sub
          value = (value + a) & 0xFF
          break
        case 2: // Up
          value = (value + b) & 0xFF
          break
        case 3: // Average
          value = (value + Math.floor((a + b) / 2)) & 0xFF
          break
        case 4: // Paeth
          value = (value + this.paethPredictor(a, b, c)) & 0xFF
          break
      }

      result[i] = value
    }

    return result
  }

  /**
   * Paeth predictor for PNG filtering
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
   * Encode pixels to PNG
   */
  private encodePng(pixels: Uint8Array, width: number, height: number): Buffer {
    // PNG signature
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

    // IHDR chunk
    const ihdrData = new Uint8Array(13)
    const ihdrView = new DataView(ihdrData.buffer)
    ihdrView.setUint32(0, width, false)
    ihdrView.setUint32(4, height, false)
    ihdrData[8] = 8 // bit depth
    ihdrData[9] = 6 // color type (RGBA)
    ihdrData[10] = 0 // compression
    ihdrData[11] = 0 // filter
    ihdrData[12] = 0 // interlace
    const ihdr = this.createChunk('IHDR', ihdrData)

    // Filter and compress image data
    const rowSize = width * 4 + 1
    const filtered = new Uint8Array(height * rowSize)

    for (let y = 0; y < height; y++) {
      filtered[y * rowSize] = 0 // No filter
      filtered.set(
        pixels.subarray(y * width * 4, (y + 1) * width * 4),
        y * rowSize + 1,
      )
    }

    const compressed = deflate(filtered)
    const idat = this.createChunk('IDAT', compressed)

    // IEND chunk
    const iend = this.createChunk('IEND', new Uint8Array(0))

    // Combine all
    const png = new Uint8Array(signature.length + ihdr.length + idat.length + iend.length)
    let offset = 0
    png.set(signature, offset)
    offset += signature.length
    png.set(ihdr, offset)
    offset += ihdr.length
    png.set(idat, offset)
    offset += idat.length
    png.set(iend, offset)

    return Buffer.from(png)
  }

  /**
   * Create a PNG chunk with CRC
   */
  private createChunk(type: string, data: Uint8Array): Uint8Array {
    const chunk = new Uint8Array(4 + 4 + data.length + 4)
    const view = new DataView(chunk.buffer)

    view.setUint32(0, data.length, false)
    for (let i = 0; i < 4; i++) {
      chunk[4 + i] = type.charCodeAt(i)
    }
    chunk.set(data, 8)

    const crcValue = crc32(chunk.subarray(4, 8 + data.length))
    view.setUint32(8 + data.length, crcValue, false)

    return chunk
  }

  /**
   * Clip image to specified region
   */
  private async clipImage(
    data: Buffer,
    width: number,
    height: number,
    clip: { x: number, y: number, width: number, height: number },
  ): Promise<Buffer> {
    // Decode PNG
    const decoded = this.decodePng(data)

    // Validate clip region
    const clipX = Math.max(0, Math.floor(clip.x))
    const clipY = Math.max(0, Math.floor(clip.y))
    const clipWidth = Math.min(clip.width, decoded.width - clipX)
    const clipHeight = Math.min(clip.height, decoded.height - clipY)

    if (clipWidth <= 0 || clipHeight <= 0) {
      throw new Error('Invalid clip region')
    }

    // Create clipped pixel buffer
    const clippedPixels = new Uint8Array(clipWidth * clipHeight * 4)

    for (let y = 0; y < clipHeight; y++) {
      for (let x = 0; x < clipWidth; x++) {
        const srcOffset = ((clipY + y) * decoded.width + (clipX + x)) * 4
        const dstOffset = (y * clipWidth + x) * 4

        clippedPixels[dstOffset] = decoded.pixels[srcOffset]
        clippedPixels[dstOffset + 1] = decoded.pixels[srcOffset + 1]
        clippedPixels[dstOffset + 2] = decoded.pixels[srcOffset + 2]
        clippedPixels[dstOffset + 3] = decoded.pixels[srcOffset + 3]
      }
    }

    // Encode back to PNG
    return this.encodePng(clippedPixels, clipWidth, clipHeight)
  }
}

/**
 * Convenience function to capture screenshot from HTML
 */
export async function captureHtml(
  html: string,
  options: ScreenshotOptions = {},
): Promise<Buffer | string> {
  const capture = new ScreenshotCapture()
  return capture.captureHtml(html, options)
}

/**
 * Convenience function to capture screenshot from URL
 */
export async function captureUrl(
  url: string,
  options: ScreenshotOptions = {},
): Promise<Buffer | string> {
  const capture = new ScreenshotCapture()
  return capture.captureUrl(url, options)
}
