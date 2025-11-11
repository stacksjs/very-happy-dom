// Export Browser APIs
export { DataTransfer, EnhancedConsole, Geolocation, Notification, Performance } from './apis/BrowserAPIs'
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
export { VirtualEvent } from './events/VirtualEvent'

// Export HTTP APIs
export { XMLHttpRequest } from './http/XMLHttpRequest'
export { type InterceptedRequest, type RequestInterceptionHandler, RequestInterceptor } from './network/RequestInterceptor'
// Export Network APIs
export { VeryHappyWebSocket as WebSocket } from './network/WebSocket'
export { VirtualCommentNode } from './nodes/VirtualCommentNode'
export { createDocument, VirtualDocument } from './nodes/VirtualDocument'
// Export DOM classes
export { VirtualElement } from './nodes/VirtualElement'
// Export types
export type { EventListener, EventListenerOptions, History, HistoryState, Location, NodeType, VirtualNode } from './nodes/VirtualNode'
export { VirtualTextNode } from './nodes/VirtualTextNode'

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
// Export Web Components
export { CustomElementRegistry, HTMLElement } from './webcomponents/CustomElementRegistry'

export { ShadowRoot, type ShadowRootInit } from './webcomponents/ShadowRoot'
export { DetachedWindowAPI } from './window/DetachedWindowAPI'

export { GlobalWindow } from './window/GlobalWindow'
export type { IBrowserSettings, IOptionalBrowserSettings, WindowOptions } from './window/Window'
// Export Browser API classes
export { Window } from './window/Window'

export { XPathEvaluator } from './xpath/XPathEvaluator'
// Export XPath APIs
export { XPathResult, XPathResultType } from './xpath/XPathResult'
