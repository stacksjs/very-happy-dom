import type { Storage } from '../storage/Storage'
import type { DetachedWindowAPI } from './DetachedWindowAPI'
import { DataTransfer, Notification, Performance } from '../apis/BrowserAPIs'
import { CanvasRenderingContext2D, HTMLCanvasElement } from '../apis/Canvas'
import { Navigator as VeryHappyNavigator } from '../apis/Clipboard'
import { VeryHappyFile, VeryHappyFileList, VeryHappyFileReader } from '../apis/FileAPI'
import { CustomEvent as VeryHappyCustomEvent } from '../events/CustomEvent'
import {
  AnimationEvent as VHDAnimationEvent,
  ClipboardEvent as VHDClipboardEvent,
  CloseEvent as VHDCloseEvent,
  CompositionEvent as VHDCompositionEvent,
  DragEvent as VHDDragEvent,
  ErrorEvent as VHDErrorEvent,
  FocusEvent as VHDFocusEvent,
  HashChangeEvent as VHDHashChangeEvent,
  InputEvent as VHDInputEvent,
  KeyboardEvent as VHDKeyboardEvent,
  MediaQueryListEvent as VHDMediaQueryListEvent,
  MessageEvent as VHDMessageEvent,
  MouseEvent as VHDMouseEvent,
  PointerEvent as VHDPointerEvent,
  PopStateEvent as VHDPopStateEvent,
  ProgressEvent as VHDProgressEvent,
  StorageEvent as VHDStorageEvent,
  SubmitEvent as VHDSubmitEvent,
  Touch as VHDTouch,
  TouchEvent as VHDTouchEvent,
  TransitionEvent as VHDTransitionEvent,
  UIEvent as VHDUIEvent,
  WheelEvent as VHDWheelEvent,
} from '../events/EventClasses'
import { VirtualEventTarget } from '../events/VirtualEventTarget'
import { VirtualEvent } from '../events/VirtualEvent'
import { XMLHttpRequest as VeryHappyXMLHttpRequest } from '../http/XMLHttpRequest'
import { VeryHappyWebSocket } from '../network/WebSocket'
import { parseHTML } from '../parsers/html-parser'
import { VirtualCommentNode } from '../nodes/VirtualCommentNode'
import { VirtualDocument } from '../nodes/VirtualDocument'
import { VirtualDocumentFragment } from '../nodes/VirtualDocumentFragment'
import { VirtualElement } from '../nodes/VirtualElement'
import type { History as VirtualHistory } from '../nodes/VirtualNode'
import { VirtualNodeBase } from '../nodes/VirtualNode'
import { VirtualSVGElement } from '../nodes/VirtualSVGElement'
import { VirtualTemplateElement } from '../nodes/VirtualTemplateElement'
import { VirtualTextNode } from '../nodes/VirtualTextNode'
import { IntersectionObserver as VeryHappyIntersectionObserver } from '../observers/IntersectionObserver'
import { MutationObserver as VeryHappyMutationObserver } from '../observers/MutationObserver'
import { ResizeObserver as VeryHappyResizeObserver } from '../observers/ResizeObserver'
import { createStorage } from '../storage/Storage'
import { TimerManager } from '../timers/TimerManager'
import { NodeFilter, NodeIterator, Range, Selection, TreeWalker } from '../traversal'
import { CustomElementRegistry, HTMLElement } from '../webcomponents/CustomElementRegistry'
import {
  Audio,
  HTMLAnchorElement,
  HTMLAreaElement,
  HTMLAudioElement,
  HTMLBaseElement,
  HTMLBodyElement,
  HTMLBRElement,
  HTMLButtonElement,
  HTMLDataElement,
  HTMLDataListElement,
  HTMLDetailsElement,
  HTMLDialogElement,
  HTMLDivElement,
  HTMLDListElement,
  HTMLEmbedElement,
  HTMLFieldSetElement,
  HTMLFormElement,
  HTMLHeadElement,
  HTMLHeadingElement,
  HTMLHRElement,
  HTMLHtmlElement,
  HTMLIFrameElement,
  HTMLImageElement,
  HTMLInputElement,
  HTMLLabelElement,
  HTMLLegendElement,
  HTMLLIElement,
  HTMLLinkElement,
  HTMLMapElement,
  HTMLMediaElement,
  HTMLMenuElement,
  HTMLMetaElement,
  HTMLMeterElement,
  HTMLModElement,
  HTMLObjectElement,
  HTMLOListElement,
  HTMLOptGroupElement,
  HTMLOptionElement,
  HTMLOutputElement,
  HTMLParagraphElement,
  HTMLParamElement,
  HTMLPictureElement,
  HTMLPreElement,
  HTMLProgressElement,
  HTMLQuoteElement,
  HTMLScriptElement,
  HTMLSelectElement,
  HTMLSlotElement,
  HTMLSourceElement,
  HTMLSpanElement,
  HTMLStyleElement,
  HTMLTableCaptionElement,
  HTMLTableCellElement,
  HTMLTableColElement,
  HTMLTableElement,
  HTMLTableRowElement,
  HTMLTableSectionElement,
  HTMLTextAreaElement,
  HTMLTimeElement,
  HTMLTitleElement,
  HTMLTrackElement,
  HTMLUListElement,
  HTMLUnknownElement,
  HTMLVideoElement,
  Image,
} from '../nodes/HTMLElementClasses'

export interface WindowOptions {
  url?: string
  width?: number
  height?: number
  console?: Console
  settings?: IOptionalBrowserSettings
}

export interface IOptionalBrowserSettings {
  navigator?: {
    userAgent?: string
  }
  device?: {
    prefersColorScheme?: 'light' | 'dark'
  }
}

export interface IBrowserSettings {
  navigator: {
    userAgent: string
  }
  device: {
    prefersColorScheme: 'light' | 'dark'
  }
}

/**
 * Window represents a browser window instance
 * Compatible with Happy DOM's Window API
 */
export class Window extends VirtualEventTarget {
  public document: VirtualDocument
  public happyDOM: DetachedWindowAPI
  public console: Console
  public navigator: VeryHappyNavigator
  public customElements: CustomElementRegistry
  public HTMLElement: typeof HTMLElement = HTMLElement
  public localStorage: Storage
  public sessionStorage: Storage

  // Global APIs from Bun/Browser
  public fetch: typeof globalThis.fetch = globalThis.fetch.bind(globalThis)
  public Request: typeof globalThis.Request = globalThis.Request
  public Response: typeof globalThis.Response = globalThis.Response
  public Headers: typeof globalThis.Headers = globalThis.Headers
  public FormData: typeof globalThis.FormData = globalThis.FormData
  public URL: typeof globalThis.URL = globalThis.URL
  public URLSearchParams: typeof globalThis.URLSearchParams = globalThis.URLSearchParams
  public AbortController: typeof globalThis.AbortController = globalThis.AbortController
  public AbortSignal: typeof globalThis.AbortSignal = globalThis.AbortSignal
  public Blob: typeof globalThis.Blob = globalThis.Blob
  public TextEncoder: typeof globalThis.TextEncoder = globalThis.TextEncoder
  public TextDecoder: typeof globalThis.TextDecoder = globalThis.TextDecoder
  public ReadableStream: typeof globalThis.ReadableStream = globalThis.ReadableStream
  public WritableStream: typeof globalThis.WritableStream = globalThis.WritableStream
  public TransformStream: typeof globalThis.TransformStream = globalThis.TransformStream

  // Observer APIs
  public CustomEvent: typeof VeryHappyCustomEvent = VeryHappyCustomEvent
  public MutationObserver: typeof VeryHappyMutationObserver = VeryHappyMutationObserver
  public IntersectionObserver: typeof VeryHappyIntersectionObserver = VeryHappyIntersectionObserver
  public ResizeObserver: typeof VeryHappyResizeObserver = VeryHappyResizeObserver

  // Legacy HTTP API
  public XMLHttpRequest: typeof VeryHappyXMLHttpRequest = VeryHappyXMLHttpRequest

  // WebSocket API
  public WebSocket: typeof VeryHappyWebSocket = VeryHappyWebSocket

  // File API
  public File: typeof VeryHappyFile = VeryHappyFile
  public FileReader: typeof VeryHappyFileReader = VeryHappyFileReader
  public FileList: typeof VeryHappyFileList = VeryHappyFileList

  // Canvas API
  public HTMLCanvasElement: typeof HTMLCanvasElement = HTMLCanvasElement
  public CanvasRenderingContext2D: typeof CanvasRenderingContext2D = CanvasRenderingContext2D

  // HTML Element subclass constructors (aliases for compatibility)
  public HTMLAnchorElement: typeof HTMLAnchorElement = HTMLAnchorElement
  public HTMLAreaElement: typeof HTMLAreaElement = HTMLAreaElement
  public HTMLAudioElement: typeof HTMLAudioElement = HTMLAudioElement
  public HTMLBaseElement: typeof HTMLBaseElement = HTMLBaseElement
  public HTMLBodyElement: typeof HTMLBodyElement = HTMLBodyElement
  public HTMLBRElement: typeof HTMLBRElement = HTMLBRElement
  public HTMLButtonElement: typeof HTMLButtonElement = HTMLButtonElement
  public HTMLDataElement: typeof HTMLDataElement = HTMLDataElement
  public HTMLDataListElement: typeof HTMLDataListElement = HTMLDataListElement
  public HTMLDetailsElement: typeof HTMLDetailsElement = HTMLDetailsElement
  public HTMLDialogElement: typeof HTMLDialogElement = HTMLDialogElement
  public HTMLDivElement: typeof HTMLDivElement = HTMLDivElement
  public HTMLDListElement: typeof HTMLDListElement = HTMLDListElement
  public HTMLEmbedElement: typeof HTMLEmbedElement = HTMLEmbedElement
  public HTMLFieldSetElement: typeof HTMLFieldSetElement = HTMLFieldSetElement
  public HTMLFormElement: typeof HTMLFormElement = HTMLFormElement
  public HTMLHeadElement: typeof HTMLHeadElement = HTMLHeadElement
  public HTMLHeadingElement: typeof HTMLHeadingElement = HTMLHeadingElement
  public HTMLHRElement: typeof HTMLHRElement = HTMLHRElement
  public HTMLHtmlElement: typeof HTMLHtmlElement = HTMLHtmlElement
  public HTMLIFrameElement: typeof HTMLIFrameElement = HTMLIFrameElement
  public HTMLImageElement: typeof HTMLImageElement = HTMLImageElement
  public HTMLInputElement: typeof HTMLInputElement = HTMLInputElement
  public HTMLLabelElement: typeof HTMLLabelElement = HTMLLabelElement
  public HTMLLegendElement: typeof HTMLLegendElement = HTMLLegendElement
  public HTMLLIElement: typeof HTMLLIElement = HTMLLIElement
  public HTMLLinkElement: typeof HTMLLinkElement = HTMLLinkElement
  public HTMLMapElement: typeof HTMLMapElement = HTMLMapElement
  public HTMLMediaElement: typeof HTMLMediaElement = HTMLMediaElement
  public HTMLMenuElement: typeof HTMLMenuElement = HTMLMenuElement
  public HTMLMetaElement: typeof HTMLMetaElement = HTMLMetaElement
  public HTMLMeterElement: typeof HTMLMeterElement = HTMLMeterElement
  public HTMLModElement: typeof HTMLModElement = HTMLModElement
  public HTMLObjectElement: typeof HTMLObjectElement = HTMLObjectElement
  public HTMLOListElement: typeof HTMLOListElement = HTMLOListElement
  public HTMLOptGroupElement: typeof HTMLOptGroupElement = HTMLOptGroupElement
  public HTMLOptionElement: typeof HTMLOptionElement = HTMLOptionElement
  public HTMLOutputElement: typeof HTMLOutputElement = HTMLOutputElement
  public HTMLParagraphElement: typeof HTMLParagraphElement = HTMLParagraphElement
  public HTMLParamElement: typeof HTMLParamElement = HTMLParamElement
  public HTMLPictureElement: typeof HTMLPictureElement = HTMLPictureElement
  public HTMLPreElement: typeof HTMLPreElement = HTMLPreElement
  public HTMLProgressElement: typeof HTMLProgressElement = HTMLProgressElement
  public HTMLQuoteElement: typeof HTMLQuoteElement = HTMLQuoteElement
  public HTMLScriptElement: typeof HTMLScriptElement = HTMLScriptElement
  public HTMLSelectElement: typeof HTMLSelectElement = HTMLSelectElement
  public HTMLSlotElement: typeof HTMLSlotElement = HTMLSlotElement
  public HTMLSourceElement: typeof HTMLSourceElement = HTMLSourceElement
  public HTMLSpanElement: typeof HTMLSpanElement = HTMLSpanElement
  public HTMLStyleElement: typeof HTMLStyleElement = HTMLStyleElement
  public HTMLTableCaptionElement: typeof HTMLTableCaptionElement = HTMLTableCaptionElement
  public HTMLTableCellElement: typeof HTMLTableCellElement = HTMLTableCellElement
  public HTMLTableColElement: typeof HTMLTableColElement = HTMLTableColElement
  public HTMLTableElement: typeof HTMLTableElement = HTMLTableElement
  public HTMLTableRowElement: typeof HTMLTableRowElement = HTMLTableRowElement
  public HTMLTableSectionElement: typeof HTMLTableSectionElement = HTMLTableSectionElement
  public HTMLTextAreaElement: typeof HTMLTextAreaElement = HTMLTextAreaElement
  public HTMLTimeElement: typeof HTMLTimeElement = HTMLTimeElement
  public HTMLTitleElement: typeof HTMLTitleElement = HTMLTitleElement
  public HTMLTrackElement: typeof HTMLTrackElement = HTMLTrackElement
  public HTMLUListElement: typeof HTMLUListElement = HTMLUListElement
  public HTMLUnknownElement: typeof HTMLUnknownElement = HTMLUnknownElement
  public HTMLVideoElement: typeof HTMLVideoElement = HTMLVideoElement
  public Image: typeof Image = Image
  public Audio: typeof Audio = Audio

  // DOM node constructors
  public Document: typeof VirtualDocument = VirtualDocument
  public Element: typeof VirtualElement = VirtualElement
  public HTMLTemplateElement: typeof VirtualTemplateElement = VirtualTemplateElement
  public Node: typeof VirtualNodeBase = VirtualNodeBase
  public NodeFilter: typeof NodeFilter = NodeFilter
  public NodeIterator: typeof NodeIterator = NodeIterator
  public Range: typeof Range = Range
  public Selection: typeof Selection = Selection
  public Text: typeof VirtualTextNode = VirtualTextNode
  public TreeWalker: typeof TreeWalker = TreeWalker
  public Comment: typeof VirtualCommentNode = VirtualCommentNode
  public DocumentFragment: typeof VirtualDocumentFragment = VirtualDocumentFragment
  public Event: typeof VirtualEvent = VirtualEvent
  public SVGElement: typeof VirtualSVGElement = VirtualSVGElement

  // Event subclass constructors
  public UIEvent: typeof VHDUIEvent = VHDUIEvent
  public MouseEvent: typeof VHDMouseEvent = VHDMouseEvent
  public KeyboardEvent: typeof VHDKeyboardEvent = VHDKeyboardEvent
  public FocusEvent: typeof VHDFocusEvent = VHDFocusEvent
  public InputEvent: typeof VHDInputEvent = VHDInputEvent
  public WheelEvent: typeof VHDWheelEvent = VHDWheelEvent
  public PointerEvent: typeof VHDPointerEvent = VHDPointerEvent
  public TouchEvent: typeof VHDTouchEvent = VHDTouchEvent
  public Touch: typeof VHDTouch = VHDTouch
  public AnimationEvent: typeof VHDAnimationEvent = VHDAnimationEvent
  public TransitionEvent: typeof VHDTransitionEvent = VHDTransitionEvent
  public ClipboardEvent: typeof VHDClipboardEvent = VHDClipboardEvent
  public DragEvent: typeof VHDDragEvent = VHDDragEvent
  public ErrorEvent: typeof VHDErrorEvent = VHDErrorEvent
  public HashChangeEvent: typeof VHDHashChangeEvent = VHDHashChangeEvent
  public PopStateEvent: typeof VHDPopStateEvent = VHDPopStateEvent
  public ProgressEvent: typeof VHDProgressEvent = VHDProgressEvent
  public MessageEvent: typeof VHDMessageEvent = VHDMessageEvent
  public CloseEvent: typeof VHDCloseEvent = VHDCloseEvent
  public StorageEvent: typeof VHDStorageEvent = VHDStorageEvent
  public SubmitEvent: typeof VHDSubmitEvent = VHDSubmitEvent
  public MediaQueryListEvent: typeof VHDMediaQueryListEvent = VHDMediaQueryListEvent
  public CompositionEvent: typeof VHDCompositionEvent = VHDCompositionEvent

  // Additional Browser APIs
  public performance: Performance = new Performance()
  public Notification: typeof Notification = Notification
  public DataTransfer: typeof DataTransfer = DataTransfer
  public crypto: Crypto = globalThis.crypto

  // DOMParser
  public DOMParser: { new(): { parseFromString(html: string, mimeType: string): VirtualDocument } } = class DOMParser {
    parseFromString(html: string, mimeType: string): VirtualDocument {
      const doc = new VirtualDocument()
      if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') {
        const nodes = parseHTML(html, doc)
        // Look for an <html> node in parsed output
        for (const node of nodes) {
          if ((node as any).tagName === 'HTML') {
            doc.childNodes = []
            doc.documentElement = node as any
            doc.appendChild(node)
            for (const child of (node as any).children) {
              if ((child as any).tagName === 'HEAD') doc.head = child as any
              else if ((child as any).tagName === 'BODY') doc.body = child as any
            }
            return doc
          }
        }
        // No <html> wrapper — append to body
        if (doc.body) {
          doc.body.childNodes = []
          for (const node of nodes) {
            doc.body.appendChild(node)
          }
        }
      }
      else if (mimeType === 'text/xml' || mimeType === 'application/xml' || mimeType === 'image/svg+xml') {
        const nodes = parseHTML(html, doc)
        doc.childNodes = []
        for (const node of nodes) {
          doc.appendChild(node)
        }
      }
      return doc
    }
  }

  // Window self-references
  public get self(): this { return this }
  public get window(): this { return this }
  public get parent(): this { return this }
  public get top(): this { return this }
  public get frames(): this { return this }
  public frameElement: null = null

  // Window state
  public name: string = ''
  public closed: boolean = false

  // Scroll state
  public scrollX: number = 0
  public scrollY: number = 0
  public get pageXOffset(): number { return this.scrollX }
  public get pageYOffset(): number { return this.scrollY }

  // Display properties
  public devicePixelRatio: number = 1

  // Global delegates
  public atob(data: string): string { return globalThis.atob(data) }
  public btoa(data: string): string { return globalThis.btoa(data) }
  public queueMicrotask(callback: () => void): void { globalThis.queueMicrotask(callback) }
  public structuredClone<T>(value: T, options?: StructuredSerializeOptions): T { return globalThis.structuredClone(value, options) }

  private _location: Location
  private _settings: IBrowserSettings
  private _width: number
  private _height: number
  private _timerManager: TimerManager
  private _idleCallbackId: number = 0

  constructor(options: WindowOptions = {}) {
    super()
    const {
      url = 'about:blank',
      width = 1024,
      height = 768,
      console: consoleInstance,
      settings = {},
    } = options

    this._width = width
    this._height = height

    // Initialize settings with defaults
    this._settings = {
      navigator: {
        userAgent: settings.navigator?.userAgent || 'Mozilla/5.0 (X11; Linux x64) AppleWebKit/537.36 (KHTML, like Gecko) VeryHappyDOM/1.0.0',
      },
      device: {
        prefersColorScheme: settings.device?.prefersColorScheme || 'light',
      },
    }

    // Use provided console or global console
    this.console = consoleInstance || globalThis.console

    // Create navigator
    this.navigator = new VeryHappyNavigator()

    this.customElements = new CustomElementRegistry()

    // Create storage
    this.localStorage = createStorage()
    this.sessionStorage = createStorage()

    // Create timer manager
    this._timerManager = new TimerManager()

    // Create document
    this.document = new VirtualDocument()
    this.document.defaultView = this
    this.customElements._setDocument(this.document)

    // Create location object
    this._location = this._createLocation(url)

    // Import DetachedWindowAPI lazily to avoid circular dependency
    // eslint-disable-next-line ts/no-require-imports
    const { DetachedWindowAPI } = require('./DetachedWindowAPI')
    this.happyDOM = new DetachedWindowAPI(this)
  }

  get location(): Location {
    return this._location
  }

  set location(url: string | Location) {
    const urlString = typeof url === 'string' ? url : url.href
    this._location = this._createLocation(urlString)
  }

  get innerWidth(): number {
    return this._width
  }

  get innerHeight(): number {
    return this._height
  }

  get outerWidth(): number {
    return this._width
  }

  get outerHeight(): number {
    return this._height
  }

  getSelection(): Selection {
    return this.document.getSelection()
  }

  private _createLocation(url: string): Location {
    try {
      const parsed = new URL(url)
      return {
        href: parsed.href,
        origin: parsed.origin,
        protocol: parsed.protocol,
        host: parsed.host,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        assign: (url: string) => {
          this.location = url
        },
        replace: (url: string) => {
          this.location = url
        },
        reload: () => {
          // No-op for now
        },
        toString: () => parsed.href,
      } as Location
    }
    catch {
      // Fallback for invalid URLs
      return {
        href: url,
        origin: '',
        protocol: '',
        host: '',
        hostname: '',
        port: '',
        pathname: '',
        search: '',
        hash: '',
        assign: (url: string) => {
          this.location = url
        },
        replace: (url: string) => {
          this.location = url
        },
        reload: () => {},
        toString: () => url,
      } as Location
    }
  }

  // Getter for settings (through happyDOM API)
  get settings(): IBrowserSettings {
    return this._settings
  }

  // Timer methods
  setTimeout(callback: (...args: any[]) => void, delay?: number, ...args: any[]): number {
    return this._timerManager.setTimeout(callback, delay, ...args)
  }

  clearTimeout(id: number): void {
    this._timerManager.clearTimeout(id)
  }

  setInterval(callback: (...args: any[]) => void, delay?: number, ...args: any[]): number {
    return this._timerManager.setInterval(callback, delay, ...args)
  }

  clearInterval(id: number): void {
    this._timerManager.clearInterval(id)
  }

  requestAnimationFrame(callback: (time: number) => void): number {
    return this._timerManager.requestAnimationFrame(callback)
  }

  cancelAnimationFrame(id: number): void {
    this._timerManager.cancelAnimationFrame(id)
  }

  getComputedStyle(element: any, _pseudoElt?: string | null): any {
    return this.document.getComputedStyle(element)
  }

  get screen(): {
    width: number
    height: number
    availWidth: number
    availHeight: number
    colorDepth: number
    pixelDepth: number
    orientation: { type: string, angle: number }
  } {
    return {
      width: this._width,
      height: this._height,
      availWidth: this._width,
      availHeight: this._height,
      colorDepth: 24,
      pixelDepth: 24,
      orientation: { type: 'landscape-primary', angle: 0 },
    }
  }

  get isSecureContext(): boolean {
    return this._location.protocol === 'https:'
  }

  get origin(): string {
    return this._location.origin
  }

  matchMedia(query: string): {
    matches: boolean
    media: string
    onchange: null
    addListener: (cb: any) => void
    removeListener: (cb: any) => void
    addEventListener: (type: string, cb: any) => void
    removeEventListener: (type: string, cb: any) => void
    dispatchEvent: () => true
  } {
    let matches = false

    // prefers-color-scheme
    const colorSchemeMatch = query.match(/\(\s*prefers-color-scheme\s*:\s*(light|dark)\s*\)/)
    if (colorSchemeMatch) {
      matches = this._settings.device.prefersColorScheme === colorSchemeMatch[1]
    }

    // min-width / max-width
    const minWidthMatch = query.match(/\(\s*min-width\s*:\s*(\d+(?:\.\d+)?)(px|em|rem)?\s*\)/)
    if (minWidthMatch) {
      const value = Number.parseFloat(minWidthMatch[1])
      matches = this._width >= value
    }
    const maxWidthMatch = query.match(/\(\s*max-width\s*:\s*(\d+(?:\.\d+)?)(px|em|rem)?\s*\)/)
    if (maxWidthMatch) {
      const value = Number.parseFloat(maxWidthMatch[1])
      matches = this._width <= value
    }

    // min-height / max-height
    const minHeightMatch = query.match(/\(\s*min-height\s*:\s*(\d+(?:\.\d+)?)(px|em|rem)?\s*\)/)
    if (minHeightMatch) {
      const value = Number.parseFloat(minHeightMatch[1])
      matches = this._height >= value
    }
    const maxHeightMatch = query.match(/\(\s*max-height\s*:\s*(\d+(?:\.\d+)?)(px|em|rem)?\s*\)/)
    if (maxHeightMatch) {
      const value = Number.parseFloat(maxHeightMatch[1])
      matches = this._height <= value
    }

    // orientation
    const orientationMatch = query.match(/\(\s*orientation\s*:\s*(portrait|landscape)\s*\)/)
    if (orientationMatch) {
      const isPortrait = this._height >= this._width
      matches = orientationMatch[1] === 'portrait' ? isPortrait : !isPortrait
    }

    // prefers-reduced-motion
    const reducedMotionMatch = query.match(/\(\s*prefers-reduced-motion\s*:\s*(reduce|no-preference)\s*\)/)
    if (reducedMotionMatch) {
      matches = reducedMotionMatch[1] === 'no-preference'
    }

    const listeners = new Set<(event: any) => void>()
    return {
      matches,
      media: query,
      onchange: null,
      addListener: (cb: any) => { if (cb) listeners.add(cb) },
      removeListener: (cb: any) => { listeners.delete(cb) },
      addEventListener: (_type: string, cb: any) => { if (cb) listeners.add(cb) },
      removeEventListener: (_type: string, cb: any) => { listeners.delete(cb) },
      dispatchEvent: () => true,
    }
  }

  // History proxy — delegates to document.history
  get history(): VirtualHistory {
    return this.document.history
  }

  // postMessage
  postMessage(message: any, targetOrigin?: string, transfer?: Transferable[]): void
  postMessage(message: any, options?: { targetOrigin?: string, transfer?: Transferable[] }): void
  postMessage(message: any, targetOriginOrOptions?: string | { targetOrigin?: string, transfer?: Transferable[] }): void {
    const origin = typeof targetOriginOrOptions === 'string' ? targetOriginOrOptions : (targetOriginOrOptions?.targetOrigin ?? '*')
    setTimeout(() => {
      const event = new VirtualEvent('message') as any
      event.data = message
      event.origin = origin === '*' ? this._location.origin : origin
      event.source = this
      event.ports = []
      this.dispatchEvent(event)
    }, 0)
  }

  // Idle callbacks
  requestIdleCallback(callback: (deadline: { didTimeout: boolean, timeRemaining: () => number }) => void, options?: { timeout?: number }): number {
    const id = ++this._idleCallbackId
    const timeout = options?.timeout ?? 50
    this._timerManager.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, timeout),
      })
    }, 0)
    return id
  }

  cancelIdleCallback(_id: number): void {
    // Timer already scheduled with setTimeout; cancellation is best-effort
  }

  // Focus/blur on window
  focus(): void {}
  blur(): void {}
  print(): void {}
  stop(): void {}

  open(): null {
    return null
  }

  close(): void {
    this.closed = true
  }

  // Resize/move (no-ops)
  resizeTo(_width: number, _height: number): void {}
  resizeBy(_dw: number, _dh: number): void {}
  moveTo(_x: number, _y: number): void {}
  moveBy(_dx: number, _dy: number): void {}

  scrollTo(_x?: number | ScrollToOptions, _y?: number): void {}

  scrollBy(_x?: number | ScrollToOptions, _y?: number): void {}

  alert(_message?: string): void {}

  confirm(_message?: string): boolean {
    return false
  }

  prompt(_message?: string, _default?: string): string | null {
    return null
  }

  /**
   * Get timer manager for internal use
   * @internal
   */
  _getTimerManager(): TimerManager {
    return this._timerManager
  }
}

interface Location {
  href: string
  origin: string
  protocol: string
  host: string
  hostname: string
  port: string
  pathname: string
  search: string
  hash: string
  assign: (url: string) => void
  replace: (url: string) => void
  reload: () => void
  toString: () => string
}
