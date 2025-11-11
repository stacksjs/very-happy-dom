/**
 * Canvas API Implementation
 * Provides a basic Canvas and CanvasRenderingContext2D implementation for testing
 */

export interface CanvasImageSource {
  width: number
  height: number
}

export type CanvasFillStrokeStyles = string | CanvasGradient | CanvasPattern

export interface CanvasGradient {
  addColorStop(offset: number, color: string): void
}

export interface CanvasPattern {
  setTransform(transform?: DOMMatrix2DInit): void
}

export interface DOMMatrix2DInit {
  a?: number
  b?: number
  c?: number
  d?: number
  e?: number
  f?: number
}

export interface TextMetrics {
  width: number
  actualBoundingBoxLeft: number
  actualBoundingBoxRight: number
  fontBoundingBoxAscent: number
  fontBoundingBoxDescent: number
  actualBoundingBoxAscent: number
  actualBoundingBoxDescent: number
  emHeightAscent: number
  emHeightDescent: number
  hangingBaseline: number
  alphabeticBaseline: number
  ideographicBaseline: number
}

export interface ImageData {
  readonly width: number
  readonly height: number
  readonly data: Uint8ClampedArray
}

export type GlobalCompositeOperation =
  | 'source-over'
  | 'source-in'
  | 'source-out'
  | 'source-atop'
  | 'destination-over'
  | 'destination-in'
  | 'destination-out'
  | 'destination-atop'
  | 'lighter'
  | 'copy'
  | 'xor'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'

export type CanvasLineCap = 'butt' | 'round' | 'square'
export type CanvasLineJoin = 'round' | 'bevel' | 'miter'
export type CanvasTextAlign = 'start' | 'end' | 'left' | 'right' | 'center'
export type CanvasTextBaseline = 'top' | 'hanging' | 'middle' | 'alphabetic' | 'ideographic' | 'bottom'

/**
 * CanvasRenderingContext2D
 * A simplified implementation for testing purposes
 */
export class CanvasRenderingContext2D {
  // Drawing state
  public fillStyle: CanvasFillStrokeStyles = '#000000'
  public strokeStyle: CanvasFillStrokeStyles = '#000000'
  public globalAlpha = 1.0
  public globalCompositeOperation: GlobalCompositeOperation = 'source-over'
  public lineWidth = 1.0
  public lineCap: CanvasLineCap = 'butt'
  public lineJoin: CanvasLineJoin = 'miter'
  public miterLimit = 10.0
  public lineDashOffset = 0.0
  public shadowOffsetX = 0.0
  public shadowOffsetY = 0.0
  public shadowBlur = 0.0
  public shadowColor = 'rgba(0, 0, 0, 0)'
  public font = '10px sans-serif'
  public textAlign: CanvasTextAlign = 'start'
  public textBaseline: CanvasTextBaseline = 'alphabetic'

  private canvas: HTMLCanvasElement
  private savedStates: Array<Record<string, any>> = []
  private currentPath: Array<{ type: string, args: any[] }> = []
  private transformMatrix = [1, 0, 0, 1, 0, 0] // identity matrix

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
  }

  // State management
  save(): void {
    this.savedStates.push({
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      globalAlpha: this.globalAlpha,
      globalCompositeOperation: this.globalCompositeOperation,
      lineWidth: this.lineWidth,
      lineCap: this.lineCap,
      lineJoin: this.lineJoin,
      miterLimit: this.miterLimit,
      lineDashOffset: this.lineDashOffset,
      shadowOffsetX: this.shadowOffsetX,
      shadowOffsetY: this.shadowOffsetY,
      shadowBlur: this.shadowBlur,
      shadowColor: this.shadowColor,
      font: this.font,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      transformMatrix: [...this.transformMatrix],
    })
  }

  restore(): void {
    const state = this.savedStates.pop()
    if (state) {
      Object.assign(this, state)
    }
  }

  // Transform methods
  scale(x: number, y: number): void {
    this.transformMatrix[0] *= x
    this.transformMatrix[3] *= y
  }

  rotate(angle: number): void {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const [a, b, c, d, e, f] = this.transformMatrix
    this.transformMatrix[0] = a * cos + c * sin
    this.transformMatrix[1] = b * cos + d * sin
    this.transformMatrix[2] = c * cos - a * sin
    this.transformMatrix[3] = d * cos - b * sin
  }

  translate(x: number, y: number): void {
    this.transformMatrix[4] += x
    this.transformMatrix[5] += y
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    const [m0, m1, m2, m3, m4, m5] = this.transformMatrix
    this.transformMatrix[0] = m0 * a + m2 * b
    this.transformMatrix[1] = m1 * a + m3 * b
    this.transformMatrix[2] = m0 * c + m2 * d
    this.transformMatrix[3] = m1 * c + m3 * d
    this.transformMatrix[4] = m0 * e + m2 * f + m4
    this.transformMatrix[5] = m1 * e + m3 * f + m5
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.transformMatrix = [a, b, c, d, e, f]
  }

  resetTransform(): void {
    this.transformMatrix = [1, 0, 0, 1, 0, 0]
  }

  // Path methods
  beginPath(): void {
    this.currentPath = []
  }

  closePath(): void {
    this.currentPath.push({ type: 'closePath', args: [] })
  }

  moveTo(x: number, y: number): void {
    this.currentPath.push({ type: 'moveTo', args: [x, y] })
  }

  lineTo(x: number, y: number): void {
    this.currentPath.push({ type: 'lineTo', args: [x, y] })
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise = false): void {
    this.currentPath.push({ type: 'arc', args: [x, y, radius, startAngle, endAngle, counterclockwise] })
  }

  arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void {
    this.currentPath.push({ type: 'arcTo', args: [x1, y1, x2, y2, radius] })
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.currentPath.push({ type: 'quadraticCurveTo', args: [cpx, cpy, x, y] })
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    this.currentPath.push({ type: 'bezierCurveTo', args: [cp1x, cp1y, cp2x, cp2y, x, y] })
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.currentPath.push({ type: 'rect', args: [x, y, width, height] })
  }

  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise = false,
  ): void {
    this.currentPath.push({ type: 'ellipse', args: [x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise] })
  }

  // Drawing methods
  fill(): void {
    // No-op in virtual DOM (just track the operation)
  }

  stroke(): void {
    // No-op in virtual DOM (just track the operation)
  }

  clip(): void {
    // No-op in virtual DOM
  }

  // Rectangle methods
  fillRect(x: number, y: number, width: number, height: number): void {
    // No-op in virtual DOM (just track the operation)
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    // No-op in virtual DOM (just track the operation)
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    // No-op in virtual DOM (just track the operation)
  }

  // Text methods
  fillText(text: string, x: number, y: number, maxWidth?: number): void {
    // No-op in virtual DOM (just track the operation)
  }

  strokeText(text: string, x: number, y: number, maxWidth?: number): void {
    // No-op in virtual DOM (just track the operation)
  }

  measureText(text: string): TextMetrics {
    // Simplified measurement
    const width = text.length * 8 // Rough estimate
    return {
      width,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: width,
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 2,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 2,
      emHeightAscent: 10,
      emHeightDescent: 2,
      hangingBaseline: 8,
      alphabeticBaseline: 0,
      ideographicBaseline: -2,
    }
  }

  // Image methods
  drawImage(image: CanvasImageSource, ...args: number[]): void {
    // No-op in virtual DOM (just track the operation)
  }

  // Pixel manipulation
  createImageData(width: number, height: number): ImageData
  createImageData(imageData: ImageData): ImageData
  createImageData(widthOrImageData: number | ImageData, height?: number): ImageData {
    if (typeof widthOrImageData === 'number' && typeof height === 'number') {
      const data = new Uint8ClampedArray(widthOrImageData * height * 4)
      return {
        width: widthOrImageData,
        height,
        data,
      }
    }
    else {
      const imageData = widthOrImageData as ImageData
      return this.createImageData(imageData.width, imageData.height)
    }
  }

  getImageData(x: number, y: number, width: number, height: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4)
    return {
      width,
      height,
      data,
    }
  }

  putImageData(imageData: ImageData, dx: number, dy: number): void
  putImageData(imageData: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void
  putImageData(...args: any[]): void {
    // No-op in virtual DOM (just track the operation)
  }

  // Gradients and patterns
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient {
    const stops = new Map<number, string>()
    return {
      addColorStop(offset: number, color: string) {
        stops.set(offset, color)
      },
    }
  }

  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient {
    const stops = new Map<number, string>()
    return {
      addColorStop(offset: number, color: string) {
        stops.set(offset, color)
      },
    }
  }

  createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null {
    return {
      setTransform(transform?: DOMMatrix2DInit) {
        // No-op
      },
    }
  }

  // Line dash
  setLineDash(segments: number[]): void {
    // Store line dash pattern (simplified)
  }

  getLineDash(): number[] {
    return []
  }

  // Hit region (not fully implemented in most browsers)
  isPointInPath(x: number, y: number): boolean {
    return false
  }

  isPointInStroke(x: number, y: number): boolean {
    return false
  }
}

/**
 * HTMLCanvasElement
 * A simplified canvas element for testing
 */
export class HTMLCanvasElement {
  public width = 300
  public height = 150
  public tagName = 'CANVAS'
  public nodeName = 'CANVAS'
  public nodeType: 'element' = 'element'
  public nodeValue: string | null = null
  public parentNode: any = null
  public childNodes: any[] = []
  public attributes: Map<string, string> = new Map()
  private context2d: CanvasRenderingContext2D | null = null

  // children should only contain element nodes, per DOM spec
  get children(): any[] {
    return this.childNodes.filter(node => node.nodeType === 'element')
  }

  // Add minimal methods to make it compatible with VirtualElement for queries
  getAttribute(name: string): string | null {
    return this.attributes.get(name.toLowerCase()) ?? null
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name.toLowerCase(), value)
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name.toLowerCase())
  }

  matches(selector: string): boolean {
    // Simple matching for canvas selector
    return selector.toLowerCase() === 'canvas'
      || selector.toLowerCase() === this.tagName.toLowerCase()
  }

  getContext(contextId: '2d'): CanvasRenderingContext2D | null
  getContext(contextId: string): any | null
  getContext(contextId: string): any | null {
    if (contextId === '2d') {
      if (!this.context2d) {
        this.context2d = new CanvasRenderingContext2D(this)
      }
      return this.context2d
    }
    // Other contexts (webgl, webgl2, etc.) not implemented
    return null
  }

  toDataURL(type?: string, quality?: any): string {
    // Return a simple data URL
    return `data:${type || 'image/png'};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`
  }

  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: any): void {
    // Simulate async blob creation
    setTimeout(() => {
      const blob = new Blob(['fake canvas data'], { type: type || 'image/png' })
      callback(blob)
    }, 0)
  }

  async toBlobAsync(type?: string, quality?: any): Promise<Blob> {
    return new Promise((resolve) => {
      this.toBlob(resolve, type, quality)
    })
  }
}
