import { describe, expect, test } from 'bun:test'
import {
  IntersectionObserver,
  MutationObserver,
  VirtualDocument,
} from '../src'

// =============================================================================
// IntersectionObserver: takeRecords()
// =============================================================================
describe('IntersectionObserver: takeRecords()', () => {
  test('takeRecords returns pending entries before callback fires', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('div')
    doc.body!.appendChild(el)

    let callbackEntries: any[] = []
    const observer = new IntersectionObserver((entries) => {
      callbackEntries = entries
    })

    observer.observe(el)

    // Before the async callback, takeRecords should have the pending entry
    const records = observer.takeRecords()
    expect(records.length).toBe(1)
    expect(records[0].target).toBe(el)
    expect(records[0].isIntersecting).toBe(true)
  })

  test('takeRecords clears pending entries', () => {
    const doc = new VirtualDocument()
    const el = doc.createElement('div')
    doc.body!.appendChild(el)

    const observer = new IntersectionObserver(() => {})
    observer.observe(el)

    const first = observer.takeRecords()
    expect(first.length).toBe(1)

    const second = observer.takeRecords()
    expect(second.length).toBe(0)
  })
})

// =============================================================================
// MutationObserver: observe() option merging
// =============================================================================
describe('MutationObserver: observe() option merging', () => {
  test('second observe call merges attributeFilter', async () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    doc.body!.appendChild(div)

    const records: any[] = []
    const observer = new MutationObserver((mutations) => {
      records.push(...mutations)
    })

    // First observe: watch 'class' attribute
    observer.observe(div, { attributes: true, attributeFilter: ['class'] })
    // Second observe: also watch 'id' attribute (should merge)
    observer.observe(div, { attributes: true, attributeFilter: ['id'] })

    div.setAttribute('class', 'test')
    div.setAttribute('id', 'myId')
    div.setAttribute('data-x', 'ignored') // not in merged filter

    await new Promise(r => setTimeout(r, 20))

    // Both 'class' and 'id' changes should be captured
    const attrNames = records.map(r => r.attributeName)
    expect(attrNames).toContain('class')
    expect(attrNames).toContain('id')
    // 'data-x' should NOT be captured since it's not in the merged filter
    expect(attrNames).not.toContain('data-x')

    observer.disconnect()
  })

  test('observe does not duplicate when called with same options', async () => {
    const doc = new VirtualDocument()
    const div = doc.createElement('div')
    doc.body!.appendChild(div)

    let callCount = 0
    const observer = new MutationObserver(() => {
      callCount++
    })

    observer.observe(div, { attributes: true })
    observer.observe(div, { attributes: true })

    div.setAttribute('class', 'test')
    await new Promise(r => setTimeout(r, 20))

    // Should only get one callback, not duplicate records
    expect(callCount).toBe(1)

    observer.disconnect()
  })
})
