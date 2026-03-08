import type { VirtualEventTarget } from './VirtualEventTarget'

export interface VirtualEventInit {
  bubbles?: boolean
  cancelable?: boolean
  composed?: boolean
}

export class VirtualEvent {
  static readonly NONE = 0
  static readonly CAPTURING_PHASE = 1
  static readonly AT_TARGET = 2
  static readonly BUBBLING_PHASE = 3

  readonly NONE = 0
  readonly CAPTURING_PHASE = 1
  readonly AT_TARGET = 2
  readonly BUBBLING_PHASE = 3
  type: string
  target: VirtualEventTarget | null = null
  currentTarget: VirtualEventTarget | null = null
  bubbles: boolean
  cancelable: boolean
  composed: boolean
  defaultPrevented = false
  propagationStopped = false
  immediatePropagationStopped = false
  eventPhase = 0
  timeStamp: number
  private _path: VirtualEventTarget[] = []
  private _propagationStopped = false
  private _immediatePropagationStopped = false

  constructor(type: string, options: VirtualEventInit = {}) {
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

  composedPath(): VirtualEventTarget[] {
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
