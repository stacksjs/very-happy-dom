/**
 * BroadcastChannel + MessageChannel/MessagePort
 * Same-realm implementations sufficient for tests that exercise message
 * passing semantics without cross-worker transport.
 */

import { VirtualEventTarget } from '../events/VirtualEventTarget'
import { MessageEvent } from '../events/EventClasses'

const broadcastRegistry: Map<string, Set<BroadcastChannel>> = new Map()

export class BroadcastChannel extends VirtualEventTarget {
  public readonly name: string
  private _closed = false
  // eslint-disable-next-line pickier/no-unused-vars
  public onmessage: ((event: MessageEvent) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  public onmessageerror: ((event: MessageEvent) => void) | null = null

  constructor(name: string) {
    super()
    this.name = String(name)
    let peers = broadcastRegistry.get(this.name)
    if (!peers) {
      peers = new Set()
      broadcastRegistry.set(this.name, peers)
    }
    peers.add(this)
  }

  postMessage(message: unknown): void {
    if (this._closed)
      throw new Error('InvalidStateError: BroadcastChannel is closed')
    const peers = broadcastRegistry.get(this.name)
    if (!peers)
      return
    // Queue delivery so postMessage doesn't synchronously reenter listeners.
    queueMicrotask(() => {
      for (const peer of peers) {
        if (peer === this || peer._closed)
          continue
        const event = new MessageEvent('message', { data: message, origin: '' })
        try { peer.onmessage?.(event) }
        catch {}
        peer.dispatchEvent(event as unknown as Event)
      }
    })
  }

  close(): void {
    if (this._closed)
      return
    this._closed = true
    const peers = broadcastRegistry.get(this.name)
    if (peers) {
      peers.delete(this)
      if (peers.size === 0)
        broadcastRegistry.delete(this.name)
    }
  }
}

export class MessagePort extends VirtualEventTarget {
  // eslint-disable-next-line pickier/no-unused-vars
  private _onmessage: ((event: MessageEvent) => void) | null = null
  // eslint-disable-next-line pickier/no-unused-vars
  public onmessageerror: ((event: MessageEvent) => void) | null = null

  /** Assigning onmessage implicitly starts the port, matching browser semantics. */
  // eslint-disable-next-line pickier/no-unused-vars
  get onmessage(): ((event: MessageEvent) => void) | null {
    return this._onmessage
  }

  // eslint-disable-next-line pickier/no-unused-vars
  set onmessage(value: ((event: MessageEvent) => void) | null) {
    this._onmessage = value
    if (value)
      this.start()
  }

  /** @internal */
  _peer: MessagePort | null = null
  private _started = false
  private _queue: MessageEvent[] = []
  private _closed = false

  postMessage(message: unknown): void {
    if (this._closed || !this._peer)
      return
    const event = new MessageEvent('message', { data: message, origin: '' })
    const peer = this._peer
    queueMicrotask(() => {
      if (peer._closed)
        return
      if (peer._started)
        peer._deliver(event)
      else
        peer._queue.push(event)
    })
  }

  start(): void {
    if (this._started)
      return
    this._started = true
    const queued = this._queue
    this._queue = []
    for (const event of queued)
      this._deliver(event)
  }

  close(): void {
    this._closed = true
  }

  private _deliver(event: MessageEvent): void {
    try { this._onmessage?.(event) }
    catch {}
    this.dispatchEvent(event as unknown as Event)
  }

  addEventListener(
    // eslint-disable-next-line pickier/no-unused-vars
    type: string,
    // eslint-disable-next-line pickier/no-unused-vars
    listener: any,
    // eslint-disable-next-line pickier/no-unused-vars
    options?: any,
  ): void {
    super.addEventListener(type, listener, options)
    if (type === 'message')
      this.start()
  }
}

export class MessageChannel {
  readonly port1: MessagePort
  readonly port2: MessagePort

  constructor() {
    this.port1 = new MessagePort()
    this.port2 = new MessagePort()
    this.port1._peer = this.port2
    this.port2._peer = this.port1
  }
}
