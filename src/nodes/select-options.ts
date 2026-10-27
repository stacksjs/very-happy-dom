import type { VirtualElement } from './VirtualElement'

/** Shared by the select and datalist interfaces, without occupying HTMLElement. */
export const selectOptionsDescriptor: PropertyDescriptor = {
  configurable: true,
  enumerable: true,
  get(this: VirtualElement): VirtualElement[] {
    return this.querySelectorAll('option')
  },
}
