import { VirtualElement } from './VirtualElement'

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
