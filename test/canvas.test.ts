import { describe, expect, test } from 'bun:test'
import { Window } from '../src'

describe('Canvas API', () => {
  describe('HTMLCanvasElement', () => {
    test('window should have HTMLCanvasElement', () => {
      const window = new Window()
      expect(window.HTMLCanvasElement).toBeDefined()
    })

    test('createElement("canvas") should return HTMLCanvasElement', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      expect(canvas.tagName).toBe('CANVAS')
      expect(canvas.width).toBe(300)
      expect(canvas.height).toBe(150)
    })

    test('canvas should have default dimensions', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      expect(canvas.width).toBe(300)
      expect(canvas.height).toBe(150)
    })

    test('canvas dimensions should be settable', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      canvas.width = 800
      canvas.height = 600
      expect(canvas.width).toBe(800)
      expect(canvas.height).toBe(600)
    })

    test('getContext("2d") should return CanvasRenderingContext2D', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(ctx).toBeDefined()
      expect(ctx?.constructor.name).toBe('CanvasRenderingContext2D')
    })

    test('getContext should return same context on multiple calls', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx1 = canvas.getContext('2d')
      const ctx2 = canvas.getContext('2d')
      expect(ctx1).toBe(ctx2)
    })

    test('getContext with unknown context should return null', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('webgl')
      expect(ctx).toBeNull()
    })

    test('toDataURL should return data URL', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const dataUrl = canvas.toDataURL()
      expect(dataUrl).toMatch(/^data:image\/png;base64,/)
    })

    test('toDataURL with type should use specified type', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const dataUrl = canvas.toDataURL('image/jpeg')
      expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/)
    })

    test('toBlob should provide blob via callback', async () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve)
      })

      expect(blob).toBeDefined()
      expect(blob?.type).toBe('image/png')
    })

    test('toBlobAsync should return blob promise', async () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const blob = await canvas.toBlobAsync()
      expect(blob).toBeDefined()
      expect(blob.type).toBe('image/png')
    })
  })

  describe('CanvasRenderingContext2D - Basic Properties', () => {
    test('should have default fill and stroke styles', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(ctx?.fillStyle).toBe('#000000')
      expect(ctx?.strokeStyle).toBe('#000000')
    })

    test('fillStyle should be settable', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'red'
        expect(ctx.fillStyle).toBe('red')
      }
    })

    test('strokeStyle should be settable', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = 'blue'
        expect(ctx.strokeStyle).toBe('blue')
      }
    })

    test('should have default line properties', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(ctx?.lineWidth).toBe(1.0)
      expect(ctx?.lineCap).toBe('butt')
      expect(ctx?.lineJoin).toBe('miter')
    })

    test('lineWidth should be settable', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.lineWidth = 5
        expect(ctx.lineWidth).toBe(5)
      }
    })

    test('should have default font and text properties', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(ctx?.font).toBe('10px sans-serif')
      expect(ctx?.textAlign).toBe('start')
      expect(ctx?.textBaseline).toBe('alphabetic')
    })

    test('font should be settable', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.font = '20px Arial'
        expect(ctx.font).toBe('20px Arial')
      }
    })
  })

  describe('CanvasRenderingContext2D - State Management', () => {
    test('save() and restore() should preserve state', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'red'
        ctx.lineWidth = 10
        ctx.save()

        ctx.fillStyle = 'blue'
        ctx.lineWidth = 5
        expect(ctx.fillStyle).toBe('blue')
        expect(ctx.lineWidth).toBe(5)

        ctx.restore()
        expect(ctx.fillStyle).toBe('red')
        expect(ctx.lineWidth).toBe(10)
      }
    })

    test('multiple save/restore should work correctly', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'red'
        ctx.save()

        ctx.fillStyle = 'blue'
        ctx.save()

        ctx.fillStyle = 'green'
        expect(ctx.fillStyle).toBe('green')

        ctx.restore()
        expect(ctx.fillStyle).toBe('blue')

        ctx.restore()
        expect(ctx.fillStyle).toBe('red')
      }
    })

    test('restore() without save() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.restore()).not.toThrow()
    })
  })

  describe('CanvasRenderingContext2D - Transformations', () => {
    test('scale() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.scale(2, 2)).not.toThrow()
    })

    test('rotate() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.rotate(Math.PI / 4)).not.toThrow()
    })

    test('translate() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.translate(100, 100)).not.toThrow()
    })

    test('transform() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.transform(1, 0, 0, 1, 0, 0)).not.toThrow()
    })

    test('setTransform() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.setTransform(1, 0, 0, 1, 0, 0)).not.toThrow()
    })

    test('resetTransform() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.resetTransform()).not.toThrow()
    })
  })

  describe('CanvasRenderingContext2D - Path Methods', () => {
    test('beginPath() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.beginPath()).not.toThrow()
    })

    test('closePath() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.closePath()).not.toThrow()
    })

    test('moveTo() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.moveTo(10, 10)).not.toThrow()
    })

    test('lineTo() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.lineTo(100, 100)).not.toThrow()
    })

    test('arc() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.arc(50, 50, 40, 0, Math.PI * 2)).not.toThrow()
    })

    test('rect() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.rect(10, 10, 100, 100)).not.toThrow()
    })

    test('ellipse() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.ellipse(100, 100, 50, 75, 0, 0, Math.PI * 2)).not.toThrow()
    })
  })

  describe('CanvasRenderingContext2D - Drawing Methods', () => {
    test('fillRect() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.fillRect(0, 0, 100, 100)).not.toThrow()
    })

    test('strokeRect() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.strokeRect(0, 0, 100, 100)).not.toThrow()
    })

    test('clearRect() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.clearRect(0, 0, 100, 100)).not.toThrow()
    })

    test('fill() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.fill()).not.toThrow()
    })

    test('stroke() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.stroke()).not.toThrow()
    })

    test('complete drawing workflow should work', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      expect(() => {
        if (ctx) {
          ctx.fillStyle = 'red'
          ctx.fillRect(0, 0, 100, 100)
          ctx.strokeStyle = 'blue'
          ctx.strokeRect(10, 10, 80, 80)
        }
      }).not.toThrow()
    })
  })

  describe('CanvasRenderingContext2D - Text Methods', () => {
    test('fillText() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.fillText('Hello', 10, 50)).not.toThrow()
    })

    test('strokeText() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      expect(() => ctx?.strokeText('Hello', 10, 50)).not.toThrow()
    })

    test('measureText() should return TextMetrics', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const metrics = ctx?.measureText('Hello World')
      expect(metrics).toBeDefined()
      expect(metrics?.width).toBeGreaterThan(0)
      expect(typeof metrics?.width).toBe('number')
    })

    test('measureText() should return all properties', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const metrics = ctx?.measureText('Test')
      expect(metrics?.actualBoundingBoxLeft).toBeDefined()
      expect(metrics?.actualBoundingBoxRight).toBeDefined()
      expect(metrics?.fontBoundingBoxAscent).toBeDefined()
      expect(metrics?.fontBoundingBoxDescent).toBeDefined()
    })
  })

  describe('CanvasRenderingContext2D - Image Methods', () => {
    test('createImageData() with dimensions should work', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const imageData = ctx?.createImageData(100, 100)
      expect(imageData?.width).toBe(100)
      expect(imageData?.height).toBe(100)
      expect(imageData?.data).toBeInstanceOf(Uint8ClampedArray)
      expect(imageData?.data.length).toBe(100 * 100 * 4)
    })

    test('getImageData() should return ImageData', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const imageData = ctx?.getImageData(0, 0, 50, 50)
      expect(imageData?.width).toBe(50)
      expect(imageData?.height).toBe(50)
      expect(imageData?.data).toBeInstanceOf(Uint8ClampedArray)
    })

    test('putImageData() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const imageData = ctx?.createImageData(10, 10)
      if (imageData) {
        expect(() => ctx?.putImageData(imageData, 0, 0)).not.toThrow()
      }
    })
  })

  describe('CanvasRenderingContext2D - Gradients and Patterns', () => {
    test('createLinearGradient() should return gradient', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const gradient = ctx?.createLinearGradient(0, 0, 100, 100)
      expect(gradient).toBeDefined()
      expect(typeof gradient?.addColorStop).toBe('function')
    })

    test('gradient addColorStop() should not throw', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const gradient = ctx?.createLinearGradient(0, 0, 100, 100)
      expect(() => gradient?.addColorStop(0, 'red')).not.toThrow()
      expect(() => gradient?.addColorStop(1, 'blue')).not.toThrow()
    })

    test('createRadialGradient() should return gradient', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const gradient = ctx?.createRadialGradient(50, 50, 10, 50, 50, 50)
      expect(gradient).toBeDefined()
      expect(typeof gradient?.addColorStop).toBe('function')
    })

    test('createPattern() should return pattern', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const patternCanvas = window.document.createElement('canvas')
      const pattern = ctx?.createPattern(patternCanvas, 'repeat')
      expect(pattern).toBeDefined()
    })
  })

  describe('Integration Tests', () => {
    test('full canvas drawing workflow', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      canvas.width = 400
      canvas.height = 300

      const ctx = canvas.getContext('2d')
      expect(ctx).toBeDefined()

      if (ctx) {
        // Draw background
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, 400, 300)

        // Draw red rectangle
        ctx.fillStyle = 'red'
        ctx.fillRect(50, 50, 100, 100)

        // Draw blue circle
        ctx.strokeStyle = 'blue'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(250, 100, 50, 0, Math.PI * 2)
        ctx.stroke()

        // Draw text
        ctx.fillStyle = 'black'
        ctx.font = '20px Arial'
        ctx.fillText('Canvas Test', 150, 250)

        // Verify we can get data URL
        const dataUrl = canvas.toDataURL()
        expect(dataUrl).toMatch(/^data:/)
      }
    })

    test('canvas can be added to DOM', () => {
      const window = new Window()
      const canvas = window.document.createElement('canvas')
      window.document.body!.appendChild(canvas)

      const foundCanvas = window.document.querySelector('canvas')
      expect(foundCanvas).toBe(canvas)
    })
  })
})

// =============================================================================
// Regression guard for #1556: `HTMLCanvasElement` used to be a standalone class
// that hand-rolled a partial node interface, so a canvas had no `style`,
// `classList`, `dataset` or event-target methods and `canvas.style.x = y` threw
// a TypeError. It now extends `VirtualElement` like every other element.
// =============================================================================

describe('HTMLCanvasElement inherits the element API (#1556)', () => {
  const makeCanvas = () => {
    const window = new Window()
    return { window, canvas: window.document.createElement('canvas') as any }
  }

  test('style is a usable CSSStyleDeclaration', () => {
    const { canvas } = makeCanvas()

    expect(canvas.style).toBeDefined()

    canvas.style.position = 'absolute'
    canvas.style.width = '100px'

    expect(canvas.style.position).toBe('absolute')
    expect(canvas.style.width).toBe('100px')
  })

  test('classList, id, className and dataset work', () => {
    const { canvas } = makeCanvas()

    canvas.classList.add('chart', 'big')
    expect([...canvas.classList]).toEqual(['chart', 'big'])

    canvas.classList.toggle('big', false)
    expect(canvas.className).toBe('chart')

    canvas.id = 'c1'
    expect(canvas.id).toBe('c1')

    canvas.dataset.kind = 'line'
    expect(canvas.dataset.kind).toBe('line')
  })

  test('is an event target', () => {
    const { window, canvas } = makeCanvas()
    let clicks = 0

    canvas.addEventListener('click', () => clicks++)
    canvas.dispatchEvent(new window.Event('click'))

    expect(clicks).toBe(1)
  })

  test('participates in the tree and in selector queries', () => {
    const { window, canvas } = makeCanvas()
    const document = window.document

    canvas.id = 'c1'
    canvas.classList.add('chart')
    document.body!.appendChild(canvas)

    expect(canvas.isConnected).toBe(true)
    expect(canvas.parentNode).toBe(document.body)
    expect(document.querySelector('canvas')).toBe(canvas)
    expect(document.querySelector('#c1')).toBe(canvas)
    expect(document.querySelector('.chart')).toBe(canvas)
    expect(canvas.matches('canvas.chart')).toBe(true)
    expect(canvas.closest('body')).toBe(document.body)
    expect(canvas.outerHTML.startsWith('<canvas')).toBe(true)
  })

  test('is still an HTMLCanvasElement with a working 2D context', () => {
    const { window, canvas } = makeCanvas()

    expect(canvas).toBeInstanceOf(window.HTMLCanvasElement)
    expect(canvas.constructor.name).toBe('HTMLCanvasElement')

    const context = canvas.getContext('2d')
    expect(context).toBeDefined()
    expect(context.canvas).toBe(canvas)
    expect(canvas.getContext('2d')).toBe(context)
    expect(canvas.getContext('webgl')).toBeNull()
  })

  describe('width and height reflect their attributes', () => {
    test('default to 300x150 when absent', () => {
      const { canvas } = makeCanvas()
      expect(canvas.width).toBe(300)
      expect(canvas.height).toBe(150)
    })

    test('assignment writes the attribute', () => {
      const { canvas } = makeCanvas()

      canvas.width = 800
      canvas.height = 600

      expect(canvas.width).toBe(800)
      expect(canvas.height).toBe(600)
      expect(canvas.getAttribute('width')).toBe('800')
      expect(canvas.getAttribute('height')).toBe('600')
    })

    test('the attribute drives the property', () => {
      const { canvas } = makeCanvas()

      canvas.setAttribute('width', '640')
      canvas.setAttribute('height', '480')

      expect(canvas.width).toBe(640)
      expect(canvas.height).toBe(480)
    })

    test('absent, unparseable and negative values fall back to the default', () => {
      const { canvas } = makeCanvas()

      canvas.setAttribute('width', 'bogus')
      expect(canvas.width).toBe(300)

      canvas.setAttribute('height', '-5')
      expect(canvas.height).toBe(150)

      canvas.removeAttribute('width')
      expect(canvas.width).toBe(300)
    })
  })

  describe('cloneNode keeps the canvas API', () => {
    test('the clone is a canvas, not a plain element', () => {
      const { window, canvas } = makeCanvas()
      canvas.width = 640

      const clone = canvas.cloneNode(false) as any

      expect(clone).toBeInstanceOf(window.HTMLCanvasElement)
      expect(clone.tagName).toBe('CANVAS')
      expect(typeof clone.getContext).toBe('function')
      expect(clone.width).toBe(640)
    })

    test('the clone gets a fresh context rather than sharing one', () => {
      const { canvas } = makeCanvas()
      const context = canvas.getContext('2d')
      context.fillStyle = 'red'

      const clone = canvas.cloneNode(false) as any
      const cloneContext = clone.getContext('2d')

      expect(cloneContext).not.toBe(context)
      expect(cloneContext.canvas).toBe(clone)
      expect(cloneContext.fillStyle).toBe('#000000')
    })
  })
})
