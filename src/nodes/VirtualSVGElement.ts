import { VirtualElement } from './VirtualElement'

export class VirtualSVGElement extends VirtualElement {
  constructor(tagName: string) {
    super(tagName)
    this.namespaceURI = 'http://www.w3.org/2000/svg'
  }
}
