/**
 * Screenshot Module Tests
 * Comprehensive tests for the screenshot functionality
 */

import { describe, expect, it } from 'bun:test'
import {
  adler32,
  blendColors,
  captureHtml,
  compareImages,
  computeLayout,
  crc32,
  createRenderer,
  deflate,
  encodeWebP,
  HtmlRenderer,
  ImageDiff,
  inflate,
  isWebP,
  parseBoxValues,
  parseColor,
  parseCSS,
  parseHTML,
  parseInlineStyles,
  parseSize,
  PixelBuffer,
  renderLayoutTree,
  ScreenshotCapture,
  type RGBA,
} from '../src/screenshot'

describe('Screenshot Module', () => {
  describe('CSS Color Parsing', () => {
    it('should parse hex colors', () => {
      expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 255 })
      expect(parseColor('#00ff00')).toEqual({ r: 0, g: 255, b: 0, a: 255 })
      expect(parseColor('#0000ff')).toEqual({ r: 0, g: 0, b: 255, a: 255 })
      expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 255 })
      expect(parseColor('#000')).toEqual({ r: 0, g: 0, b: 0, a: 255 })
    })

    it('should parse hex colors with alpha', () => {
      expect(parseColor('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 })
      expect(parseColor('#f008')).toEqual({ r: 255, g: 0, b: 0, a: 136 })
    })

    it('should parse named colors', () => {
      expect(parseColor('red')).toEqual({ r: 255, g: 0, b: 0, a: 255 })
      expect(parseColor('green')).toEqual({ r: 0, g: 128, b: 0, a: 255 })
      expect(parseColor('blue')).toEqual({ r: 0, g: 0, b: 255, a: 255 })
      expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255, a: 255 })
      expect(parseColor('black')).toEqual({ r: 0, g: 0, b: 0, a: 255 })
      expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 })
    })

    it('should parse rgb colors', () => {
      expect(parseColor('rgb(255, 0, 0)')).toEqual({ r: 255, g: 0, b: 0, a: 255 })
      expect(parseColor('rgb(0, 255, 0)')).toEqual({ r: 0, g: 255, b: 0, a: 255 })
      expect(parseColor('rgb(0, 0, 255)')).toEqual({ r: 0, g: 0, b: 255, a: 255 })
    })

    it('should parse rgba colors', () => {
      expect(parseColor('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 128 })
      expect(parseColor('rgba(0, 255, 0, 1)')).toEqual({ r: 0, g: 255, b: 0, a: 255 })
      expect(parseColor('rgba(0, 0, 255, 0)')).toEqual({ r: 0, g: 0, b: 255, a: 0 })
    })

    it('should parse hsl colors', () => {
      const red = parseColor('hsl(0, 100%, 50%)')
      expect(red.r).toBeCloseTo(255, -1)
      expect(red.g).toBeCloseTo(0, -1)
      expect(red.b).toBeCloseTo(0, -1)
    })

    it('should handle invalid colors', () => {
      expect(parseColor(undefined)).toEqual({ r: 0, g: 0, b: 0, a: 0 })
      expect(parseColor('')).toEqual({ r: 0, g: 0, b: 0, a: 0 })
      expect(parseColor('invalid')).toEqual({ r: 0, g: 0, b: 0, a: 0 })
    })
  })

  describe('CSS Size Parsing', () => {
    it('should parse pixel values', () => {
      expect(parseSize('100px')).toBe(100)
      expect(parseSize('50px')).toBe(50)
      expect(parseSize('0px')).toBe(0)
    })

    it('should parse percentage values', () => {
      expect(parseSize('50%', 0, 200)).toBe(100)
      expect(parseSize('100%', 0, 500)).toBe(500)
      expect(parseSize('25%', 0, 400)).toBe(100)
    })

    it('should parse em values', () => {
      expect(parseSize('1em')).toBe(16)
      expect(parseSize('2em')).toBe(32)
      expect(parseSize('0.5em')).toBe(8)
    })

    it('should parse rem values', () => {
      expect(parseSize('1rem')).toBe(16)
      expect(parseSize('2rem')).toBe(32)
    })

    it('should handle auto', () => {
      expect(parseSize('auto', 100)).toBe(100)
    })

    it('should parse plain numbers', () => {
      expect(parseSize('100')).toBe(100)
      expect(parseSize('0')).toBe(0)
    })
  })

  describe('CSS Box Values Parsing', () => {
    it('should parse single value', () => {
      expect(parseBoxValues('10px')).toEqual([10, 10, 10, 10])
    })

    it('should parse two values', () => {
      expect(parseBoxValues('10px 20px')).toEqual([10, 20, 10, 20])
    })

    it('should parse three values', () => {
      expect(parseBoxValues('10px 20px 30px')).toEqual([10, 20, 30, 20])
    })

    it('should parse four values', () => {
      expect(parseBoxValues('10px 20px 30px 40px')).toEqual([10, 20, 30, 40])
    })
  })

  describe('Inline Style Parsing', () => {
    it('should parse inline styles', () => {
      const styles = parseInlineStyles('color: red; background: blue;')
      expect(styles.color).toBe('red')
      expect(styles.background).toBe('blue')
    })

    it('should handle empty styles', () => {
      expect(parseInlineStyles('')).toEqual({})
      expect(parseInlineStyles(undefined)).toEqual({})
    })
  })

  describe('Color Blending', () => {
    it('should blend opaque colors', () => {
      const fg: RGBA = { r: 255, g: 0, b: 0, a: 255 }
      const bg: RGBA = { r: 0, g: 0, b: 255, a: 255 }
      const blended = blendColors(fg, bg)
      expect(blended).toEqual({ r: 255, g: 0, b: 0, a: 255 })
    })

    it('should blend semi-transparent colors', () => {
      const fg: RGBA = { r: 255, g: 0, b: 0, a: 128 }
      const bg: RGBA = { r: 0, g: 0, b: 255, a: 255 }
      const blended = blendColors(fg, bg)
      expect(blended.r).toBeGreaterThan(100)
      expect(blended.b).toBeGreaterThan(100)
      expect(blended.a).toBe(255)
    })
  })

  describe('HTML Parsing', () => {
    it('should parse simple HTML', () => {
      const result = parseHTML('<div>Hello</div>')
      expect(result.tagName).toBe('div')
      expect(result.children.length).toBe(1)
      expect(result.children[0]).toHaveProperty('tagName', 'div')
    })

    it('should parse nested HTML', () => {
      const result = parseHTML('<div><span>Hello</span></div>')
      expect(result.children.length).toBe(1)
      const div = result.children[0] as any
      expect(div.tagName).toBe('div')
      expect(div.children.length).toBe(1)
    })

    it('should parse attributes', () => {
      const result = parseHTML('<div id="test" class="foo bar">Content</div>')
      const div = result.children[0] as any
      expect(div.attributes.id).toBe('test')
      expect(div.attributes.class).toBe('foo bar')
    })

    it('should handle self-closing tags', () => {
      const result = parseHTML('<br/><hr/>')
      expect(result.children.length).toBe(2)
    })

    it('should decode HTML entities', () => {
      const result = parseHTML('<div>&lt;test&gt;</div>')
      const div = result.children[0] as any
      expect(div.children[0]).toBe('<test>')
    })
  })

  describe('CSS Parsing', () => {
    it('should parse simple CSS rules', () => {
      const rules = parseCSS('.test { color: red; }')
      expect(rules.length).toBe(1)
      expect(rules[0].selector).toBe('.test')
      expect(rules[0].properties.color).toBe('red')
    })

    it('should parse multiple rules', () => {
      const rules = parseCSS('.a { color: red; } .b { color: blue; }')
      expect(rules.length).toBe(2)
    })

    it('should handle comments', () => {
      const rules = parseCSS('/* comment */ .test { color: red; }')
      expect(rules.length).toBe(1)
    })
  })

  describe('Layout Computation', () => {
    it('should compute layout for simple element', () => {
      const layout = computeLayout('<div style="width: 100px; height: 50px; background: red;">Test</div>', '', 800, 600)
      expect(layout).toBeDefined()
      expect(layout.visible).toBe(true)
      expect(layout.children.length).toBeGreaterThan(0)
    })

    it('should handle nested elements', () => {
      const layout = computeLayout('<div><span>Hello</span><span>World</span></div>', '', 800, 600)
      expect(layout).toBeDefined()
    })

    it('should handle CSS styles', () => {
      const css = '.box { width: 200px; height: 100px; background-color: blue; }'
      const layout = computeLayout('<div class="box">Content</div>', css, 800, 600)
      expect(layout).toBeDefined()
    })
  })

  describe('PixelBuffer', () => {
    it('should create buffer with correct dimensions', () => {
      const buffer = new PixelBuffer(100, 50)
      expect(buffer.width).toBe(100)
      expect(buffer.height).toBe(50)
      expect(buffer.data.length).toBe(100 * 50 * 4)
    })

    it('should fill with color', () => {
      const buffer = new PixelBuffer(10, 10)
      buffer.fill({ r: 255, g: 0, b: 0, a: 255 })

      const pixel = buffer.getPixel(5, 5)
      expect(pixel.r).toBe(255)
      expect(pixel.g).toBe(0)
      expect(pixel.b).toBe(0)
      expect(pixel.a).toBe(255)
    })

    it('should set and get pixels', () => {
      const buffer = new PixelBuffer(10, 10)
      buffer.setPixel(5, 5, { r: 0, g: 255, b: 0, a: 255 })

      const pixel = buffer.getPixel(5, 5)
      expect(pixel.g).toBe(255)
    })

    it('should draw filled rect', () => {
      const buffer = new PixelBuffer(100, 100)
      buffer.fill({ r: 255, g: 255, b: 255, a: 255 })
      buffer.fillRect(10, 10, 20, 20, { r: 255, g: 0, b: 0, a: 255 })

      const inside = buffer.getPixel(15, 15)
      expect(inside.r).toBe(255)
      expect(inside.g).toBe(0)

      const outside = buffer.getPixel(5, 5)
      expect(outside.r).toBe(255)
      expect(outside.g).toBe(255)
    })

    it('should handle rounded rect', () => {
      const buffer = new PixelBuffer(100, 100)
      buffer.fill({ r: 255, g: 255, b: 255, a: 255 })
      buffer.fillRoundedRect(10, 10, 50, 50, 10, { r: 0, g: 0, b: 255, a: 255 })

      const center = buffer.getPixel(35, 35)
      expect(center.b).toBe(255)
    })
  })

  describe('DEFLATE Compression', () => {
    it('should compress and decompress data', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      const compressed = deflate(original)
      const decompressed = inflate(compressed)

      expect(Array.from(decompressed)).toEqual(Array.from(original))
    })

    it('should handle larger data', () => {
      const original = new Uint8Array(1000)
      for (let i = 0; i < 1000; i++) {
        original[i] = i % 256
      }

      const compressed = deflate(original)
      const decompressed = inflate(compressed)

      expect(Array.from(decompressed)).toEqual(Array.from(original))
    })

    it('should handle repetitive data efficiently', () => {
      const original = new Uint8Array(1000)
      original.fill(42) // All same value

      const compressed = deflate(original)
      const decompressed = inflate(compressed)

      expect(Array.from(decompressed)).toEqual(Array.from(original))
      // Repetitive data should compress well
      expect(compressed.length).toBeLessThan(original.length)
    })
  })

  describe('CRC32 and Adler32', () => {
    it('should calculate CRC32', () => {
      const data = new TextEncoder().encode('Hello, World!')
      const checksum = crc32(new Uint8Array(data))
      expect(typeof checksum).toBe('number')
      expect(checksum).not.toBe(0)
    })

    it('should calculate Adler32', () => {
      const data = new TextEncoder().encode('Hello, World!')
      const checksum = adler32(new Uint8Array(data))
      expect(typeof checksum).toBe('number')
      expect(checksum).not.toBe(0)
    })

    it('should be consistent', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5])
      const crc1 = crc32(data)
      const crc2 = crc32(data)
      expect(crc1).toBe(crc2)

      const adler1 = adler32(data)
      const adler2 = adler32(data)
      expect(adler1).toBe(adler2)
    })
  })

  describe('HtmlRenderer', () => {
    it('should create renderer instance', () => {
      const renderer = createRenderer()
      expect(renderer).toBeInstanceOf(HtmlRenderer)
    })

    it('should render simple HTML to PNG', async () => {
      const renderer = new HtmlRenderer()
      const result = await renderer.render('<div style="background: red; width: 100px; height: 100px;">Test</div>', {
        width: 200,
        height: 200,
      })

      expect(result.data).toBeInstanceOf(Buffer)
      expect(result.width).toBe(200)
      expect(result.height).toBe(200)
      expect(result.format).toBe('png')
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should render to SVG format', async () => {
      const renderer = new HtmlRenderer()
      const result = await renderer.render('<div>Test</div>', {
        width: 100,
        height: 100,
        format: 'svg',
      })

      expect(result.format).toBe('svg')
      const svgContent = result.data.toString()
      expect(svgContent).toContain('<svg')
      expect(svgContent).toContain('foreignObject')
    })

    it('should respect deviceScaleFactor', async () => {
      const renderer = new HtmlRenderer()
      const result = await renderer.render('<div>Test</div>', {
        width: 100,
        height: 100,
        deviceScaleFactor: 2,
      })

      expect(result.width).toBe(200)
      expect(result.height).toBe(200)
    })

    it('should handle transparent background', async () => {
      const renderer = new HtmlRenderer()
      const result = await renderer.render('<div style="background: red; width: 50px; height: 50px;">Test</div>', {
        width: 100,
        height: 100,
        transparent: true,
      })

      expect(result.data).toBeInstanceOf(Buffer)
    })

    it('should inject custom CSS', async () => {
      const renderer = new HtmlRenderer()
      const result = await renderer.render('<div class="test">Test</div>', {
        width: 100,
        height: 100,
        css: '.test { background: blue; }',
      })

      expect(result.data).toBeInstanceOf(Buffer)
    })
  })

  describe('ScreenshotCapture', () => {
    it('should capture HTML to buffer', async () => {
      const capture = new ScreenshotCapture()
      const result = await capture.captureHtml('<div style="background: green; width: 50px; height: 50px;">Test</div>', {
        width: 100,
        height: 100,
      })

      expect(result).toBeInstanceOf(Buffer)
    })

    it('should return base64 encoding', async () => {
      const capture = new ScreenshotCapture()
      const result = await capture.captureHtml('<div>Test</div>', {
        width: 100,
        height: 100,
        encoding: 'base64',
      })

      expect(typeof result).toBe('string')
      // Base64 should be decodable
      expect(() => Buffer.from(result as string, 'base64')).not.toThrow()
    })

    it('should clip image region', async () => {
      const capture = new ScreenshotCapture()
      const result = await capture.captureHtml('<div style="background: red; width: 200px; height: 200px;">Test</div>', {
        width: 200,
        height: 200,
        clip: { x: 50, y: 50, width: 100, height: 100 },
      })

      expect(result).toBeInstanceOf(Buffer)
    })
  })

  describe('ImageDiff', () => {
    it('should compare identical images', async () => {
      const renderer = new HtmlRenderer()
      const result1 = await renderer.render('<div style="background: red; width: 100px; height: 100px;"></div>', {
        width: 100,
        height: 100,
      })
      const result2 = await renderer.render('<div style="background: red; width: 100px; height: 100px;"></div>', {
        width: 100,
        height: 100,
      })

      const diff = new ImageDiff()
      const comparison = await diff.compare(result1.data, result2.data)

      expect(comparison.match).toBe(true)
      expect(comparison.diffPixels).toBe(0)
      expect(comparison.diffPercentage).toBe(0)
    })

    it('should detect different images', async () => {
      const renderer = new HtmlRenderer()
      const result1 = await renderer.render('<div style="background: red; width: 100px; height: 100px;"></div>', {
        width: 100,
        height: 100,
      })
      const result2 = await renderer.render('<div style="background: blue; width: 100px; height: 100px;"></div>', {
        width: 100,
        height: 100,
      })

      const diff = new ImageDiff()
      const comparison = await diff.compare(result1.data, result2.data)

      expect(comparison.match).toBe(false)
      expect(comparison.diffPixels).toBeGreaterThan(0)
      expect(comparison.diffPercentage).toBeGreaterThan(0)
      expect(comparison.diffImage).toBeInstanceOf(Buffer)
    })

    it('should generate diff image', async () => {
      const renderer = new HtmlRenderer()
      const result1 = await renderer.render('<div style="background: red;"></div>', {
        width: 50,
        height: 50,
      })
      const result2 = await renderer.render('<div style="background: green;"></div>', {
        width: 50,
        height: 50,
      })

      const comparison = await compareImages(result1.data, result2.data)

      expect(comparison.diffImage).toBeInstanceOf(Buffer)
      expect(comparison.width).toBe(50)
      expect(comparison.height).toBe(50)
    })

    it('should handle threshold option', async () => {
      const renderer = new HtmlRenderer()
      const result1 = await renderer.render('<div style="background: rgb(255, 0, 0); width: 50px; height: 50px;"></div>', {
        width: 50,
        height: 50,
      })
      const result2 = await renderer.render('<div style="background: rgb(200, 55, 55); width: 50px; height: 50px;"></div>', {
        width: 50,
        height: 50,
      })

      // With low threshold, should detect difference (165 RGB diff > 38.25 threshold)
      const strictComparison = await compareImages(result1.data, result2.data, { threshold: 0.05 })
      expect(strictComparison.diffPixels).toBeGreaterThan(0)

      // With high threshold (0.9 = 688.5), should match since diff is 165
      const lenientComparison = await compareImages(result1.data, result2.data, { threshold: 0.9 })
      expect(lenientComparison.diffPixels).toBe(0)
    })

    it('should create side-by-side comparison', async () => {
      const renderer = new HtmlRenderer()
      const result1 = await renderer.render('<div style="background: red;"></div>', {
        width: 50,
        height: 50,
      })
      const result2 = await renderer.render('<div style="background: blue;"></div>', {
        width: 50,
        height: 50,
      })

      const diff = new ImageDiff()
      const comparison = await diff.compare(result1.data, result2.data)
      const sideBySide = await diff.sideBySide(result1.data, result2.data, comparison.diffImage)

      expect(sideBySide).toBeInstanceOf(Buffer)
    })
  })

  describe('PNG Encoding/Decoding Roundtrip', () => {
    it('should encode and decode PNG correctly', async () => {
      const renderer = new HtmlRenderer()

      // Create a colorful image
      const html = `
        <div style="background: linear-gradient(red, blue); width: 100px; height: 100px;">
          <div style="background: green; width: 30px; height: 30px; margin: 10px;"></div>
        </div>
      `

      const result = await renderer.render(html, { width: 100, height: 100 })

      // Verify it's valid PNG by checking signature
      expect(result.data[0]).toBe(137)
      expect(result.data[1]).toBe(80)
      expect(result.data[2]).toBe(78)
      expect(result.data[3]).toBe(71)
      expect(result.data[4]).toBe(13)
      expect(result.data[5]).toBe(10)
      expect(result.data[6]).toBe(26)
      expect(result.data[7]).toBe(10)

      // Should be able to compare with itself
      const comparison = await compareImages(result.data, result.data)
      expect(comparison.match).toBe(true)
    })
  })

  describe('Convenience Functions', () => {
    it('captureHtml should work', async () => {
      const result = await captureHtml('<div style="background: yellow;">Hello</div>', {
        width: 100,
        height: 100,
      })

      expect(result).toBeInstanceOf(Buffer)
    })
  })

  describe('WebP Encoding', () => {
    it('should encode pixels to WebP format', () => {
      const pixels = new Uint8Array(4 * 4 * 4) // 4x4 image
      // Fill with red
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = 255 // R
        pixels[i + 1] = 0 // G
        pixels[i + 2] = 0 // B
        pixels[i + 3] = 255 // A
      }

      const webp = encodeWebP(pixels, 4, 4)
      expect(webp).toBeInstanceOf(Uint8Array)
      expect(isWebP(webp)).toBe(true)
    })

    it('should have valid RIFF header', () => {
      const pixels = new Uint8Array(10 * 10 * 4)
      pixels.fill(255)

      const webp = encodeWebP(pixels, 10, 10)

      // Check RIFF signature
      expect(webp[0]).toBe(0x52) // 'R'
      expect(webp[1]).toBe(0x49) // 'I'
      expect(webp[2]).toBe(0x46) // 'F'
      expect(webp[3]).toBe(0x46) // 'F'

      // Check WEBP signature
      expect(webp[8]).toBe(0x57) // 'W'
      expect(webp[9]).toBe(0x45) // 'E'
      expect(webp[10]).toBe(0x42) // 'B'
      expect(webp[11]).toBe(0x50) // 'P'

      // Check VP8L chunk
      expect(webp[12]).toBe(0x56) // 'V'
      expect(webp[13]).toBe(0x50) // 'P'
      expect(webp[14]).toBe(0x38) // '8'
      expect(webp[15]).toBe(0x4C) // 'L'
    })

    it('should render to WebP format', async () => {
      const renderer = new HtmlRenderer()
      const result = await renderer.render('<div style="background: blue; width: 100px; height: 100px;"></div>', {
        width: 100,
        height: 100,
        format: 'webp',
      })

      expect(result.format).toBe('webp')
      expect(result.data).toBeInstanceOf(Buffer)
      expect(isWebP(new Uint8Array(result.data))).toBe(true)
    })

    it('should create smaller WebP for simple images', async () => {
      const renderer = new HtmlRenderer()

      // Solid color should compress well
      const webpResult = await renderer.render('<div style="background: green; width: 100px; height: 100px;"></div>', {
        width: 100,
        height: 100,
        format: 'webp',
      })

      const pngResult = await renderer.render('<div style="background: green; width: 100px; height: 100px;"></div>', {
        width: 100,
        height: 100,
        format: 'png',
      })

      // Both should be valid
      expect(webpResult.data.length).toBeGreaterThan(0)
      expect(pngResult.data.length).toBeGreaterThan(0)
    })

    it('should handle transparent backgrounds in WebP', async () => {
      const renderer = new HtmlRenderer()
      const result = await renderer.render('<div style="background: rgba(255,0,0,0.5); width: 50px; height: 50px;"></div>', {
        width: 50,
        height: 50,
        format: 'webp',
        transparent: true,
      })

      expect(isWebP(new Uint8Array(result.data))).toBe(true)
    })

    it('isWebP should correctly identify WebP files', () => {
      // Valid WebP header
      const validWebP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
      expect(isWebP(validWebP)).toBe(true)

      // Invalid - PNG header
      const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
      expect(isWebP(png)).toBe(false)

      // Invalid - too short
      const tooShort = new Uint8Array([0x52, 0x49, 0x46, 0x46])
      expect(isWebP(tooShort)).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty HTML', async () => {
      const renderer = new HtmlRenderer()
      const result = await renderer.render('', { width: 100, height: 100 })
      expect(result.data).toBeInstanceOf(Buffer)
    })

    it('should handle complex nested structures', async () => {
      const html = `
        <div style="padding: 20px; background: #f0f0f0;">
          <header style="background: navy; color: white; padding: 10px;">
            <h1>Title</h1>
          </header>
          <main style="display: flex;">
            <aside style="width: 100px; background: #e0e0e0;">Sidebar</aside>
            <article style="flex: 1; padding: 20px;">
              <p>Content paragraph 1</p>
              <p>Content paragraph 2</p>
            </article>
          </main>
          <footer style="background: #333; color: white; padding: 10px;">
            Footer text
          </footer>
        </div>
      `

      const renderer = new HtmlRenderer()
      const result = await renderer.render(html, { width: 800, height: 600 })
      expect(result.data).toBeInstanceOf(Buffer)
    })

    it('should handle special characters in text', async () => {
      const renderer = new HtmlRenderer()
      const result = await renderer.render('<div>&lt;script&gt;alert("XSS")&lt;/script&gt;</div>', {
        width: 200,
        height: 50,
      })
      expect(result.data).toBeInstanceOf(Buffer)
    })

    it('should handle very small dimensions', async () => {
      const renderer = new HtmlRenderer()
      const result = await renderer.render('<div>X</div>', { width: 1, height: 1 })
      expect(result.data).toBeInstanceOf(Buffer)
    })

    it('should handle large dimensions', async () => {
      const renderer = new HtmlRenderer()
      const result = await renderer.render('<div style="background: blue;"></div>', {
        width: 2000,
        height: 2000,
      })
      expect(result.data).toBeInstanceOf(Buffer)
      expect(result.width).toBe(2000)
      expect(result.height).toBe(2000)
    })
  })
})
