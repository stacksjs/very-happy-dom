import { VirtualElement } from './VirtualElement'

export class VirtualSVGElement extends VirtualElement {
  constructor(tagName: string) {
    super(tagName)
    // SVG elements preserve case per SVG spec (e.g. 'svg', 'linearGradient')
    this.tagName = tagName
    this.nodeName = tagName
    this.namespaceURI = 'http://www.w3.org/2000/svg'
  }
}
