import type { Storage } from '../storage/Storage'
import type { DetachedWindowAPI } from './DetachedWindowAPI'
import {
  Attr as VHDAttr,
  DOMMatrix as VHDDOMMatrix,
  DOMMatrixReadOnly as VHDDOMMatrixReadOnly,
  DOMPoint as VHDDOMPoint,
  DOMPointReadOnly as VHDDOMPointReadOnly,
  DOMRect as VHDDOMRect,
  DOMRectReadOnly as VHDDOMRectReadOnly,
  DocumentType as VHDDocumentType,
  HTMLCollection as VHDHTMLCollection,
  MediaQueryList as VHDMediaQueryList,
  NamedNodeMap as VHDNamedNodeMap,
  NodeList as VHDNodeList,
  Screen as VHDScreen,
  ValidityState as VHDValidityState,
  XMLSerializer as VHDXMLSerializer,
} from '../dom/DOMClasses'
import {
  CSS as VHD_CSS,
  CSSConditionRule as VHDCSSConditionRule,
  CSSContainerRule as VHDCSSContainerRule,
  CSSFontFaceRule as VHDCSSFontFaceRule,
  CSSGroupingRule as VHDCSSGroupingRule,
  CSSKeyframeRule as VHDCSSKeyframeRule,
  CSSKeyframesRule as VHDCSSKeyframesRule,
  CSSMediaRule as VHDCSSMediaRule,
  CSSRule as VHDCSSRule,
  CSSScopeRule as VHDCSSScopeRule,
  CSSStyleDeclaration as VHDCSSStyleDeclaration,
  CSSStyleRule as VHDCSSStyleRule,
  CSSStyleSheet as VHDCSSStyleSheet,
  CSSSupportsRule as VHDCSSSupportsRule,
  MediaList as VHDMediaList,
  StylePropertyMap as VHDStylePropertyMap,
  StylePropertyMapReadOnly as VHDStylePropertyMapReadOnly,
} from '../css/CSSOM'
import { DataTransfer, Notification, Performance } from '../apis/BrowserAPIs'
import { CanvasRenderingContext2D, HTMLCanvasElement } from '../apis/Canvas'
import { BroadcastChannel as VHDBroadcastChannel, MessageChannel as VHDMessageChannel, MessagePort as VHDMessagePort } from '../apis/Channel'
import { Navigator as VeryHappyNavigator } from '../apis/Clipboard'
import { ClipboardItem as VHDClipboardItem } from '../apis/Clipboard'
import { EventSource as VHDEventSource } from '../apis/EventSource'
import { VeryHappyFile, VeryHappyFileList, VeryHappyFileReader } from '../apis/FileAPI'
import { VeryHappyFormData } from '../apis/FormData'
import { createIndexedDB, IDBDatabase, IDBFactory, IDBObjectStore, IDBOpenDBRequest, IDBRequest, IDBTransaction } from '../apis/IndexedDB'
import { PerformanceObserver as VHDPerformanceObserver } from '../apis/PerformanceObserver'
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
import {
  SVGAngle,
  SVGAnimationElement,
  SVGCircleElement,
  SVGClipPathElement,
  SVGDefsElement,
  SVGDescElement,
  SVGEllipseElement,
  SVGFEBlendElement,
  SVGFEColorMatrixElement,
  SVGFEComponentTransferElement,
  SVGFECompositeElement,
  SVGFEConvolveMatrixElement,
  SVGFEDiffuseLightingElement,
  SVGFEDisplacementMapElement,
  SVGFEDistantLightElement,
  SVGFEFloodElement,
  SVGFEGaussianBlurElement,
  SVGFEImageElement,
  SVGFEMergeElement,
  SVGFEMergeNodeElement,
  SVGFEMorphologyElement,
  SVGFEOffsetElement,
  SVGFEPointLightElement,
  SVGFESpecularLightingElement,
  SVGFESpotLightElement,
  SVGFETileElement,
  SVGFETurbulenceElement,
  SVGFilterElement,
  SVGForeignObjectElement,
  SVGGElement,
  SVGGeometryElement,
  SVGGraphicsElement,
  SVGImageElement as VHDSVGImageElement,
  SVGLength,
  SVGLineElement,
  SVGLinearGradientElement,
  SVGMarkerElement,
  SVGMaskElement,
  SVGMatrix,
  SVGMetadataElement,
  SVGNumber,
  SVGPathElement,
  SVGPatternElement,
  SVGPoint,
  SVGPolygonElement,
  SVGPolylineElement,
  SVGRadialGradientElement,
  SVGRect,
  SVGRectElement,
  SVGSVGElement,
  SVGScriptElement,
  SVGStopElement,
  SVGStyleElement,
  SVGSwitchElement,
  SVGSymbolElement,
  SVGTSpanElement,
  SVGTextElement,
  SVGTextPathElement,
  SVGTitleElement,
  SVGTransform,
  SVGUseElement,
  SVGViewElement,
} from '../nodes/SVGElementClasses'

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
  public FormData: typeof globalThis.FormData = VeryHappyFormData
  public ClipboardItem: typeof VHDClipboardItem = VHDClipboardItem
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

  // SVG Element subclass constructors
  public SVGSVGElement: typeof SVGSVGElement = SVGSVGElement
  public SVGGraphicsElement: typeof SVGGraphicsElement = SVGGraphicsElement
  public SVGGeometryElement: typeof SVGGeometryElement = SVGGeometryElement
  public SVGAnimationElement: typeof SVGAnimationElement = SVGAnimationElement
  public SVGCircleElement: typeof SVGCircleElement = SVGCircleElement
  public SVGClipPathElement: typeof SVGClipPathElement = SVGClipPathElement
  public SVGDefsElement: typeof SVGDefsElement = SVGDefsElement
  public SVGDescElement: typeof SVGDescElement = SVGDescElement
  public SVGEllipseElement: typeof SVGEllipseElement = SVGEllipseElement
  public SVGFilterElement: typeof SVGFilterElement = SVGFilterElement
  public SVGForeignObjectElement: typeof SVGForeignObjectElement = SVGForeignObjectElement
  public SVGGElement: typeof SVGGElement = SVGGElement
  public SVGImageElement: typeof VHDSVGImageElement = VHDSVGImageElement
  public SVGLineElement: typeof SVGLineElement = SVGLineElement
  public SVGLinearGradientElement: typeof SVGLinearGradientElement = SVGLinearGradientElement
  public SVGMarkerElement: typeof SVGMarkerElement = SVGMarkerElement
  public SVGMaskElement: typeof SVGMaskElement = SVGMaskElement
  public SVGMetadataElement: typeof SVGMetadataElement = SVGMetadataElement
  public SVGPathElement: typeof SVGPathElement = SVGPathElement
  public SVGPatternElement: typeof SVGPatternElement = SVGPatternElement
  public SVGPolygonElement: typeof SVGPolygonElement = SVGPolygonElement
  public SVGPolylineElement: typeof SVGPolylineElement = SVGPolylineElement
  public SVGRadialGradientElement: typeof SVGRadialGradientElement = SVGRadialGradientElement
  public SVGRectElement: typeof SVGRectElement = SVGRectElement
  public SVGScriptElement: typeof SVGScriptElement = SVGScriptElement
  public SVGStopElement: typeof SVGStopElement = SVGStopElement
  public SVGStyleElement: typeof SVGStyleElement = SVGStyleElement
  public SVGSwitchElement: typeof SVGSwitchElement = SVGSwitchElement
  public SVGSymbolElement: typeof SVGSymbolElement = SVGSymbolElement
  public SVGTextElement: typeof SVGTextElement = SVGTextElement
  public SVGTextPathElement: typeof SVGTextPathElement = SVGTextPathElement
  public SVGTitleElement: typeof SVGTitleElement = SVGTitleElement
  public SVGTSpanElement: typeof SVGTSpanElement = SVGTSpanElement
  public SVGUseElement: typeof SVGUseElement = SVGUseElement
  public SVGViewElement: typeof SVGViewElement = SVGViewElement
  public SVGFEBlendElement: typeof SVGFEBlendElement = SVGFEBlendElement
  public SVGFEColorMatrixElement: typeof SVGFEColorMatrixElement = SVGFEColorMatrixElement
  public SVGFEComponentTransferElement: typeof SVGFEComponentTransferElement = SVGFEComponentTransferElement
  public SVGFECompositeElement: typeof SVGFECompositeElement = SVGFECompositeElement
  public SVGFEConvolveMatrixElement: typeof SVGFEConvolveMatrixElement = SVGFEConvolveMatrixElement
  public SVGFEDiffuseLightingElement: typeof SVGFEDiffuseLightingElement = SVGFEDiffuseLightingElement
  public SVGFEDisplacementMapElement: typeof SVGFEDisplacementMapElement = SVGFEDisplacementMapElement
  public SVGFEDistantLightElement: typeof SVGFEDistantLightElement = SVGFEDistantLightElement
  public SVGFEFloodElement: typeof SVGFEFloodElement = SVGFEFloodElement
  public SVGFEGaussianBlurElement: typeof SVGFEGaussianBlurElement = SVGFEGaussianBlurElement
  public SVGFEImageElement: typeof SVGFEImageElement = SVGFEImageElement
  public SVGFEMergeElement: typeof SVGFEMergeElement = SVGFEMergeElement
  public SVGFEMergeNodeElement: typeof SVGFEMergeNodeElement = SVGFEMergeNodeElement
  public SVGFEMorphologyElement: typeof SVGFEMorphologyElement = SVGFEMorphologyElement
  public SVGFEOffsetElement: typeof SVGFEOffsetElement = SVGFEOffsetElement
  public SVGFEPointLightElement: typeof SVGFEPointLightElement = SVGFEPointLightElement
  public SVGFESpecularLightingElement: typeof SVGFESpecularLightingElement = SVGFESpecularLightingElement
  public SVGFESpotLightElement: typeof SVGFESpotLightElement = SVGFESpotLightElement
  public SVGFETileElement: typeof SVGFETileElement = SVGFETileElement
  public SVGFETurbulenceElement: typeof SVGFETurbulenceElement = SVGFETurbulenceElement

  // SVG Data classes
  public SVGAngle: typeof SVGAngle = SVGAngle
  public SVGLength: typeof SVGLength = SVGLength
  public SVGNumber: typeof SVGNumber = SVGNumber
  public SVGPoint: typeof SVGPoint = SVGPoint
  public SVGRect: typeof SVGRect = SVGRect
  public SVGMatrix: typeof SVGMatrix = SVGMatrix
  public SVGTransform: typeof SVGTransform = SVGTransform

  // CSSOM classes
  public CSSStyleSheet: typeof VHDCSSStyleSheet = VHDCSSStyleSheet
  public CSSStyleDeclaration: typeof VHDCSSStyleDeclaration = VHDCSSStyleDeclaration
  public CSSRule: typeof VHDCSSRule = VHDCSSRule
  public CSSStyleRule: typeof VHDCSSStyleRule = VHDCSSStyleRule
  public CSSMediaRule: typeof VHDCSSMediaRule = VHDCSSMediaRule
  public CSSKeyframesRule: typeof VHDCSSKeyframesRule = VHDCSSKeyframesRule
  public CSSKeyframeRule: typeof VHDCSSKeyframeRule = VHDCSSKeyframeRule
  public CSSFontFaceRule: typeof VHDCSSFontFaceRule = VHDCSSFontFaceRule
  public CSSSupportsRule: typeof VHDCSSSupportsRule = VHDCSSSupportsRule
  public CSSContainerRule: typeof VHDCSSContainerRule = VHDCSSContainerRule
  public CSSConditionRule: typeof VHDCSSConditionRule = VHDCSSConditionRule
  public CSSGroupingRule: typeof VHDCSSGroupingRule = VHDCSSGroupingRule
  public CSSScopeRule: typeof VHDCSSScopeRule = VHDCSSScopeRule
  public CSS: typeof VHD_CSS = VHD_CSS
  public MediaList: typeof VHDMediaList = VHDMediaList
  public StylePropertyMap: typeof VHDStylePropertyMap = VHDStylePropertyMap
  public StylePropertyMapReadOnly: typeof VHDStylePropertyMapReadOnly = VHDStylePropertyMapReadOnly

  // DOM geometry classes
  public DOMRect: typeof VHDDOMRect = VHDDOMRect
  public DOMRectReadOnly: typeof VHDDOMRectReadOnly = VHDDOMRectReadOnly
  public DOMPoint: typeof VHDDOMPoint = VHDDOMPoint
  public DOMPointReadOnly: typeof VHDDOMPointReadOnly = VHDDOMPointReadOnly
  public DOMMatrix: typeof VHDDOMMatrix = VHDDOMMatrix
  public DOMMatrixReadOnly: typeof VHDDOMMatrixReadOnly = VHDDOMMatrixReadOnly

  // DOM collection classes
  public NodeList: typeof VHDNodeList = VHDNodeList
  public HTMLCollection: typeof VHDHTMLCollection = VHDHTMLCollection
  public NamedNodeMap: typeof VHDNamedNodeMap = VHDNamedNodeMap
  public Attr: typeof VHDAttr = VHDAttr

  // DOM utility classes
  public XMLSerializer: typeof VHDXMLSerializer = VHDXMLSerializer
  public ValidityState: typeof VHDValidityState = VHDValidityState
  public Screen: typeof VHDScreen = VHDScreen
  public MediaQueryList: typeof VHDMediaQueryList = VHDMediaQueryList
  public DocumentType: typeof VHDDocumentType = VHDDocumentType

  // Document type aliases
  public HTMLDocument: typeof VirtualDocument = VirtualDocument
  public XMLDocument: typeof VirtualDocument = VirtualDocument

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

  // Messaging / streaming
  public BroadcastChannel: typeof VHDBroadcastChannel = VHDBroadcastChannel
  public MessageChannel: typeof VHDMessageChannel = VHDMessageChannel
  public MessagePort: typeof VHDMessagePort = VHDMessagePort
  public EventSource: typeof VHDEventSource = VHDEventSource
  public PerformanceObserver: typeof VHDPerformanceObserver = VHDPerformanceObserver

  // IndexedDB (in-memory)
  public indexedDB: IDBFactory = createIndexedDB()
  public IDBFactory: typeof IDBFactory = IDBFactory
  public IDBDatabase: typeof IDBDatabase = IDBDatabase
  public IDBObjectStore: typeof IDBObjectStore = IDBObjectStore
  public IDBTransaction: typeof IDBTransaction = IDBTransaction
  public IDBRequest: typeof IDBRequest = IDBRequest
  public IDBOpenDBRequest: typeof IDBOpenDBRequest = IDBOpenDBRequest

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
  public opener: Window | null = null

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

    // Push the URL into the document's live location state so the window
    // and document share a single source of truth (history.pushState, etc.).
    if (url) {
      try {
        this.document.location.href = url
      }
      catch {
        // Fall through to fallback _location below.
      }
    }
    this._location = this._createLocation(url)

    // Import DetachedWindowAPI lazily to avoid circular dependency
    // eslint-disable-next-line ts/no-require-imports
    const { DetachedWindowAPI } = require('./DetachedWindowAPI')
    this.happyDOM = new DetachedWindowAPI(this)
  }

  get location(): Location {
    // Delegate to the document's live location so history.pushState and
    // direct URL mutation stay in sync with window.location.
    return (this.document?.location as unknown as Location) ?? this._location
  }

  set location(url: string | Location) {
    const urlString = typeof url === 'string' ? url : url.href
    if (this.document)
      this.document.location.href = urlString
    else
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

  get screen(): VHDScreen {
    return new VHDScreen(this._width, this._height)
  }

  get isSecureContext(): boolean {
    return this._location.protocol === 'https:'
  }

  get origin(): string {
    return this._location.origin
  }

  matchMedia(query: string): VHDMediaQueryList {
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

    return new VHDMediaQueryList(query, matches)
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

  scrollTo(x?: number | ScrollToOptions, y?: number): void {
    if (typeof x === 'object' && x !== null) {
      if (typeof x.left === 'number') this.scrollX = x.left
      if (typeof x.top === 'number') this.scrollY = x.top
      return
    }
    if (typeof x === 'number') this.scrollX = x
    if (typeof y === 'number') this.scrollY = y
  }

  scroll(x?: number | ScrollToOptions, y?: number): void {
    this.scrollTo(x, y)
  }

  scrollBy(x?: number | ScrollToOptions, y?: number): void {
    if (typeof x === 'object' && x !== null) {
      if (typeof x.left === 'number') this.scrollX += x.left
      if (typeof x.top === 'number') this.scrollY += x.top
      return
    }
    if (typeof x === 'number') this.scrollX += x
    if (typeof y === 'number') this.scrollY += y
  }

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
