import { CanvasRenderingContext2D } from '../apis/Canvas'
import { VirtualElement } from './VirtualElement'
import { getAssignedElements, getAssignedNodes } from '../webcomponents/slot-utils'
import type { VirtualNode } from './VirtualNode'

// HTML Element subclasses - lightweight aliases for drop-in compatibility with happy-dom/jsdom.
// very-happy-dom uses a single VirtualElement class internally, but user code may rely on
// `instanceof window.HTMLDivElement` or `new window.HTMLInputElement()`, so we expose these.

export class HTMLAnchorElement extends VirtualElement {
  constructor() { super('a') }
}
export class HTMLAreaElement extends VirtualElement {
  constructor() { super('area') }
}
export class HTMLAudioElement extends VirtualElement {
  constructor() { super('audio') }
}
export class HTMLBaseElement extends VirtualElement {
  constructor() { super('base') }
}
export class HTMLBodyElement extends VirtualElement {
  constructor() { super('body') }
}
export class HTMLBRElement extends VirtualElement {
  constructor() { super('br') }
}
export class HTMLButtonElement extends VirtualElement {
  constructor() { super('button') }
}
export class HTMLDataElement extends VirtualElement {
  constructor() { super('data') }
}
export class HTMLDataListElement extends VirtualElement {
  constructor() { super('datalist') }
}
export class HTMLDetailsElement extends VirtualElement {
  constructor() { super('details') }
}
export class HTMLDialogElement extends VirtualElement {
  constructor() { super('dialog') }
}
export class HTMLDivElement extends VirtualElement {
  constructor() { super('div') }
}
export class HTMLDListElement extends VirtualElement {
  constructor() { super('dl') }
}
export class HTMLEmbedElement extends VirtualElement {
  constructor() { super('embed') }
}
export class HTMLFieldSetElement extends VirtualElement {
  constructor() { super('fieldset') }
}
export class HTMLFormElement extends VirtualElement {
  constructor() { super('form') }
}
export class HTMLHeadElement extends VirtualElement {
  constructor() { super('head') }
}
export class HTMLHeadingElement extends VirtualElement {
  constructor() { super('h1') }
}
export class HTMLHRElement extends VirtualElement {
  constructor() { super('hr') }
}
export class HTMLHtmlElement extends VirtualElement {
  constructor() { super('html') }
}
export class HTMLIFrameElement extends VirtualElement {
  constructor() { super('iframe') }
}
export class HTMLImageElement extends VirtualElement {
  constructor() { super('img') }
}
export class HTMLInputElement extends VirtualElement {
  constructor() { super('input') }
}
export class HTMLLabelElement extends VirtualElement {
  constructor() { super('label') }
}
export class HTMLLegendElement extends VirtualElement {
  constructor() { super('legend') }
}
export class HTMLLIElement extends VirtualElement {
  constructor() { super('li') }
}
export class HTMLLinkElement extends VirtualElement {
  constructor() { super('link') }
}
export class HTMLMapElement extends VirtualElement {
  constructor() { super('map') }
}
export class HTMLMediaElement extends VirtualElement {
  constructor() { super('video') }
}
export class HTMLMenuElement extends VirtualElement {
  constructor() { super('menu') }
}
export class HTMLMetaElement extends VirtualElement {
  constructor() { super('meta') }
}
export class HTMLMeterElement extends VirtualElement {
  constructor() { super('meter') }
}
export class HTMLModElement extends VirtualElement {
  constructor() { super('ins') }
}
export class HTMLObjectElement extends VirtualElement {
  constructor() { super('object') }
}
export class HTMLOListElement extends VirtualElement {
  constructor() { super('ol') }
}
export class HTMLOptGroupElement extends VirtualElement {
  constructor() { super('optgroup') }
}
export class HTMLOptionElement extends VirtualElement {
  constructor() { super('option') }
}
export class HTMLOutputElement extends VirtualElement {
  constructor() { super('output') }
}
export class HTMLParagraphElement extends VirtualElement {
  constructor() { super('p') }
}
export class HTMLParamElement extends VirtualElement {
  constructor() { super('param') }
}
export class HTMLPictureElement extends VirtualElement {
  constructor() { super('picture') }
}
export class HTMLPreElement extends VirtualElement {
  constructor() { super('pre') }
}
export class HTMLProgressElement extends VirtualElement {
  constructor() { super('progress') }
}
export class HTMLQuoteElement extends VirtualElement {
  constructor() { super('blockquote') }
}
export class HTMLScriptElement extends VirtualElement {
  constructor() { super('script') }
}
export class HTMLSelectElement extends VirtualElement {
  constructor() { super('select') }
}
export class HTMLSlotElement extends VirtualElement {
  constructor() { super('slot') }

  cloneNode(deep = false): HTMLSlotElement {
    const clone = new HTMLSlotElement()
    clone.namespaceURI = this.namespaceURI
    clone.nodeName = this.nodeName
    clone.tagName = this.tagName
    clone.ownerDocument = this.ownerDocument

    for (const [name, value] of this.attributes) {
      clone.setAttribute(name, value)
    }
    if (deep) {
      for (const child of this.childNodes) {
        const childClone = (child as any).cloneNode?.(true)
        if (childClone) clone.appendChild(childClone)
      }
    }
    return clone
  }

  assignedNodes(options: { flatten?: boolean } = {}): VirtualNode[] {
    return getAssignedNodes(this, options)
  }

  assignedElements(options: { flatten?: boolean } = {}): VirtualElement[] {
    return getAssignedElements(this, options)
  }
}
export class HTMLSourceElement extends VirtualElement {
  constructor() { super('source') }
}
export class HTMLSpanElement extends VirtualElement {
  constructor() { super('span') }
}
export class HTMLStyleElement extends VirtualElement {
  constructor() { super('style') }
}
export class HTMLTableCaptionElement extends VirtualElement {
  constructor() { super('caption') }
}
export class HTMLTableCellElement extends VirtualElement {
  constructor() { super('td') }
}
export class HTMLTableColElement extends VirtualElement {
  constructor() { super('col') }
}
export class HTMLTableElement extends VirtualElement {
  constructor() { super('table') }
}
export class HTMLTableRowElement extends VirtualElement {
  constructor() { super('tr') }
}
export class HTMLTableSectionElement extends VirtualElement {
  constructor() { super('tbody') }
}
export class HTMLTextAreaElement extends VirtualElement {
  constructor() { super('textarea') }
}
export class HTMLTimeElement extends VirtualElement {
  constructor() { super('time') }
}
export class HTMLTitleElement extends VirtualElement {
  constructor() { super('title') }
}
export class HTMLTrackElement extends VirtualElement {
  constructor() { super('track') }
}
export class HTMLUListElement extends VirtualElement {
  constructor() { super('ul') }
}
export class HTMLUnknownElement extends VirtualElement {
  constructor() { super('unknown') }
}
export class HTMLVideoElement extends VirtualElement {
  constructor() { super('video') }
}

// Convenience constructors (match browser globals)

export class Image extends VirtualElement {
  constructor(width?: number, height?: number) {
    super('img')
    if (width !== undefined) this.setAttribute('width', String(width))
    if (height !== undefined) this.setAttribute('height', String(height))
  }
}

export class Audio extends VirtualElement {
  constructor(src?: string) {
    super('audio')
    if (src !== undefined) this.setAttribute('src', src)
  }
}

/** Spec defaults for a canvas with no `width`/`height` attribute. */
const DEFAULT_CANVAS_WIDTH = 300
const DEFAULT_CANVAS_HEIGHT = 150

/**
 * Reflects a canvas dimension attribute. The attribute is an unsigned long, so
 * anything absent, non-numeric or negative resolves to the spec default.
 */
function parseCanvasDimension(value: string | null, fallback: number): number {
  if (value === null)
    return fallback

  const parsed = Number.parseInt(value, 10)

  return Number.isNaN(parsed) || parsed < 0 ? fallback : parsed
}

/**
 * Extends `VirtualElement` rather than reimplementing a partial node
 * interface, so a canvas has `style`, `classList`, `dataset`, the event
 * target methods and the tree-manipulation API like any other element.
 */
export class HTMLCanvasElement extends VirtualElement {
  private context2d: CanvasRenderingContext2D | null = null

  constructor() {
    super('canvas')
  }

  /**
   * `width` and `height` are reflected content attributes, so
   * `canvas.width = 800` and `setAttribute('width', '800')` stay in sync.
   * A missing or unparseable value falls back to the spec default.
   */
  get width(): number {
    return parseCanvasDimension(this.getAttribute('width'), DEFAULT_CANVAS_WIDTH)
  }

  set width(value: number) {
    this.setAttribute('width', String(value))
  }

  get height(): number {
    return parseCanvasDimension(this.getAttribute('height'), DEFAULT_CANVAS_HEIGHT)
  }

  set height(value: number) {
    this.setAttribute('height', String(value))
  }

  /**
   * The base implementation constructs a plain `VirtualElement`, which would
   * drop `getContext` and the reflected dimensions. `width`/`height` ride along
   * with the attributes. The 2D context is deliberately not carried over — a
   * cloned canvas starts with a fresh context, as it does in the browser.
   */
  cloneNode(deep = false): HTMLCanvasElement {
    const clone = new HTMLCanvasElement()
    clone.namespaceURI = this.namespaceURI
    clone.nodeName = this.nodeName
    clone.tagName = this.tagName
    clone.ownerDocument = this.ownerDocument

    for (const [name, value] of this.attributes) {
      clone.setAttribute(name, value)
    }
    if (deep) {
      for (const child of this.childNodes) {
        const childClone = (child as any).cloneNode?.(true)
        if (childClone)
          clone.appendChild(childClone)
      }
    }
    return clone
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
      this.toBlob((blob) => { if (blob) resolve(blob) }, type, quality)
    })
  }
}
