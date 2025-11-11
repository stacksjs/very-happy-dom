import type { VirtualElement } from '../nodes/VirtualElement'

export class VirtualEvent {
  type: string
  target: VirtualElement | null = null
  currentTarget: VirtualElement | null = null
  bubbles: boolean
  cancelable: boolean
  defaultPrevented = false
  propagationStopped = false
  immediatePropagationStopped = false
  timeStamp: number

  constructor(type: string, options: { bubbles?: boolean, cancelable?: boolean } = {}) {
    this.type = type
    this.bubbles = options.bubbles ?? false
    this.cancelable = options.cancelable ?? false
    this.timeStamp = Date.now()
  }

  preventDefault(): void {
    if (this.cancelable) {
      this.defaultPrevented = true
    }
  }

  stopPropagation(): void {
    this.propagationStopped = true
  }

  stopImmediatePropagation(): void {
    this.immediatePropagationStopped = true
    this.propagationStopped = true
  }
}
