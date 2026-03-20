// ============================================================================
// DOMRect / DOMRectReadOnly
// ============================================================================

export class DOMRectReadOnly {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number

  constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }

  get top(): number { return Math.min(this.y, this.y + this.height) }
  get right(): number { return Math.max(this.x, this.x + this.width) }
  get bottom(): number { return Math.max(this.y, this.y + this.height) }
  get left(): number { return Math.min(this.x, this.x + this.width) }

  toJSON(): { x: number, y: number, width: number, height: number, top: number, right: number, bottom: number, left: number } {
    return { x: this.x, y: this.y, width: this.width, height: this.height, top: this.top, right: this.right, bottom: this.bottom, left: this.left }
  }

  static fromRect(rect?: { x?: number, y?: number, width?: number, height?: number }): DOMRectReadOnly {
    return new DOMRectReadOnly(rect?.x ?? 0, rect?.y ?? 0, rect?.width ?? 0, rect?.height ?? 0)
  }
}

export class DOMRect extends DOMRectReadOnly {
  declare x: number
  declare y: number
  declare width: number
  declare height: number

  constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
    super(x, y, width, height)
    // Make properties writable
    Object.defineProperties(this, {
      x: { value: x, writable: true, enumerable: true, configurable: true },
      y: { value: y, writable: true, enumerable: true, configurable: true },
      width: { value: width, writable: true, enumerable: true, configurable: true },
      height: { value: height, writable: true, enumerable: true, configurable: true },
    })
  }

  static fromRect(rect?: { x?: number, y?: number, width?: number, height?: number }): DOMRect {
    return new DOMRect(rect?.x ?? 0, rect?.y ?? 0, rect?.width ?? 0, rect?.height ?? 0)
  }
}

// ============================================================================
// DOMPoint / DOMPointReadOnly
// ============================================================================

export class DOMPointReadOnly {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly w: number

  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this.x = x
    this.y = y
    this.z = z
    this.w = w
  }

  toJSON(): { x: number, y: number, z: number, w: number } {
    return { x: this.x, y: this.y, z: this.z, w: this.w }
  }

  static fromPoint(point?: { x?: number, y?: number, z?: number, w?: number }): DOMPointReadOnly {
    return new DOMPointReadOnly(point?.x ?? 0, point?.y ?? 0, point?.z ?? 0, point?.w ?? 1)
  }
}

export class DOMPoint extends DOMPointReadOnly {
  declare x: number
  declare y: number
  declare z: number
  declare w: number

  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    super(x, y, z, w)
    Object.defineProperties(this, {
      x: { value: x, writable: true, enumerable: true, configurable: true },
      y: { value: y, writable: true, enumerable: true, configurable: true },
      z: { value: z, writable: true, enumerable: true, configurable: true },
      w: { value: w, writable: true, enumerable: true, configurable: true },
    })
  }

  static fromPoint(point?: { x?: number, y?: number, z?: number, w?: number }): DOMPoint {
    return new DOMPoint(point?.x ?? 0, point?.y ?? 0, point?.z ?? 0, point?.w ?? 1)
  }
}

// ============================================================================
// DOMMatrix / DOMMatrixReadOnly
// ============================================================================

export class DOMMatrixReadOnly {
  readonly a: number
  readonly b: number
  readonly c: number
  readonly d: number
  readonly e: number
  readonly f: number
  readonly m11: number
  readonly m12: number
  readonly m13: number
  readonly m14: number
  readonly m21: number
  readonly m22: number
  readonly m23: number
  readonly m24: number
  readonly m31: number
  readonly m32: number
  readonly m33: number
  readonly m34: number
  readonly m41: number
  readonly m42: number
  readonly m43: number
  readonly m44: number
  readonly is2D: boolean = true
  readonly isIdentity: boolean

  constructor(init?: string | number[]) {
    if (Array.isArray(init) && init.length === 6) {
      this.a = init[0]
      this.m11 = init[0]
      this.b = init[1]
      this.m12 = init[1]
      this.c = init[2]
      this.m21 = init[2]
      this.d = init[3]
      this.m22 = init[3]
      this.e = init[4]
      this.m41 = init[4]
      this.f = init[5]
      this.m42 = init[5]
      this.m13 = 0
      this.m14 = 0
      this.m23 = 0
      this.m24 = 0
      this.m31 = 0
      this.m32 = 0
      this.m33 = 1
      this.m34 = 0
      this.m43 = 0
      this.m44 = 1
      this.isIdentity = this.a === 1 && this.b === 0 && this.c === 0 && this.d === 1 && this.e === 0 && this.f === 0
    }
    else if (Array.isArray(init) && init.length === 16) {
      this.m11 = init[0]
      this.m12 = init[1]
      this.m13 = init[2]
      this.m14 = init[3]
      this.m21 = init[4]
      this.m22 = init[5]
      this.m23 = init[6]
      this.m24 = init[7]
      this.m31 = init[8]
      this.m32 = init[9]
      this.m33 = init[10]
      this.m34 = init[11]
      this.m41 = init[12]
      this.m42 = init[13]
      this.m43 = init[14]
      this.m44 = init[15]
      this.a = this.m11
      this.b = this.m12
      this.c = this.m21
      this.d = this.m22
      this.e = this.m41
      this.f = this.m42
      this.is2D = false
      this.isIdentity = this.m11 === 1 && this.m12 === 0 && this.m13 === 0 && this.m14 === 0
        && this.m21 === 0 && this.m22 === 1 && this.m23 === 0 && this.m24 === 0
        && this.m31 === 0 && this.m32 === 0 && this.m33 === 1 && this.m34 === 0
        && this.m41 === 0 && this.m42 === 0 && this.m43 === 0 && this.m44 === 1
    }
    else {
      // Default to identity matrix
      this.a = 1
      this.m11 = 1
      this.b = 0
      this.m12 = 0
      this.c = 0
      this.m21 = 0
      this.d = 1
      this.m22 = 1
      this.e = 0
      this.m41 = 0
      this.f = 0
      this.m42 = 0
      this.m13 = 0
      this.m14 = 0
      this.m23 = 0
      this.m24 = 0
      this.m31 = 0
      this.m32 = 0
      this.m33 = 1
      this.m34 = 0
      this.m43 = 0
      this.m44 = 1
      this.isIdentity = true
    }
  }

  toJSON(): any {
    return { a: this.a, b: this.b, c: this.c, d: this.d, e: this.e, f: this.f }
  }

  toString(): string {
    return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`
  }
}

export class DOMMatrix extends DOMMatrixReadOnly {
  declare a: number
  declare b: number
  declare c: number
  declare d: number
  declare e: number
  declare f: number
  declare m11: number
  declare m12: number
  declare m13: number
  declare m14: number
  declare m21: number
  declare m22: number
  declare m23: number
  declare m24: number
  declare m31: number
  declare m32: number
  declare m33: number
  declare m34: number
  declare m41: number
  declare m42: number
  declare m43: number
  declare m44: number

  constructor(init?: string | number[]) {
    super(init)
    // Make all matrix properties writable
    for (const prop of ['a', 'b', 'c', 'd', 'e', 'f', 'm11', 'm12', 'm13', 'm14', 'm21', 'm22', 'm23', 'm24', 'm31', 'm32', 'm33', 'm34', 'm41', 'm42', 'm43', 'm44']) {
      Object.defineProperty(this, prop, { value: (this as any)[prop], writable: true, enumerable: true, configurable: true })
    }
  }
}

// ============================================================================
// NodeList
// ============================================================================

export class NodeList<T = any> {
  private _items: T[]

  constructor(items: T[] = []) {
    this._items = items

    // Set up indexed access
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') {
          const idx = Number(prop)
          if (Number.isInteger(idx) && idx >= 0) {
            return target._items[idx]
          }
        }
        return Reflect.get(target, prop, receiver)
      },
    })
  }

  get length(): number { return this._items.length }

  item(index: number): T | null { return this._items[index] ?? null }

  forEach(callback: (value: T, index: number, list: NodeList<T>) => void, thisArg?: any): void {
    this._items.forEach((item, index) => callback.call(thisArg, item, index, this))
  }

  entries(): IterableIterator<[number, T]> { return this._items.entries() }
  keys(): IterableIterator<number> { return this._items.keys() }
  values(): IterableIterator<T> { return this._items.values() }
  [Symbol.iterator](): IterableIterator<T> { return this._items[Symbol.iterator]() }

  [index: number]: T
}

// ============================================================================
// HTMLCollection
// ============================================================================

export class HTMLCollection<T = any> {
  private _items: T[]

  constructor(items: T[] = []) {
    this._items = items

    // Set up indexed access
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') {
          const idx = Number(prop)
          if (Number.isInteger(idx) && idx >= 0) {
            return target._items[idx]
          }
        }
        return Reflect.get(target, prop, receiver)
      },
    })
  }

  get length(): number { return this._items.length }

  item(index: number): T | null { return this._items[index] ?? null }

  namedItem(name: string): T | null {
    return this._items.find((item: any) => item.id === name || item.getAttribute?.('name') === name) ?? null
  }

  [Symbol.iterator](): IterableIterator<T> { return this._items[Symbol.iterator]() }

  [index: number]: T
}

// ============================================================================
// Attr
// ============================================================================

export class Attr {
  readonly name: string
  value: string
  readonly namespaceURI: string | null
  readonly prefix: string | null
  readonly localName: string
  readonly specified: boolean = true
  ownerElement: any = null

  constructor(name: string, value: string = '', namespaceURI: string | null = null) {
    this.name = name
    this.value = value
    this.namespaceURI = namespaceURI
    this.prefix = name.includes(':') ? name.split(':')[0] : null
    this.localName = name.includes(':') ? name.split(':')[1] : name
  }
}

// ============================================================================
// NamedNodeMap
// ============================================================================

export class NamedNodeMap {
  private _attrs: Attr[] = []

  constructor() {
    // Set up indexed access
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'string') {
          const idx = Number(prop)
          if (Number.isInteger(idx) && idx >= 0) {
            return target._attrs[idx]
          }
        }
        return Reflect.get(target, prop, receiver)
      },
    })
  }

  get length(): number { return this._attrs.length }

  item(index: number): Attr | null { return this._attrs[index] ?? null }

  getNamedItem(name: string): Attr | null { return this._attrs.find(a => a.name === name) ?? null }

  setNamedItem(attr: Attr): Attr | null {
    const old = this.getNamedItem(attr.name)
    if (old) {
      this._attrs[this._attrs.indexOf(old)] = attr
    }
    else {
      this._attrs.push(attr)
    }
    return old
  }

  removeNamedItem(name: string): Attr {
    const idx = this._attrs.findIndex(a => a.name === name)
    if (idx === -1) throw new Error(`Attr not found: ${name}`)
    return this._attrs.splice(idx, 1)[0]
  }

  getNamedItemNS(_namespace: string | null, localName: string): Attr | null { return this.getNamedItem(localName) }
  setNamedItemNS(attr: Attr): Attr | null { return this.setNamedItem(attr) }
  removeNamedItemNS(_namespace: string | null, localName: string): Attr { return this.removeNamedItem(localName) }

  [Symbol.iterator](): IterableIterator<Attr> { return this._attrs[Symbol.iterator]() }

  [index: number]: Attr
}

// ============================================================================
// XMLSerializer
// ============================================================================

export class XMLSerializer {
  serializeToString(node: any): string {
    if (!node) return ''
    if (node.outerHTML !== undefined) return node.outerHTML
    if (node.nodeType === 3) return node.nodeValue ?? '' // text node
    if (node.nodeType === 8) return `<!--${node.nodeValue ?? ''}-->` // comment
    if (node.nodeType === 9) { // document
      return node.documentElement ? this.serializeToString(node.documentElement) : ''
    }
    if (node.nodeType === 11) { // fragment
      return node.childNodes?.map((c: any) => this.serializeToString(c)).join('') ?? ''
    }
    return node.toString?.() ?? ''
  }
}

// ============================================================================
// ValidityState
// ============================================================================

export class ValidityState {
  readonly badInput: boolean = false
  readonly customError: boolean = false
  readonly patternMismatch: boolean = false
  readonly rangeOverflow: boolean = false
  readonly rangeUnderflow: boolean = false
  readonly stepMismatch: boolean = false
  readonly tooLong: boolean = false
  readonly tooShort: boolean = false
  readonly typeMismatch: boolean = false
  readonly valid: boolean = true
  readonly valueMissing: boolean = false
}

// ============================================================================
// Screen
// ============================================================================

export class Screen {
  readonly width: number
  readonly height: number
  readonly availWidth: number
  readonly availHeight: number
  readonly colorDepth: number = 24
  readonly pixelDepth: number = 24
  readonly orientation: { type: string, angle: number }

  constructor(width: number = 1024, height: number = 768) {
    this.width = width
    this.height = height
    this.availWidth = width
    this.availHeight = height
    this.orientation = { type: 'landscape-primary', angle: 0 }
  }
}

// ============================================================================
// MediaQueryList
// ============================================================================

export class MediaQueryList {
  readonly matches: boolean
  readonly media: string
  // eslint-disable-next-line pickier/no-unused-vars
  onchange: ((_ev: any) => void) | null = null
  private _listeners: Set<(_ev: any) => void> = new Set()

  constructor(media: string, matches: boolean) {
    this.media = media
    this.matches = matches
  }

  addListener(cb: (ev: any) => void): void { if (cb) this._listeners.add(cb) }
  removeListener(cb: (ev: any) => void): void { this._listeners.delete(cb) }
  addEventListener(_type: string, cb: any): void { if (cb) this._listeners.add(cb) }
  removeEventListener(_type: string, cb: any): void { this._listeners.delete(cb) }
  dispatchEvent(): boolean { return true }
}

// ============================================================================
// DocumentType (stub)
// ============================================================================

export class DocumentType {
  readonly nodeType: number = 10
  readonly name: string
  readonly publicId: string
  readonly systemId: string

  constructor(name: string = 'html', publicId: string = '', systemId: string = '') {
    this.name = name
    this.publicId = publicId
    this.systemId = systemId
  }
}
