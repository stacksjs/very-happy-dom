import type { EventListener, EventListenerOptions } from '../nodes/VirtualNode'

function setEventValue(event: any, key: string, value: any): void {
  try {
    event[key] = value
    return
  }
  catch {}

  try {
    Object.defineProperty(event, key, {
      configurable: true,
      enumerable: key !== '_path',
      writable: true,
      value,
    })
  }
  catch {}
}

function getEventBoolean(event: any, key: string): boolean {
  return Boolean(event?.[key])
}

function isNodeLike(value: any): boolean {
  return Boolean(value && typeof value === 'object')
}

function getParentNodeLike(value: any): any {
  return isNodeLike(value) ? (value.parentNode ?? null) : null
}

function isShadowRootTarget(value: any): boolean {
  return value?.nodeType === 11 && value?.nodeName === '#shadow-root' && value?.host
}

function buildEventPath(start: VirtualEventTarget, event: any): VirtualEventTarget[] {
  const path: VirtualEventTarget[] = []
  let current: VirtualEventTarget | null = start

  while (current) {
    path.push(current)
    if (isShadowRootTarget(current) && event?.composed !== true) {
      break
    }
    current = ((current as any)._getEventParent?.() ?? null) as VirtualEventTarget | null
  }

  return path
}

function findContainingShadowRoot(target: any): any {
  let current = target
  while (current) {
    if (isShadowRootTarget(current)) {
      return current
    }
    current = getParentNodeLike(current)
  }
  return null
}

function isWithinShadowRoot(node: any, shadowRoot: any): boolean {
  let current = node
  while (current) {
    if (current === shadowRoot) {
      return true
    }
    current = getParentNodeLike(current)
  }
  return false
}

function retargetNode(originalTarget: any, currentTarget: any): any {
  const shadowRoot = findContainingShadowRoot(originalTarget)
  if (!shadowRoot) {
    return originalTarget
  }

  if (currentTarget === shadowRoot || isWithinShadowRoot(currentTarget, shadowRoot)) {
    return originalTarget
  }

  return shadowRoot.host ?? originalTarget
}

export class VirtualEventTarget {
  private _eventListeners: Map<string, EventListener[]> = new Map<string, EventListener[]>()

  addEventListener(type: string, listener: ((event: any) => void) | null, options: EventListenerOptions | boolean = {}): void {
    if (!listener)
      return

    const opts: EventListenerOptions = typeof options === 'boolean'
      ? { capture: options }
      : { capture: options.capture ?? false, once: options.once ?? false, passive: options.passive ?? false }

    if (!this._eventListeners.has(type)) {
      this._eventListeners.set(type, [])
    }

    const listeners = this._eventListeners.get(type)!
    const duplicate = listeners.some(entry => entry.listener === listener && entry.options.capture === opts.capture)
    if (!duplicate) {
      listeners.push({ listener, options: opts })
    }
  }

  removeEventListener(type: string, listener: ((event: any) => void) | null, options: EventListenerOptions | boolean = {}): void {
    if (!listener)
      return

    const listeners = this._eventListeners.get(type)
    if (!listeners)
      return

    const opts: EventListenerOptions = typeof options === 'boolean'
      ? { capture: options }
      : { capture: options.capture ?? false }

    const index = listeners.findIndex(entry => entry.listener === listener && entry.options.capture === opts.capture)
    if (index !== -1) {
      listeners.splice(index, 1)
    }

    if (listeners.length === 0) {
      this._eventListeners.delete(type)
    }
  }

  dispatchEvent(event: any): boolean {
    if (!event || typeof event.type !== 'string' || !event.type) {
      throw new Error('Failed to execute dispatchEvent: event.type must be a non-empty string')
    }

    const path = buildEventPath(this, event)
    const originalTarget = this
    const originalRelatedTarget = event?.relatedTarget ?? null

    const setDispatchState = (currentTarget: VirtualEventTarget | null, phase: number): void => {
      setEventValue(event, 'eventPhase', phase)
      setEventValue(event, 'currentTarget', currentTarget)
      if (currentTarget) {
        setEventValue(event, 'target', retargetNode(originalTarget, currentTarget))
        if (originalRelatedTarget) {
          setEventValue(event, 'relatedTarget', retargetNode(originalRelatedTarget, currentTarget))
        }
      }
    }

    setEventValue(event, 'target', originalTarget)
    setEventValue(event, '_path', [...path])
    if (typeof event.composedPath !== 'function') {
      setEventValue(event, 'composedPath', () => [...path])
    }

    const isPropagationStopped = () => getEventBoolean(event, '_propagationStopped') || getEventBoolean(event, 'propagationStopped')
    const isImmediatePropagationStopped = () => getEventBoolean(event, '_immediatePropagationStopped') || getEventBoolean(event, 'immediatePropagationStopped')

    for (let i = path.length - 1; i >= 1; i--) {
      if (isPropagationStopped())
        break
      setDispatchState(path[i], 1)
      path[i]._invokeEventListeners(event, true, isImmediatePropagationStopped)
    }

    if (!isPropagationStopped()) {
      setDispatchState(this, 2)
      this._invokeEventListeners(event, true, isImmediatePropagationStopped)
      if (!isImmediatePropagationStopped()) {
        this._invokeEventListeners(event, false, isImmediatePropagationStopped)
      }
    }

    if (event.bubbles === true && !isPropagationStopped()) {
      for (let i = 1; i < path.length; i++) {
        if (isPropagationStopped())
          break
        setDispatchState(path[i], 3)
        path[i]._invokeEventListeners(event, false, isImmediatePropagationStopped)
      }
    }

    setEventValue(event, 'eventPhase', 0)
    setEventValue(event, 'currentTarget', null)
    setEventValue(event, 'target', originalTarget)
    if (originalRelatedTarget) {
      setEventValue(event, 'relatedTarget', originalRelatedTarget)
    }

    return !Boolean(event.defaultPrevented)
  }

  protected _getEventParent(): VirtualEventTarget | null {
    return null
  }

  protected _invokeEventListeners(event: any, capture: boolean, isImmediatePropagationStopped: () => boolean): void {
    const listeners = this._eventListeners.get(event.type)
    if (!listeners || listeners.length === 0)
      return

    const snapshot = [...listeners]
    for (const entry of snapshot) {
      if ((entry.options.capture ?? false) !== capture)
        continue
      if (isImmediatePropagationStopped())
        break

      try {
        entry.listener.call(this, event)
      }
      catch (error) {
        console.error('Error in event listener:', error)
      }

      if (entry.options.once) {
        this.removeEventListener(event.type, entry.listener, { capture })
      }
    }
  }
}
