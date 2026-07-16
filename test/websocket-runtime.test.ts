import { afterEach, describe, expect, test } from 'bun:test'
import { VeryHappyWebSocket, WebSocketReadyState } from '../src/network/WebSocket'

const NativeWebSocket = globalThis.WebSocket

afterEach(() => {
  globalThis.WebSocket = NativeWebSocket
})

describe('WebSocket connection failures', () => {
  test('reports native constructor failures asynchronously', async () => {
    class FailingWebSocket {
      constructor() {
        throw new Error('Network unavailable')
      }
    }
    globalThis.WebSocket = FailingWebSocket as any

    const socket = new VeryHappyWebSocket('wss://unavailable.test')
    let errors = 0
    socket.addEventListener('error', () => errors++)

    expect(socket.readyState).toBe(WebSocketReadyState.CONNECTING)
    expect(errors).toBe(0)

    await Bun.sleep(1)

    expect(socket.readyState).toBe(WebSocketReadyState.CLOSED)
    expect(errors).toBe(1)
  })
})
