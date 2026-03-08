import type { VirtualElement } from '../nodes/VirtualElement'

export class VirtualEvent {
  type: string
  target: VirtualElement | null = null
  currentTarget: VirtualElement | null = null
  bubbles: boolean
  cancelable: boolean
  composed: boolean
  defaultPrevented = false
  propagationStopped = false
  immediatePropagationStopped = false
  eventPhase = 0
  timeStamp: number
  private _path: VirtualElement[] = []
  private _propagationStopped = false
  private _immediatePropagationStopped = false

  constructor(type: string, options: { bubbles?: boolean, cancelable?: boolean, composed?: boolean } = {}) {
    this.type = type
    this.bubbles = options.bubbles ?? false
    this.cancelable = options.cancelable ?? false
    this.composed = options.composed ?? false
    this.timeStamp = Date.now()
  }

  preventDefault(): void {
    if (this.cancelable) {
      this.defaultPrevented = true
    }
  }

  stopPropagation(): void {
    this.propagationStopped = true
    this._propagationStopped = true
  }

  stopImmediatePropagation(): void {
    this.immediatePropagationStopped = true
    this.propagationStopped = true
    this._immediatePropagationStopped = true
    this._propagationStopped = true
  }

  composedPath(): VirtualElement[] {
    return [...this._path]
  }

  get cancelBubble(): boolean {
    return this.propagationStopped
  }

  set cancelBubble(value: boolean) {
    if (value) {
      this.stopPropagation()
    }
  }
}
