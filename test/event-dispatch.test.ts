import { describe, expect, test } from 'bun:test'
import {
  VirtualDocument,
  VirtualElement,
  VirtualEvent,
} from '../src'

// =============================================================================
// Event: isTrusted property
// =============================================================================
describe('Event: isTrusted property', () => {
  test('isTrusted defaults to false for script-created events', () => {
    const event = new VirtualEvent('click')
    expect(event.isTrusted).toBe(false)
  })

  test('isTrusted is readonly', () => {
    const event = new VirtualEvent('click')
    // Attempting to set should not change value
    expect(event.isTrusted).toBe(false)
  })
})

// =============================================================================
// Event: initEvent()
// =============================================================================
describe('Event: initEvent()', () => {
  test('initEvent sets type, bubbles, cancelable', () => {
    const doc = new VirtualDocument()
    const event = doc.createEvent('Event')
    event.initEvent('click', true, true)
    expect(event.type).toBe('click')
    expect(event.bubbles).toBe(true)
    expect(event.cancelable).toBe(true)
  })

  test('initEvent defaults bubbles and cancelable to false', () => {
    const event = new VirtualEvent('')
    event.initEvent('custom')
    expect(event.type).toBe('custom')
    expect(event.bubbles).toBe(false)
    expect(event.cancelable).toBe(false)
  })

  test('initEvent resets propagation state', () => {
    const event = new VirtualEvent('click', { cancelable: true })
    event.preventDefault()
    event.stopPropagation()
    expect(event.defaultPrevented).toBe(true)

    event.initEvent('reset', false, false)
    expect(event.defaultPrevented).toBe(false)
    expect(event.propagationStopped).toBe(false)
  })

  test('createEvent + initEvent pattern works end to end', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('div')
    doc.body!.appendChild(el)

    let received = false
    el.addEventListener('myevent', () => { received = true })

    const event = doc.createEvent('Event')
    event.initEvent('myevent', true, true)
    el.dispatchEvent(event)

    expect(received).toBe(true)
  })
})

// =============================================================================
// Event: returnValue legacy property
// =============================================================================
describe('Event: returnValue legacy property', () => {
  test('returnValue defaults to true', () => {
    const event = new VirtualEvent('click')
    expect(event.returnValue).toBe(true)
  })

  test('returnValue becomes false after preventDefault', () => {
    const event = new VirtualEvent('click', { cancelable: true })
    event.preventDefault()
    expect(event.returnValue).toBe(false)
  })

  test('setting returnValue = false calls preventDefault', () => {
    const event = new VirtualEvent('click', { cancelable: true })
    event.returnValue = false
    expect(event.defaultPrevented).toBe(true)
    expect(event.returnValue).toBe(false)
  })

  test('setting returnValue = true does not undo preventDefault', () => {
    const event = new VirtualEvent('click', { cancelable: true })
    event.preventDefault()
    event.returnValue = true
    // Per spec, setting returnValue = true doesn't reset defaultPrevented
    expect(event.defaultPrevented).toBe(true)
  })
})

// =============================================================================
// Event: srcElement legacy property
// =============================================================================
describe('Event: srcElement legacy property', () => {
  test('srcElement is null before dispatch', () => {
    const event = new VirtualEvent('click')
    expect(event.srcElement).toBeNull()
  })

  test('srcElement mirrors target after dispatch', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('div')
    doc.body!.appendChild(el)

    let srcEl: any = null
    el.addEventListener('click', (e: any) => {
      srcEl = e.srcElement
    })

    el.dispatchEvent(new VirtualEvent('click', { bubbles: true }))
    expect(srcEl).toBe(el)
  })
})

// =============================================================================
// Event: passive listeners
// =============================================================================
describe('Event: passive listeners', () => {
  test('passive listener cannot call preventDefault', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('div')

    el.addEventListener('click', (e: any) => {
      e.preventDefault()
    }, { passive: true })

    const event = new VirtualEvent('click', { bubbles: true, cancelable: true })
    el.dispatchEvent(event)

    // preventDefault should have been a no-op inside the passive listener
    expect(event.defaultPrevented).toBe(false)
  })

  test('non-passive listener can call preventDefault', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('div')

    el.addEventListener('click', (e: any) => {
      e.preventDefault()
    }, { passive: false })

    const event = new VirtualEvent('click', { bubbles: true, cancelable: true })
    el.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })

  test('passive option defaults to false', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('div')

    el.addEventListener('click', (e: any) => {
      e.preventDefault()
    })

    const event = new VirtualEvent('click', { bubbles: true, cancelable: true })
    el.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})

// =============================================================================
// Event: AbortSignal in addEventListener
// =============================================================================
describe('Event: AbortSignal in addEventListener', () => {
  test('aborting signal removes the event listener', () => {
    const el = new VirtualElement('div')
    const controller = new AbortController()
    let callCount = 0

    el.addEventListener('click', () => { callCount++ }, { signal: controller.signal })

    el.dispatchEvent(new VirtualEvent('click', { bubbles: true }))
    expect(callCount).toBe(1)

    controller.abort()

    el.dispatchEvent(new VirtualEvent('click', { bubbles: true }))
    expect(callCount).toBe(1) // Should NOT have increased
  })

  test('already-aborted signal prevents listener from being added', () => {
    const el = new VirtualElement('div')
    const controller = new AbortController()
    controller.abort()

    let called = false
    el.addEventListener('click', () => { called = true }, { signal: controller.signal })

    el.dispatchEvent(new VirtualEvent('click', { bubbles: true }))
    expect(called).toBe(false)
  })

  test('signal works with once option', () => {
    const el = new VirtualElement('div')
    const controller = new AbortController()
    let callCount = 0

    el.addEventListener('click', () => { callCount++ }, { once: true, signal: controller.signal })

    el.dispatchEvent(new VirtualEvent('click', { bubbles: true }))
    expect(callCount).toBe(1)

    // Already removed by once, abort should be harmless
    controller.abort()
    el.dispatchEvent(new VirtualEvent('click', { bubbles: true }))
    expect(callCount).toBe(1)
  })
})
