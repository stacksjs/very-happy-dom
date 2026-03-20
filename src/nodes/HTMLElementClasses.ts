import { VirtualElement } from './VirtualElement'

// HTML Element subclasses - lightweight aliases for drop-in compatibility with happy-dom/jsdom.
// very-happy-dom uses a single VirtualElement class internally, but user code may rely on
// `instanceof window.HTMLDivElement` or `new window.HTMLInputElement()`, so we expose these.

export class HTMLAnchorElement extends VirtualElement {}
export class HTMLAreaElement extends VirtualElement {}
export class HTMLAudioElement extends VirtualElement {}
export class HTMLBaseElement extends VirtualElement {}
export class HTMLBodyElement extends VirtualElement {}
export class HTMLBRElement extends VirtualElement {}
export class HTMLButtonElement extends VirtualElement {}
export class HTMLDataElement extends VirtualElement {}
export class HTMLDataListElement extends VirtualElement {}
export class HTMLDetailsElement extends VirtualElement {}
export class HTMLDialogElement extends VirtualElement {}
export class HTMLDivElement extends VirtualElement {}
export class HTMLDListElement extends VirtualElement {}
export class HTMLEmbedElement extends VirtualElement {}
export class HTMLFieldSetElement extends VirtualElement {}
export class HTMLFormElement extends VirtualElement {}
export class HTMLHeadElement extends VirtualElement {}
export class HTMLHeadingElement extends VirtualElement {}
export class HTMLHRElement extends VirtualElement {}
export class HTMLHtmlElement extends VirtualElement {}
export class HTMLIFrameElement extends VirtualElement {}
export class HTMLImageElement extends VirtualElement {}
export class HTMLInputElement extends VirtualElement {}
export class HTMLLabelElement extends VirtualElement {}
export class HTMLLegendElement extends VirtualElement {}
export class HTMLLIElement extends VirtualElement {}
export class HTMLLinkElement extends VirtualElement {}
export class HTMLMapElement extends VirtualElement {}
export class HTMLMediaElement extends VirtualElement {}
export class HTMLMenuElement extends VirtualElement {}
export class HTMLMetaElement extends VirtualElement {}
export class HTMLMeterElement extends VirtualElement {}
export class HTMLModElement extends VirtualElement {}
export class HTMLObjectElement extends VirtualElement {}
export class HTMLOListElement extends VirtualElement {}
export class HTMLOptGroupElement extends VirtualElement {}
export class HTMLOptionElement extends VirtualElement {}
export class HTMLOutputElement extends VirtualElement {}
export class HTMLParagraphElement extends VirtualElement {}
export class HTMLParamElement extends VirtualElement {}
export class HTMLPictureElement extends VirtualElement {}
export class HTMLPreElement extends VirtualElement {}
export class HTMLProgressElement extends VirtualElement {}
export class HTMLQuoteElement extends VirtualElement {}
export class HTMLScriptElement extends VirtualElement {}
export class HTMLSelectElement extends VirtualElement {}
export class HTMLSlotElement extends VirtualElement {}
export class HTMLSourceElement extends VirtualElement {}
export class HTMLSpanElement extends VirtualElement {}
export class HTMLStyleElement extends VirtualElement {}
export class HTMLTableCaptionElement extends VirtualElement {}
export class HTMLTableCellElement extends VirtualElement {}
export class HTMLTableColElement extends VirtualElement {}
export class HTMLTableElement extends VirtualElement {}
export class HTMLTableRowElement extends VirtualElement {}
export class HTMLTableSectionElement extends VirtualElement {}
export class HTMLTextAreaElement extends VirtualElement {}
export class HTMLTimeElement extends VirtualElement {}
export class HTMLTitleElement extends VirtualElement {}
export class HTMLTrackElement extends VirtualElement {}
export class HTMLUListElement extends VirtualElement {}
export class HTMLUnknownElement extends VirtualElement {}
export class HTMLVideoElement extends VirtualElement {}

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
