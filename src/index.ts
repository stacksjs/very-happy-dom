// Export Browser APIs
export { DataTransfer, EnhancedConsole, Geolocation, Notification, Performance } from './apis/BrowserAPIs'

// Export DOM classes
export {
  Attr,
  DOMMatrix,
  DOMMatrixReadOnly,
  DOMPoint,
  DOMPointReadOnly,
  DOMRect,
  DOMRectReadOnly,
  DocumentType,
  HTMLCollection,
  MediaQueryList,
  NamedNodeMap,
  NodeList,
  Screen,
  ValidityState,
  XMLSerializer,
} from './dom/DOMClasses'

// Export CSSOM classes
export {
  CSS,
  CSSConditionRule,
  CSSContainerRule,
  CSSFontFaceRule,
  CSSGroupingRule,
  CSSKeyframeRule,
  CSSKeyframesRule,
  CSSMediaRule,
  CSSRule,
  CSSScopeRule,
  CSSStyleDeclaration,
  CSSStyleRule,
  CSSStyleSheet,
  CSSSupportsRule,
  MediaList,
  StylePropertyMap,
  StylePropertyMapReadOnly,
} from './css/CSSOM'
export type {
  CanvasFillStrokeStyles,
  CanvasGradient,
  CanvasImageSource,
  CanvasLineCap,
  CanvasLineJoin,
  CanvasPattern,
  CanvasTextAlign,
  CanvasTextBaseline,
  DOMMatrix2DInit,
  GlobalCompositeOperation,
  ImageData,
  TextMetrics,
} from './apis/Canvas'
export { CanvasRenderingContext2D, HTMLCanvasElement } from './apis/Canvas'
export { Clipboard, Navigator } from './apis/Clipboard'
export { VeryHappyFile as File, VeryHappyFileList as FileList, VeryHappyFileReader as FileReader } from './apis/FileAPI'
export { Browser } from './browser/Browser'
export { BrowserContext } from './browser/BrowserContext'
export { BrowserFrame } from './browser/BrowserFrame'
export type { IBrowserPageViewport, PageEventHandler, PageEventType } from './browser/BrowserPage'
export { BrowserPage } from './browser/BrowserPage'

export type { ICookie } from './browser/CookieContainer'
export { CookieContainer, CookieSameSiteEnum } from './browser/CookieContainer'
export type { CustomEventInit } from './events/CustomEvent'
// Export Event APIs
export { CustomEvent } from './events/CustomEvent'
export {
  AnimationEvent,
  ClipboardEvent,
  CloseEvent,
  CompositionEvent,
  DragEvent,
  ErrorEvent,
  FocusEvent,
  HashChangeEvent,
  InputEvent,
  KeyboardEvent,
  MediaQueryListEvent,
  MessageEvent,
  MouseEvent,
  PointerEvent,
  PopStateEvent,
  ProgressEvent,
  StorageEvent,
  SubmitEvent,
  Touch,
  TouchEvent,
  TransitionEvent,
  UIEvent,
  WheelEvent,
} from './events/EventClasses'
export type {
  AnimationEventInit,
  ClipboardEventInit,
  CloseEventInit,
  CompositionEventInit,
  DragEventInit,
  ErrorEventInit,
  FocusEventInit,
  HashChangeEventInit,
  InputEventInit,
  KeyboardEventInit,
  MediaQueryListEventInit,
  MessageEventInit,
  MouseEventInit,
  PointerEventInit,
  PopStateEventInit,
  ProgressEventInit,
  StorageEventInit,
  SubmitEventInit,
  TouchEventInit,
  TouchInit,
  TransitionEventInit,
  UIEventInit,
  WheelEventInit,
} from './events/EventClasses'
export { VirtualEvent } from './events/VirtualEvent'
export { VirtualEventTarget } from './events/VirtualEventTarget'

// Export HTTP APIs
export { XMLHttpRequest } from './http/XMLHttpRequest'
export { type InterceptedRequest, type RequestInterceptionHandler, RequestInterceptor } from './network/RequestInterceptor'
// Export Network APIs
export { VeryHappyWebSocket as WebSocket } from './network/WebSocket'
export { VirtualCommentNode } from './nodes/VirtualCommentNode'
export { createDocument, VirtualDocument } from './nodes/VirtualDocument'
// Export DOM classes
export { VirtualElement } from './nodes/VirtualElement'
export { VirtualTemplateElement } from './nodes/VirtualTemplateElement'
export { VirtualSVGElement } from './nodes/VirtualSVGElement'
export {
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
  SVGImageElement,
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
} from './nodes/SVGElementClasses'
// Export types
export type { EventListener, EventListenerOptions, History, HistoryState, Location, NodeType, VirtualNode } from './nodes/VirtualNode'
export { VirtualNodeBase } from './nodes/VirtualNode'
export { VirtualTextNode } from './nodes/VirtualTextNode'
export {
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
} from './nodes/HTMLElementClasses'

export type { IntersectionObserverCallback, IntersectionObserverEntry, IntersectionObserverInit } from './observers/IntersectionObserver'
export { IntersectionObserver } from './observers/IntersectionObserver'

export type { MutationCallback, MutationObserverInit, MutationRecord } from './observers/MutationObserver'

// Export Observer APIs
export { MutationObserver } from './observers/MutationObserver'
export type { ResizeObserverCallback, ResizeObserverEntry, ResizeObserverSize } from './observers/ResizeObserver'
export { ResizeObserver } from './observers/ResizeObserver'

// Export utilities
export { parseHTML } from './parsers/html-parser'
export {
  matchesAttributeSelector,
  matchesPseudoClass,
  matchesSimpleSelector,
  querySelectorAllEngine,
  querySelectorEngine,
} from './selectors/engine'

// Export Storage & Timers
export { createStorage, Storage } from './storage/Storage'

export { TimerManager } from './timers/TimerManager'
export {
  FILTER_ACCEPT,
  FILTER_REJECT,
  FILTER_SKIP,
  NodeFilter,
  NodeIterator,
  Range,
  Selection,
  SHOW_ALL,
  SHOW_COMMENT,
  SHOW_DOCUMENT,
  SHOW_DOCUMENT_FRAGMENT,
  SHOW_ELEMENT,
  SHOW_TEXT,
  TreeWalker,
} from './traversal'
export type { NodeFilterConstants, NodeFilterInput } from './traversal'
// Export Web Components
export { CustomElementRegistry, HTMLElement } from './webcomponents/CustomElementRegistry'

export { ShadowRoot, type ShadowRootInit } from './webcomponents/ShadowRoot'
export { DetachedWindowAPI } from './window/DetachedWindowAPI'

export { GlobalRegistrator } from './window/GlobalRegistrator'
export { GlobalWindow } from './window/GlobalWindow'
export type { IBrowserSettings, IOptionalBrowserSettings, WindowOptions } from './window/Window'
// Export Browser API classes
export { Window } from './window/Window'

export { XPathEvaluator } from './xpath/XPathEvaluator'
// Export XPath APIs
export { XPathResult, XPathResultType } from './xpath/XPathResult'

// Export Screenshot APIs
export { captureHtml, captureUrl, ScreenshotCapture, type ScreenshotOptions } from './screenshot/capture'
export { compareImages, ImageDiff, type DiffOptions, type DiffResult } from './screenshot/diff'
export { createRenderer, HtmlRenderer, type RenderOptions, type RenderResult } from './screenshot/renderer'
