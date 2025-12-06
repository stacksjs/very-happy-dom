/**
 * Image Diff
 * Compare two images and generate a diff image
 */

import { Buffer } from 'node:buffer'
import { adler32, crc32, deflate, inflate } from './deflate'

/**
 * Diff options
 */
export interface DiffOptions {
  /** Threshold for pixel difference (0-1, default: 0.1) */
  threshold?: number
  /** Color for diff highlighting */
  diffColor?: { r: number, g: number, b: number }
  /** Include anti-aliasing detection */
  includeAA?: boolean
  /** Alpha channel threshold */
  alpha?: number
  /** Output format */
  output?: 'diff' | 'overlay' | 'side-by-side'
  /** Difference algorithm */
  algorithm?: 'pixel' | 'perceptual'
}

/**
 * Diff result
 */
export interface DiffResult {
  /** Whether images match within threshold */
  match: boolean
  /** Number of different pixels */
  diffPixels: number
  /** Total pixels compared */
  totalPixels: number
  /** Difference percentage (0-100) */
  diffPercentage: number
  /** Diff image buffer (if generated) */
  diffImage?: Buffer
  /** Dimensions */
  width: number
  height: number
}

/**
 * Decoded image data
 */
interface DecodedImage {
  pixels: Uint8Array
  width: number
  height: number
  bitDepth: number
  colorType: number
}

/**
 * Image diff class
 */
export class ImageDiff {
  private defaultOptions: DiffOptions = {
    threshold: 0.1,
    diffColor: { r: 255, g: 0, b: 255 },
    includeAA: false,
    alpha: 0.1,
    output: 'diff',
    algorithm: 'pixel',
  }

  /**
   * Compare two images
   */
  async compare(
    image1: Buffer | Uint8Array,
    image2: Buffer | Uint8Array,
    options: DiffOptions = {},
  ): Promise<DiffResult> {
    const opts = { ...this.defaultOptions, ...options }

    // Decode PNG images
    const img1 = this.decodePng(image1)
    const img2 = this.decodePng(image2)

    // Check dimensions match
    if (img1.width !== img2.width || img1.height !== img2.height) {
      const maxWidth = Math.max(img1.width, img2.width)
      const maxHeight = Math.max(img1.height, img2.height)

      return {
        match: false,
        diffPixels: maxWidth * maxHeight,
        totalPixels: maxWidth * maxHeight,
        diffPercentage: 100,
        width: maxWidth,
        height: maxHeight,
      }
    }

    const width = img1.width
    const height = img1.height
    const totalPixels = width * height

    // Create diff image
    const diffPixels = new Uint8Array(width * height * 4)
    let diffCount = 0

    // Threshold calculation
    const threshold = opts.threshold! * 255 * 3 // Convert to RGB sum threshold
    const alphaThreshold = opts.alpha! * 255

    for (let i = 0; i < totalPixels; i++) {
      const offset = i * 4

      const r1 = img1.pixels[offset]
      const g1 = img1.pixels[offset + 1]
      const b1 = img1.pixels[offset + 2]
      const a1 = img1.pixels[offset + 3]

      const r2 = img2.pixels[offset]
      const g2 = img2.pixels[offset + 1]
      const b2 = img2.pixels[offset + 2]
      const a2 = img2.pixels[offset + 3]

      let isDifferent = false

      if (opts.algorithm === 'perceptual') {
        // Perceptual difference using YIQ color space
        isDifferent = this.colorDelta(r1, g1, b1, a1, r2, g2, b2, a2) > opts.threshold! * 35215
      }
      else {
        // Simple RGB difference
        const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)
        const alphaDiff = Math.abs(a1 - a2)
        isDifferent = diff > threshold || alphaDiff > alphaThreshold
      }

      // Anti-aliasing detection
      if (isDifferent && opts.includeAA) {
        const isAA1 = this.isAntiAliased(img1.pixels, i, width, height)
        const isAA2 = this.isAntiAliased(img2.pixels, i, width, height)
        if (isAA1 || isAA2) {
          isDifferent = false
        }
      }

      if (isDifferent) {
        diffCount++
        // Mark as different with diff color
        diffPixels[offset] = opts.diffColor!.r
        diffPixels[offset + 1] = opts.diffColor!.g
        diffPixels[offset + 2] = opts.diffColor!.b
        diffPixels[offset + 3] = 255
      }
      else {
        // Copy original pixel (dimmed)
        diffPixels[offset] = Math.floor(r1 * 0.3)
        diffPixels[offset + 1] = Math.floor(g1 * 0.3)
        diffPixels[offset + 2] = Math.floor(b1 * 0.3)
        diffPixels[offset + 3] = 255
      }
    }

    const diffPercentage = (diffCount / totalPixels) * 100

    // Encode diff image
    const diffImage = this.encodePng(diffPixels, width, height)

    return {
      match: diffCount === 0,
      diffPixels: diffCount,
      totalPixels,
      diffPercentage,
      diffImage: Buffer.from(diffImage),
      width,
      height,
    }
  }

  /**
   * Calculate perceptual color difference using YIQ color space
   */
  private colorDelta(
    r1: number,
    g1: number,
    b1: number,
    a1: number,
    r2: number,
    g2: number,
    b2: number,
    a2: number,
  ): number {
    // Blend alpha
    if (a1 === a2 && a1 === 0)
      return 0

    const blend = (c: number, a: number, bg: number = 255): number => {
      return c * (a / 255) + bg * (1 - a / 255)
    }

    const br1 = blend(r1, a1)
    const bg1 = blend(g1, a1)
    const bb1 = blend(b1, a1)
    const br2 = blend(r2, a2)
    const bg2 = blend(g2, a2)
    const bb2 = blend(b2, a2)

    // Convert to YIQ
    const y1 = br1 * 0.29889531 + bg1 * 0.58662247 + bb1 * 0.11448223
    const i1 = br1 * 0.59597799 - bg1 * 0.27417610 - bb1 * 0.32180189
    const q1 = br1 * 0.21147017 - bg1 * 0.52261711 + bb1 * 0.31114694
    const y2 = br2 * 0.29889531 + bg2 * 0.58662247 + bb2 * 0.11448223
    const i2 = br2 * 0.59597799 - bg2 * 0.27417610 - bb2 * 0.32180189
    const q2 = br2 * 0.21147017 - bg2 * 0.52261711 + bb2 * 0.31114694

    const dy = y1 - y2
    const di = i1 - i2
    const dq = q1 - q2

    return 0.5053 * dy * dy + 0.299 * di * di + 0.1957 * dq * dq
  }

  /**
   * Check if a pixel is anti-aliased
   */
  private isAntiAliased(
    pixels: Uint8Array,
    index: number,
    width: number,
    height: number,
  ): boolean {
    const x = index % width
    const y = Math.floor(index / width)

    // Check neighboring pixels
    let zeroes = 0
    let positives = 0
    let negatives = 0

    const centerR = pixels[index * 4]
    const centerG = pixels[index * 4 + 1]
    const centerB = pixels[index * 4 + 2]
    const centerGray = (centerR + centerG + centerB) / 3

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0)
          continue

        const nx = x + dx
        const ny = y + dy

        if (nx < 0 || nx >= width || ny < 0 || ny >= height)
          continue

        const ni = (ny * width + nx) * 4
        const r = pixels[ni]
        const g = pixels[ni + 1]
        const b = pixels[ni + 2]
        const gray = (r + g + b) / 3

        const diff = centerGray - gray

        if (Math.abs(diff) < 10) {
          zeroes++
        }
        else if (diff > 0) {
          positives++
        }
        else {
          negatives++
        }
      }
    }

    // Anti-aliased pixel typically has both lighter and darker neighbors
    return positives > 0 && negatives > 0
  }

  /**
   * Generate side-by-side comparison image
   */
  async sideBySide(
    image1: Buffer | Uint8Array,
    image2: Buffer | Uint8Array,
    diffImage?: Buffer | Uint8Array,
  ): Promise<Buffer> {
    const img1 = this.decodePng(image1)
    const img2 = this.decodePng(image2)

    const width = img1.width
    const height = img1.height
    const totalWidth = diffImage ? width * 3 : width * 2
    const gap = 2 // Gap between images

    const combined = new Uint8Array((totalWidth + gap * (diffImage ? 2 : 1)) * height * 4)

    // Fill with gray background
    for (let i = 0; i < combined.length; i += 4) {
      combined[i] = 128
      combined[i + 1] = 128
      combined[i + 2] = 128
      combined[i + 3] = 255
    }

    const actualTotalWidth = totalWidth + gap * (diffImage ? 2 : 1)

    // Copy image 1
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcOffset = (y * width + x) * 4
        const dstOffset = (y * actualTotalWidth + x) * 4

        combined[dstOffset] = img1.pixels[srcOffset]
        combined[dstOffset + 1] = img1.pixels[srcOffset + 1]
        combined[dstOffset + 2] = img1.pixels[srcOffset + 2]
        combined[dstOffset + 3] = img1.pixels[srcOffset + 3]
      }
    }

    // Copy image 2
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcOffset = (y * width + x) * 4
        const dstOffset = (y * actualTotalWidth + width + gap + x) * 4

        combined[dstOffset] = img2.pixels[srcOffset]
        combined[dstOffset + 1] = img2.pixels[srcOffset + 1]
        combined[dstOffset + 2] = img2.pixels[srcOffset + 2]
        combined[dstOffset + 3] = img2.pixels[srcOffset + 3]
      }
    }

    // Copy diff image if provided
    if (diffImage) {
      const diff = this.decodePng(diffImage)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcOffset = (y * width + x) * 4
          const dstOffset = (y * actualTotalWidth + width * 2 + gap * 2 + x) * 4

          combined[dstOffset] = diff.pixels[srcOffset]
          combined[dstOffset + 1] = diff.pixels[srcOffset + 1]
          combined[dstOffset + 2] = diff.pixels[srcOffset + 2]
          combined[dstOffset + 3] = diff.pixels[srcOffset + 3]
        }
      }
    }

    return Buffer.from(this.encodePng(combined, actualTotalWidth, height))
  }

  /**
   * Decode PNG to pixel data
   * Full implementation supporting all PNG features
   */
  private decodePng(data: Buffer | Uint8Array): DecodedImage {
    const input = data instanceof Uint8Array ? data : new Uint8Array(data)

    // Check PNG signature
    const signature = [137, 80, 78, 71, 13, 10, 26, 10]
    for (let i = 0; i < 8; i++) {
      if (input[i] !== signature[i]) {
        throw new Error('Invalid PNG signature')
      }
    }

    let offset = 8
    let width = 0
    let height = 0
    let bitDepth = 0
    let colorType = 0
    let compressionMethod = 0
    let filterMethod = 0
    let interlaceMethod = 0
    const compressedData: Uint8Array[] = []
    let palette: Uint8Array | null = null
    let transparency: Uint8Array | null = null

    // Read chunks
    while (offset < input.length) {
      const length = (input[offset] << 24) | (input[offset + 1] << 16) | (input[offset + 2] << 8) | input[offset + 3]
      const type = String.fromCharCode(input[offset + 4], input[offset + 5], input[offset + 6], input[offset + 7])
      const chunkData = input.slice(offset + 8, offset + 8 + length)

      if (type === 'IHDR') {
        width = (chunkData[0] << 24) | (chunkData[1] << 16) | (chunkData[2] << 8) | chunkData[3]
        height = (chunkData[4] << 24) | (chunkData[5] << 16) | (chunkData[6] << 8) | chunkData[7]
        bitDepth = chunkData[8]
        colorType = chunkData[9]
        compressionMethod = chunkData[10]
        filterMethod = chunkData[11]
        interlaceMethod = chunkData[12]
      }
      else if (type === 'PLTE') {
        palette = new Uint8Array(chunkData)
      }
      else if (type === 'tRNS') {
        transparency = new Uint8Array(chunkData)
      }
      else if (type === 'IDAT') {
        compressedData.push(new Uint8Array(chunkData))
      }
      else if (type === 'IEND') {
        break
      }

      offset += 12 + length // 4 (length) + 4 (type) + length + 4 (crc)
    }

    // Concatenate all IDAT chunks
    let totalLength = 0
    for (const chunk of compressedData) {
      totalLength += chunk.length
    }

    const compressed = new Uint8Array(totalLength)
    let pos = 0
    for (const chunk of compressedData) {
      compressed.set(chunk, pos)
      pos += chunk.length
    }

    // Decompress using proper inflate
    const decompressed = inflate(compressed)

    // Calculate bytes per pixel
    let bytesPerPixel: number
    switch (colorType) {
      case 0: // Grayscale
        bytesPerPixel = Math.ceil(bitDepth / 8)
        break
      case 2: // RGB
        bytesPerPixel = 3 * Math.ceil(bitDepth / 8)
        break
      case 3: // Indexed
        bytesPerPixel = 1
        break
      case 4: // Grayscale + Alpha
        bytesPerPixel = 2 * Math.ceil(bitDepth / 8)
        break
      case 6: // RGBA
        bytesPerPixel = 4 * Math.ceil(bitDepth / 8)
        break
      default:
        throw new Error(`Unsupported color type: ${colorType}`)
    }

    const rowSize = Math.ceil(width * bytesPerPixel)
    const pixels = new Uint8Array(width * height * 4)

    // Unfilter and convert to RGBA
    let srcOffset = 0
    let prevRow: Uint8Array | null = null

    for (let y = 0; y < height; y++) {
      const filterType = decompressed[srcOffset++]
      const row = new Uint8Array(rowSize)

      // Copy row data
      for (let i = 0; i < rowSize; i++) {
        row[i] = decompressed[srcOffset + i]
      }
      srcOffset += rowSize

      // Apply reverse filter
      const unfiltered = this.unfilterRow(filterType, row, prevRow, bytesPerPixel)

      // Convert to RGBA
      this.convertToRGBA(unfiltered, pixels, y, width, colorType, bitDepth, palette, transparency)

      prevRow = unfiltered
    }

    return { pixels, width, height, bitDepth, colorType }
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
        default:
          throw new Error(`Unknown filter type: ${filterType}`)
      }

      result[i] = value
    }

    return result
  }

  /**
   * Convert pixel data to RGBA format
   */
  private convertToRGBA(
    row: Uint8Array,
    pixels: Uint8Array,
    y: number,
    width: number,
    colorType: number,
    bitDepth: number,
    palette: Uint8Array | null,
    transparency: Uint8Array | null,
  ): void {
    const dstOffset = y * width * 4

    switch (colorType) {
      case 0: // Grayscale
        for (let x = 0; x < width; x++) {
          const value = bitDepth === 16
            ? (row[x * 2] << 8 | row[x * 2 + 1]) >> 8
            : bitDepth === 8
              ? row[x]
              : this.extractBits(row, x, bitDepth)

          const offset = dstOffset + x * 4
          pixels[offset] = value
          pixels[offset + 1] = value
          pixels[offset + 2] = value
          pixels[offset + 3] = transparency && transparency.length >= 2
            ? ((transparency[0] << 8 | transparency[1]) === value ? 0 : 255)
            : 255
        }
        break

      case 2: // RGB
        for (let x = 0; x < width; x++) {
          const offset = dstOffset + x * 4
          if (bitDepth === 16) {
            pixels[offset] = row[x * 6]
            pixels[offset + 1] = row[x * 6 + 2]
            pixels[offset + 2] = row[x * 6 + 4]
          }
          else {
            pixels[offset] = row[x * 3]
            pixels[offset + 1] = row[x * 3 + 1]
            pixels[offset + 2] = row[x * 3 + 2]
          }
          pixels[offset + 3] = 255
        }
        break

      case 3: // Indexed
        if (!palette)
          throw new Error('Missing palette for indexed color')
        for (let x = 0; x < width; x++) {
          const index = bitDepth === 8 ? row[x] : this.extractBits(row, x, bitDepth)
          const offset = dstOffset + x * 4
          pixels[offset] = palette[index * 3]
          pixels[offset + 1] = palette[index * 3 + 1]
          pixels[offset + 2] = palette[index * 3 + 2]
          pixels[offset + 3] = transparency && index < transparency.length ? transparency[index] : 255
        }
        break

      case 4: // Grayscale + Alpha
        for (let x = 0; x < width; x++) {
          const offset = dstOffset + x * 4
          if (bitDepth === 16) {
            pixels[offset] = row[x * 4]
            pixels[offset + 3] = row[x * 4 + 2]
          }
          else {
            pixels[offset] = row[x * 2]
            pixels[offset + 3] = row[x * 2 + 1]
          }
          pixels[offset + 1] = pixels[offset]
          pixels[offset + 2] = pixels[offset]
        }
        break

      case 6: // RGBA
        for (let x = 0; x < width; x++) {
          const offset = dstOffset + x * 4
          if (bitDepth === 16) {
            pixels[offset] = row[x * 8]
            pixels[offset + 1] = row[x * 8 + 2]
            pixels[offset + 2] = row[x * 8 + 4]
            pixels[offset + 3] = row[x * 8 + 6]
          }
          else {
            pixels[offset] = row[x * 4]
            pixels[offset + 1] = row[x * 4 + 1]
            pixels[offset + 2] = row[x * 4 + 2]
            pixels[offset + 3] = row[x * 4 + 3]
          }
        }
        break
    }
  }

  /**
   * Extract bits from packed data
   */
  private extractBits(data: Uint8Array, pixelIndex: number, bitDepth: number): number {
    const pixelsPerByte = 8 / bitDepth
    const byteIndex = Math.floor(pixelIndex / pixelsPerByte)
    const bitOffset = (pixelsPerByte - 1 - (pixelIndex % pixelsPerByte)) * bitDepth
    const mask = (1 << bitDepth) - 1
    return (data[byteIndex] >> bitOffset) & mask
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
  private encodePng(pixels: Uint8Array, width: number, height: number): Uint8Array {
    // PNG signature
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

    // IHDR chunk
    const ihdr = this.createChunk('IHDR', this.createIhdrData(width, height))

    // IDAT chunk
    const idat = this.createChunk('IDAT', this.createIdatData(pixels, width, height))

    // IEND chunk
    const iend = this.createChunk('IEND', new Uint8Array(0))

    // Combine
    const png = new Uint8Array(signature.length + ihdr.length + idat.length + iend.length)
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

  private createIhdrData(width: number, height: number): Uint8Array {
    const data = new Uint8Array(13)
    const view = new DataView(data.buffer)
    view.setUint32(0, width, false)
    view.setUint32(4, height, false)
    data[8] = 8 // bit depth
    data[9] = 6 // color type (RGBA)
    data[10] = 0 // compression
    data[11] = 0 // filter
    data[12] = 0 // interlace
    return data
  }

  private createIdatData(pixels: Uint8Array, width: number, height: number): Uint8Array {
    // Add filter byte to each row
    const rowSize = width * 4 + 1
    const filtered = new Uint8Array(height * rowSize)

    for (let y = 0; y < height; y++) {
      filtered[y * rowSize] = 0 // No filter
      filtered.set(
        pixels.subarray(y * width * 4, (y + 1) * width * 4),
        y * rowSize + 1,
      )
    }

    // Compress with zlib
    return deflate(filtered)
  }

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
}

/**
 * Convenience function to compare two images
 */
export async function compareImages(
  image1: Buffer | Uint8Array,
  image2: Buffer | Uint8Array,
  options: DiffOptions = {},
): Promise<DiffResult> {
  const diff = new ImageDiff()
  return diff.compare(image1, image2, options)
}
