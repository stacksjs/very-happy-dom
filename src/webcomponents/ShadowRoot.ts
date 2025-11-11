/**
 * Shadow DOM implementation
 */

import type { VirtualElement } from '../nodes/VirtualElement'
import type { VirtualNode } from '../nodes/VirtualNode'

export type ShadowRootMode = 'open' | 'closed'

export interface ShadowRootInit {
  mode: ShadowRootMode
  delegatesFocus?: boolean
}

/**
 * ShadowRoot represents a shadow DOM tree
 */
export class ShadowRoot {
  public mode: ShadowRootMode
  public delegatesFocus: boolean
  public host: VirtualElement
  public innerHTML = ''
  public children: VirtualNode[] = []

  constructor(host: VirtualElement, init: ShadowRootInit) {
    this.host = host
    this.mode = init.mode
    this.delegatesFocus = init.delegatesFocus || false
  }

  querySelector(selector: string): VirtualElement | null {
    // Simple implementation - traverse children
    for (const child of this.children) {
      if (child.nodeType === 'element') {
        const element = child as VirtualElement
        // Check if this element matches first
        if (element.matches?.(selector)) {
          return element
        }
        // Then check descendants
        const result = element.querySelector(selector)
        if (result)
          return result
      }
    }
    return null
  }

  querySelectorAll(selector: string): VirtualElement[] {
    const results: VirtualElement[] = []
    for (const child of this.children) {
      if (child.nodeType === 'element') {
        const element = child as VirtualElement
        // Check if this element matches first
        if (element.matches?.(selector)) {
          results.push(element)
        }
        // Then check descendants
        results.push(...element.querySelectorAll(selector))
      }
    }
    return results
  }

  appendChild(child: VirtualNode): VirtualNode {
    this.children.push(child)
    child.parentNode = this.host
    return child
  }

  removeChild(child: VirtualNode): VirtualNode {
    const index = this.children.indexOf(child)
    if (index !== -1) {
      this.children.splice(index, 1)
      child.parentNode = null
    }
    return child
  }

  getElementById(id: string): VirtualElement | null {
    return this.querySelector(`#${id}`)
  }
}
