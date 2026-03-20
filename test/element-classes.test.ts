import { beforeEach, describe, expect, test } from 'bun:test'
import {
  Audio,
  HTMLAnchorElement,
  HTMLAudioElement,
  HTMLButtonElement,
  HTMLCanvasElement,
  HTMLDivElement,
  HTMLFormElement,
  HTMLIFrameElement,
  HTMLImageElement,
  HTMLInputElement,
  HTMLLinkElement,
  HTMLScriptElement,
  HTMLSelectElement,
  HTMLSpanElement,
  HTMLStyleElement,
  HTMLTableCellElement,
  HTMLTableElement,
  HTMLTableRowElement,
  HTMLTextAreaElement,
  HTMLVideoElement,
  Image,
  SVGAngle,
  SVGCircleElement,
  SVGDefsElement,
  SVGGElement,
  SVGImageElement,
  SVGLength,
  SVGLineElement,
  SVGMatrix,
  SVGNumber,
  SVGPathElement,
  SVGPoint,
  SVGRect,
  SVGRectElement,
  SVGSVGElement,
  SVGTextElement,
  SVGTransform,
  SVGUseElement,
  VirtualDocument,
  VirtualElement,
  VirtualSVGElement,
  Window,
} from '../src'

// =============================================================================
// HTML Element Subclasses - Constructor correctness
// =============================================================================
describe('HTML Element Subclasses - Constructor correctness', () => {
  test('HTMLDivElement creates element with tagName DIV', () => {
    const el = new HTMLDivElement()
    expect(el.tagName).toBe('DIV')
  })

  test('HTMLSpanElement creates element with tagName SPAN', () => {
    const el = new HTMLSpanElement()
    expect(el.tagName).toBe('SPAN')
  })

  test('HTMLInputElement creates element with tagName INPUT', () => {
    const el = new HTMLInputElement()
    expect(el.tagName).toBe('INPUT')
  })

  test('HTMLButtonElement creates element with tagName BUTTON', () => {
    const el = new HTMLButtonElement()
    expect(el.tagName).toBe('BUTTON')
  })

  test('HTMLAnchorElement creates element with tagName A', () => {
    const el = new HTMLAnchorElement()
    expect(el.tagName).toBe('A')
  })

  test('HTMLFormElement creates element with tagName FORM', () => {
    const el = new HTMLFormElement()
    expect(el.tagName).toBe('FORM')
  })

  test('HTMLSelectElement creates element with tagName SELECT', () => {
    const el = new HTMLSelectElement()
    expect(el.tagName).toBe('SELECT')
  })

  test('HTMLTextAreaElement creates element with tagName TEXTAREA', () => {
    const el = new HTMLTextAreaElement()
    expect(el.tagName).toBe('TEXTAREA')
  })

  test('HTMLTableElement creates element with tagName TABLE', () => {
    const el = new HTMLTableElement()
    expect(el.tagName).toBe('TABLE')
  })

  test('HTMLTableRowElement creates element with tagName TR', () => {
    const el = new HTMLTableRowElement()
    expect(el.tagName).toBe('TR')
  })

  test('HTMLTableCellElement creates element with tagName TD', () => {
    const el = new HTMLTableCellElement()
    expect(el.tagName).toBe('TD')
  })

  test('HTMLImageElement creates element with tagName IMG', () => {
    const el = new HTMLImageElement()
    expect(el.tagName).toBe('IMG')
  })

  test('HTMLLinkElement creates element with tagName LINK', () => {
    const el = new HTMLLinkElement()
    expect(el.tagName).toBe('LINK')
  })

  test('HTMLScriptElement creates element with tagName SCRIPT', () => {
    const el = new HTMLScriptElement()
    expect(el.tagName).toBe('SCRIPT')
  })

  test('HTMLStyleElement creates element with tagName STYLE', () => {
    const el = new HTMLStyleElement()
    expect(el.tagName).toBe('STYLE')
  })

  test('HTMLIFrameElement creates element with tagName IFRAME', () => {
    const el = new HTMLIFrameElement()
    expect(el.tagName).toBe('IFRAME')
  })

  test('HTMLVideoElement creates element with tagName VIDEO', () => {
    const el = new HTMLVideoElement()
    expect(el.tagName).toBe('VIDEO')
  })

  test('HTMLAudioElement creates element with tagName AUDIO', () => {
    const el = new HTMLAudioElement()
    expect(el.tagName).toBe('AUDIO')
  })

  test('HTMLCanvasElement is available on window', () => {
    const win = new Window()
    expect(win.HTMLCanvasElement).toBeDefined()
    expect(win.HTMLCanvasElement).toBe(HTMLCanvasElement)
  })
})

// =============================================================================
// HTML Element Subclasses - Feature tests
// =============================================================================
describe('HTML Element Subclasses - Feature tests', () => {
  test('all subclasses extend VirtualElement (instanceof)', () => {
    const elements = [
      new HTMLDivElement(),
      new HTMLSpanElement(),
      new HTMLInputElement(),
      new HTMLButtonElement(),
      new HTMLAnchorElement(),
      new HTMLFormElement(),
      new HTMLSelectElement(),
      new HTMLTextAreaElement(),
      new HTMLTableElement(),
      new HTMLTableRowElement(),
      new HTMLTableCellElement(),
      new HTMLImageElement(),
      new HTMLLinkElement(),
      new HTMLScriptElement(),
      new HTMLStyleElement(),
      new HTMLIFrameElement(),
      new HTMLVideoElement(),
      new HTMLAudioElement(),
    ]

    for (const el of elements) {
      expect(el).toBeInstanceOf(VirtualElement)
    }
  })

  test('can set/get attributes', () => {
    const div = new HTMLDivElement()
    div.setAttribute('id', 'test-div')
    expect(div.getAttribute('id')).toBe('test-div')

    const input = new HTMLInputElement()
    input.setAttribute('type', 'text')
    input.setAttribute('placeholder', 'Enter name')
    expect(input.getAttribute('type')).toBe('text')
    expect(input.getAttribute('placeholder')).toBe('Enter name')

    const anchor = new HTMLAnchorElement()
    anchor.setAttribute('href', 'https://example.com')
    anchor.setAttribute('target', '_blank')
    expect(anchor.getAttribute('href')).toBe('https://example.com')
    expect(anchor.getAttribute('target')).toBe('_blank')
  })

  test('can be appended to document', () => {
    const doc = new VirtualDocument()
    const div = new HTMLDivElement()
    const span = new HTMLSpanElement()
    const input = new HTMLInputElement()

    doc.body!.appendChild(div)
    doc.body!.appendChild(span)
    doc.body!.appendChild(input)

    expect(doc.body!.childNodes).toContain(div)
    expect(doc.body!.childNodes).toContain(span)
    expect(doc.body!.childNodes).toContain(input)
  })

  test('innerHTML works on them', () => {
    const div = new HTMLDivElement()
    div.innerHTML = '<span>Hello</span>'
    expect(div.innerHTML).toBe('<span>Hello</span>')
    expect(div.childNodes.length).toBe(1)

    const form = new HTMLFormElement()
    form.innerHTML = '<input type="text"><button>Submit</button>'
    expect(form.childNodes.length).toBe(2)
  })

  test('classList works on them', () => {
    const div = new HTMLDivElement()
    div.classList.add('foo', 'bar')
    expect(div.classList.contains('foo')).toBe(true)
    expect(div.classList.contains('bar')).toBe(true)
    expect(div.className).toBe('foo bar')

    div.classList.remove('foo')
    expect(div.classList.contains('foo')).toBe(false)
    expect(div.className).toBe('bar')

    div.classList.toggle('baz')
    expect(div.classList.contains('baz')).toBe(true)
  })

  test('style works on them', () => {
    const div = new HTMLDivElement()
    div.style.setProperty('color', 'red')
    div.style.setProperty('font-size', '16px')
    expect(div.style.getPropertyValue('color')).toBe('red')
    expect(div.style.getPropertyValue('font-size')).toBe('16px')

    const span = new HTMLSpanElement()
    span.style.setProperty('display', 'inline-block')
    expect(span.style.getPropertyValue('display')).toBe('inline-block')
  })
})

// =============================================================================
// Image constructor
// =============================================================================
describe('Image constructor', () => {
  test('new Image() creates img element', () => {
    const img = new Image()
    expect(img.tagName).toBe('IMG')
  })

  test('new Image(100, 200) sets width and height attributes', () => {
    const img = new Image(100, 200)
    expect(img.tagName).toBe('IMG')
    expect(img.getAttribute('width')).toBe('100')
    expect(img.getAttribute('height')).toBe('200')
  })

  test('new Image() with only width sets width attribute', () => {
    const img = new Image(50)
    expect(img.getAttribute('width')).toBe('50')
    expect(img.getAttribute('height')).toBeNull()
  })

  test('Image extends VirtualElement', () => {
    const img = new Image()
    expect(img).toBeInstanceOf(VirtualElement)
  })
})

// =============================================================================
// Audio constructor
// =============================================================================
describe('Audio constructor', () => {
  test('new Audio() creates audio element', () => {
    const audio = new Audio()
    expect(audio.tagName).toBe('AUDIO')
  })

  test('new Audio("test.mp3") sets src attribute', () => {
    const audio = new Audio('test.mp3')
    expect(audio.tagName).toBe('AUDIO')
    expect(audio.getAttribute('src')).toBe('test.mp3')
  })

  test('new Audio() without src does not set src attribute', () => {
    const audio = new Audio()
    expect(audio.getAttribute('src')).toBeNull()
  })

  test('Audio extends VirtualElement', () => {
    const audio = new Audio()
    expect(audio).toBeInstanceOf(VirtualElement)
  })
})

// =============================================================================
// Window exposes HTML element constructors
// =============================================================================
describe('Window exposes HTML element constructors', () => {
  let win: InstanceType<typeof Window>

  beforeEach(() => {
    win = new Window()
  })

  test('window.HTMLDivElement exists', () => {
    expect(win.HTMLDivElement).toBeDefined()
    expect(win.HTMLDivElement).toBe(HTMLDivElement)
  })

  test('window.HTMLInputElement exists', () => {
    expect(win.HTMLInputElement).toBeDefined()
    expect(win.HTMLInputElement).toBe(HTMLInputElement)
  })

  test('window.HTMLButtonElement exists', () => {
    expect(win.HTMLButtonElement).toBeDefined()
    expect(win.HTMLButtonElement).toBe(HTMLButtonElement)
  })

  test('new window.HTMLDivElement() works', () => {
    const div = new win.HTMLDivElement()
    expect(div.tagName).toBe('DIV')
    expect(div).toBeInstanceOf(VirtualElement)
  })

  test('window.Image exists', () => {
    expect(win.Image).toBeDefined()
    expect(win.Image).toBe(Image)
  })

  test('new window.Image(100, 50) works', () => {
    const img = new win.Image(100, 50)
    expect(img.tagName).toBe('IMG')
    expect(img.getAttribute('width')).toBe('100')
    expect(img.getAttribute('height')).toBe('50')
  })

  test('window.Audio exists', () => {
    expect(win.Audio).toBeDefined()
    expect(win.Audio).toBe(Audio)
  })

  test('window exposes all major HTML element constructors', () => {
    expect(win.HTMLAnchorElement).toBe(HTMLAnchorElement)
    expect(win.HTMLFormElement).toBe(HTMLFormElement)
    expect(win.HTMLSelectElement).toBe(HTMLSelectElement)
    expect(win.HTMLTextAreaElement).toBe(HTMLTextAreaElement)
    expect(win.HTMLTableElement).toBe(HTMLTableElement)
    expect(win.HTMLImageElement).toBe(HTMLImageElement)
    expect(win.HTMLVideoElement).toBe(HTMLVideoElement)
    expect(win.HTMLAudioElement).toBe(HTMLAudioElement)
    expect(win.HTMLScriptElement).toBe(HTMLScriptElement)
    expect(win.HTMLStyleElement).toBe(HTMLStyleElement)
    expect(win.HTMLLinkElement).toBe(HTMLLinkElement)
    expect(win.HTMLIFrameElement).toBe(HTMLIFrameElement)
    expect(win.HTMLSpanElement).toBe(HTMLSpanElement)
    expect(win.HTMLTableRowElement).toBe(HTMLTableRowElement)
    expect(win.HTMLTableCellElement).toBe(HTMLTableCellElement)
  })
})

// =============================================================================
// SVG Element Subclasses
// =============================================================================
describe('SVG Element Subclasses', () => {
  const SVG_NS = 'http://www.w3.org/2000/svg'

  test('SVGSVGElement creates element with tagName svg and correct namespace', () => {
    const el = new SVGSVGElement()
    expect(el.tagName).toBe('svg')
    expect(el.namespaceURI).toBe(SVG_NS)
  })

  test('SVGCircleElement creates element with tagName circle', () => {
    const el = new SVGCircleElement()
    expect(el.tagName).toBe('circle')
  })

  test('SVGRectElement creates element with tagName rect', () => {
    const el = new SVGRectElement()
    expect(el.tagName).toBe('rect')
  })

  test('SVGPathElement creates element with tagName path', () => {
    const el = new SVGPathElement()
    expect(el.tagName).toBe('path')
  })

  test('SVGLineElement creates element with tagName line', () => {
    const el = new SVGLineElement()
    expect(el.tagName).toBe('line')
  })

  test('SVGGElement creates element with tagName g', () => {
    const el = new SVGGElement()
    expect(el.tagName).toBe('g')
  })

  test('SVGTextElement creates element with tagName text', () => {
    const el = new SVGTextElement()
    expect(el.tagName).toBe('text')
  })

  test('SVGDefsElement creates element with tagName defs', () => {
    const el = new SVGDefsElement()
    expect(el.tagName).toBe('defs')
  })

  test('SVGUseElement creates element with tagName use', () => {
    const el = new SVGUseElement()
    expect(el.tagName).toBe('use')
  })

  test('SVGImageElement creates element with tagName image', () => {
    const el = new SVGImageElement()
    expect(el.tagName).toBe('image')
  })

  test('all SVG elements have namespaceURI http://www.w3.org/2000/svg', () => {
    const elements = [
      new SVGSVGElement(),
      new SVGCircleElement(),
      new SVGRectElement(),
      new SVGPathElement(),
      new SVGLineElement(),
      new SVGGElement(),
      new SVGTextElement(),
      new SVGDefsElement(),
      new SVGUseElement(),
      new SVGImageElement(),
    ]

    for (const el of elements) {
      expect(el.namespaceURI).toBe(SVG_NS)
    }
  })

  test('SVG elements extend VirtualSVGElement', () => {
    const elements = [
      new SVGSVGElement(),
      new SVGCircleElement(),
      new SVGRectElement(),
      new SVGPathElement(),
      new SVGLineElement(),
      new SVGGElement(),
      new SVGTextElement(),
      new SVGDefsElement(),
      new SVGUseElement(),
      new SVGImageElement(),
    ]

    for (const el of elements) {
      expect(el).toBeInstanceOf(VirtualSVGElement)
    }
  })

  test('SVG elements also extend VirtualElement (through VirtualSVGElement)', () => {
    const el = new SVGCircleElement()
    expect(el).toBeInstanceOf(VirtualElement)
  })

  test('SVG elements preserve case for tagName (no uppercasing)', () => {
    // SVG elements should NOT uppercase tagName like HTML elements do
    const svg = new SVGSVGElement()
    expect(svg.tagName).toBe('svg')
    expect(svg.nodeName).toBe('svg')
  })

  test('SVG elements can have attributes set', () => {
    const circle = new SVGCircleElement()
    circle.setAttribute('cx', '50')
    circle.setAttribute('cy', '50')
    circle.setAttribute('r', '25')
    expect(circle.getAttribute('cx')).toBe('50')
    expect(circle.getAttribute('cy')).toBe('50')
    expect(circle.getAttribute('r')).toBe('25')

    const rect = new SVGRectElement()
    rect.setAttribute('width', '100')
    rect.setAttribute('height', '50')
    rect.setAttribute('fill', 'blue')
    expect(rect.getAttribute('width')).toBe('100')
    expect(rect.getAttribute('height')).toBe('50')
    expect(rect.getAttribute('fill')).toBe('blue')
  })
})

// =============================================================================
// SVG Data Classes
// =============================================================================
describe('SVG Data Classes', () => {
  describe('SVGAngle', () => {
    test('has type constants', () => {
      expect(SVGAngle.SVG_ANGLETYPE_UNKNOWN).toBe(0)
      expect(SVGAngle.SVG_ANGLETYPE_UNSPECIFIED).toBe(1)
      expect(SVGAngle.SVG_ANGLETYPE_DEG).toBe(2)
      expect(SVGAngle.SVG_ANGLETYPE_RAD).toBe(3)
      expect(SVGAngle.SVG_ANGLETYPE_GRAD).toBe(4)
    })

    test('has default values', () => {
      const angle = new SVGAngle()
      expect(angle.unitType).toBe(0)
      expect(angle.value).toBe(0)
      expect(angle.valueInSpecifiedUnits).toBe(0)
      expect(angle.valueAsString).toBe('0')
    })

    test('properties are writable', () => {
      const angle = new SVGAngle()
      angle.value = 90
      angle.unitType = SVGAngle.SVG_ANGLETYPE_DEG
      angle.valueAsString = '90deg'
      expect(angle.value).toBe(90)
      expect(angle.unitType).toBe(2)
      expect(angle.valueAsString).toBe('90deg')
    })
  })

  describe('SVGLength', () => {
    test('has type constants', () => {
      expect(SVGLength.SVG_LENGTHTYPE_UNKNOWN).toBe(0)
      expect(SVGLength.SVG_LENGTHTYPE_NUMBER).toBe(1)
      expect(SVGLength.SVG_LENGTHTYPE_PERCENTAGE).toBe(2)
      expect(SVGLength.SVG_LENGTHTYPE_PX).toBe(5)
    })

    test('has default values', () => {
      const length = new SVGLength()
      expect(length.unitType).toBe(0)
      expect(length.value).toBe(0)
      expect(length.valueInSpecifiedUnits).toBe(0)
      expect(length.valueAsString).toBe('0')
    })

    test('properties are writable', () => {
      const length = new SVGLength()
      length.value = 100
      length.unitType = SVGLength.SVG_LENGTHTYPE_PX
      length.valueAsString = '100px'
      expect(length.value).toBe(100)
      expect(length.unitType).toBe(5)
      expect(length.valueAsString).toBe('100px')
    })
  })

  describe('SVGNumber', () => {
    test('has value property with default 0', () => {
      const num = new SVGNumber()
      expect(num.value).toBe(0)
    })

    test('value is writable', () => {
      const num = new SVGNumber()
      num.value = 42
      expect(num.value).toBe(42)
    })
  })

  describe('SVGPoint', () => {
    test('has x and y properties with default 0', () => {
      const point = new SVGPoint()
      expect(point.x).toBe(0)
      expect(point.y).toBe(0)
    })

    test('x and y are writable', () => {
      const point = new SVGPoint()
      point.x = 10
      point.y = 20
      expect(point.x).toBe(10)
      expect(point.y).toBe(20)
    })
  })

  describe('SVGRect', () => {
    test('has x, y, width, height properties with default 0', () => {
      const rect = new SVGRect()
      expect(rect.x).toBe(0)
      expect(rect.y).toBe(0)
      expect(rect.width).toBe(0)
      expect(rect.height).toBe(0)
    })

    test('properties are writable', () => {
      const rect = new SVGRect()
      rect.x = 10
      rect.y = 20
      rect.width = 100
      rect.height = 50
      expect(rect.x).toBe(10)
      expect(rect.y).toBe(20)
      expect(rect.width).toBe(100)
      expect(rect.height).toBe(50)
    })
  })

  describe('SVGMatrix', () => {
    test('has a, b, c, d, e, f properties with identity matrix defaults', () => {
      const matrix = new SVGMatrix()
      expect(matrix.a).toBe(1)
      expect(matrix.b).toBe(0)
      expect(matrix.c).toBe(0)
      expect(matrix.d).toBe(1)
      expect(matrix.e).toBe(0)
      expect(matrix.f).toBe(0)
    })

    test('properties are writable', () => {
      const matrix = new SVGMatrix()
      matrix.a = 2
      matrix.b = 3
      matrix.c = 4
      matrix.d = 5
      matrix.e = 6
      matrix.f = 7
      expect(matrix.a).toBe(2)
      expect(matrix.b).toBe(3)
      expect(matrix.c).toBe(4)
      expect(matrix.d).toBe(5)
      expect(matrix.e).toBe(6)
      expect(matrix.f).toBe(7)
    })
  })

  describe('SVGTransform', () => {
    test('has type constants', () => {
      expect(SVGTransform.SVG_TRANSFORM_UNKNOWN).toBe(0)
      expect(SVGTransform.SVG_TRANSFORM_MATRIX).toBe(1)
      expect(SVGTransform.SVG_TRANSFORM_TRANSLATE).toBe(2)
      expect(SVGTransform.SVG_TRANSFORM_SCALE).toBe(3)
      expect(SVGTransform.SVG_TRANSFORM_ROTATE).toBe(4)
      expect(SVGTransform.SVG_TRANSFORM_SKEWX).toBe(5)
      expect(SVGTransform.SVG_TRANSFORM_SKEWY).toBe(6)
    })

    test('has type property with default 0', () => {
      const transform = new SVGTransform()
      expect(transform.type).toBe(0)
    })

    test('has matrix property that is an SVGMatrix', () => {
      const transform = new SVGTransform()
      expect(transform.matrix).toBeInstanceOf(SVGMatrix)
      expect(transform.matrix.a).toBe(1)
      expect(transform.matrix.d).toBe(1)
    })

    test('has angle property with default 0', () => {
      const transform = new SVGTransform()
      expect(transform.angle).toBe(0)
    })

    test('properties are writable', () => {
      const transform = new SVGTransform()
      transform.type = SVGTransform.SVG_TRANSFORM_ROTATE
      transform.angle = 45
      expect(transform.type).toBe(4)
      expect(transform.angle).toBe(45)
    })
  })
})

// =============================================================================
// Element reflected properties
// =============================================================================
describe('Element reflected properties', () => {
  let el: VirtualElement

  beforeEach(() => {
    el = new HTMLDivElement()
  })

  test('draggable get/set', () => {
    expect(el.draggable).toBe(false)
    el.draggable = true
    expect(el.draggable).toBe(true)
    expect(el.getAttribute('draggable')).toBe('true')
    el.draggable = false
    expect(el.draggable).toBe(false)
    expect(el.getAttribute('draggable')).toBe('false')
  })

  test('spellcheck get/set', () => {
    // Default should be true (browser default behavior)
    expect(el.spellcheck).toBe(true)
    el.spellcheck = false
    expect(el.spellcheck).toBe(false)
    expect(el.getAttribute('spellcheck')).toBe('false')
    el.spellcheck = true
    expect(el.spellcheck).toBe(true)
    expect(el.getAttribute('spellcheck')).toBe('true')
  })

  test('translate get/set', () => {
    // Default should be true (browser default behavior)
    expect(el.translate).toBe(true)
    el.translate = false
    expect(el.translate).toBe(false)
    expect(el.getAttribute('translate')).toBe('no')
    el.translate = true
    expect(el.translate).toBe(true)
    expect(el.getAttribute('translate')).toBe('yes')
  })

  test('accessKey get/set', () => {
    expect(el.accessKey).toBe('')
    el.accessKey = 'h'
    expect(el.accessKey).toBe('h')
    expect(el.getAttribute('accesskey')).toBe('h')
  })

  test('autocapitalize get/set', () => {
    expect(el.autocapitalize).toBe('')
    el.autocapitalize = 'words'
    expect(el.autocapitalize).toBe('words')
    expect(el.getAttribute('autocapitalize')).toBe('words')
  })
})

// =============================================================================
// Window exposes SVG element constructors
// =============================================================================
describe('Window exposes SVG element constructors', () => {
  let win: InstanceType<typeof Window>

  beforeEach(() => {
    win = new Window()
  })

  test('window.SVGSVGElement exists', () => {
    expect(win.SVGSVGElement).toBeDefined()
    expect(win.SVGSVGElement).toBe(SVGSVGElement)
  })

  test('window.SVGCircleElement exists', () => {
    expect(win.SVGCircleElement).toBeDefined()
    expect(win.SVGCircleElement).toBe(SVGCircleElement)
  })

  test('new window.SVGRectElement() works', () => {
    const rect = new win.SVGRectElement()
    expect(rect.tagName).toBe('rect')
    expect(rect.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(rect).toBeInstanceOf(VirtualSVGElement)
  })

  test('window exposes all major SVG element constructors', () => {
    expect(win.SVGPathElement).toBe(SVGPathElement)
    expect(win.SVGLineElement).toBe(SVGLineElement)
    expect(win.SVGGElement).toBe(SVGGElement)
    expect(win.SVGTextElement).toBe(SVGTextElement)
    expect(win.SVGDefsElement).toBe(SVGDefsElement)
    expect(win.SVGUseElement).toBe(SVGUseElement)
    expect(win.SVGImageElement).toBe(SVGImageElement)
    expect(win.SVGRectElement).toBe(SVGRectElement)
  })

  test('window exposes SVG data classes', () => {
    expect(win.SVGAngle).toBe(SVGAngle)
    expect(win.SVGLength).toBe(SVGLength)
    expect(win.SVGNumber).toBe(SVGNumber)
    expect(win.SVGPoint).toBe(SVGPoint)
    expect(win.SVGRect).toBe(SVGRect)
    expect(win.SVGMatrix).toBe(SVGMatrix)
    expect(win.SVGTransform).toBe(SVGTransform)
  })
})
