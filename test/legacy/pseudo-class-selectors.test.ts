import { describe, expect, test } from 'bun:test'
import { createDocument } from '../../src'

describe('Pseudo-class Selectors', () => {
  describe(':first-child', () => {
    test('should match first child element', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <ul>
          <li class="first">Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
        </ul>
      `

      const first = doc.querySelector('li:first-child')
      expect(first).not.toBeNull()
      expect(first?.classList.contains('first')).toBe(true)
    })

    test('should not match non-first child', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <ul>
          <li>Item 1</li>
          <li class="second">Item 2</li>
        </ul>
      `

      const result = doc.querySelector('.second:first-child')
      expect(result).toBeNull()
    })
  })

  describe(':last-child', () => {
    test('should match last child element', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li class="last">Item 3</li>
        </ul>
      `

      const last = doc.querySelector('li:last-child')
      expect(last).not.toBeNull()
      expect(last?.classList.contains('last')).toBe(true)
    })

    test('should not match non-last child', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <ul>
          <li class="first">Item 1</li>
          <li>Item 2</li>
        </ul>
      `

      const result = doc.querySelector('.first:last-child')
      expect(result).toBeNull()
    })
  })

  describe(':nth-child(n)', () => {
    test('should match specific nth child', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <ul>
          <li>Item 1</li>
          <li class="second">Item 2</li>
          <li>Item 3</li>
        </ul>
      `

      const second = doc.querySelector('li:nth-child(2)')
      expect(second).not.toBeNull()
      expect(second?.classList.contains('second')).toBe(true)
    })

    test('should match odd children', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
          <li>Item 4</li>
        </ul>
      `

      const odds = doc.querySelectorAll('li:nth-child(odd)')
      expect(odds.length).toBe(2)
    })

    test('should match even children', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
          <li>Item 3</li>
          <li>Item 4</li>
        </ul>
      `

      const evens = doc.querySelectorAll('li:nth-child(even)')
      expect(evens.length).toBe(2)
    })
  })

  describe(':not(selector)', () => {
    test('should match elements not matching selector', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <div class="active">Active</div>
        <div>Inactive 1</div>
        <div>Inactive 2</div>
      `

      const notActive = doc.querySelectorAll('div:not(.active)')
      expect(notActive.length).toBe(2)
    })

    test('should work with ID selectors', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <button id="submit">Submit</button>
        <button>Cancel</button>
        <button>Reset</button>
      `

      const notSubmit = doc.querySelectorAll('button:not(#submit)')
      expect(notSubmit.length).toBe(2)
    })
  })

  describe(':disabled and :enabled', () => {
    test('should match disabled elements', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <input type="text" disabled />
        <input type="text" />
        <button disabled>Click</button>
      `

      const disabled = doc.querySelectorAll(':disabled')
      expect(disabled.length).toBe(2)
    })

    test('should match enabled elements', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <input type="text" disabled />
        <input type="text" />
        <input type="text" />
      `

      const enabled = doc.querySelectorAll('input:enabled')
      expect(enabled.length).toBe(2)
    })
  })

  describe(':checked', () => {
    test('should match checked elements', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <input type="checkbox" checked />
        <input type="checkbox" />
        <input type="radio" checked />
      `

      const checked = doc.querySelectorAll(':checked')
      expect(checked.length).toBe(2)
    })

    test('should not match unchecked elements', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <input type="checkbox" />
      `

      const checked = doc.querySelector(':checked')
      expect(checked).toBeNull()
    })
  })

  describe(':empty', () => {
    test('should match empty elements', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <div></div>
        <div>Content</div>
        <p></p>
      `

      const empty = doc.querySelectorAll(':empty')
      expect(empty.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Combined pseudo-classes', () => {
    test('should work with tag + pseudo-class', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <input type="text" disabled />
        <button disabled>Click</button>
      `

      const input = doc.querySelector('input:disabled')
      expect(input).not.toBeNull()
      expect(input?.nodeName).toBe('INPUT')
    })

    test('should work with class + pseudo-class', () => {
      const doc = createDocument()
      doc.body!.innerHTML = `
        <div class="item">Item 1</div>
        <div class="item">Item 2</div>
        <div class="item">Item 3</div>
      `

      const firstItem = doc.querySelector('.item:first-child')
      expect(firstItem).not.toBeNull()
      expect(firstItem?.textContent).toBe('Item 1')
    })
  })
})
