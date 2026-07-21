import { describe, expect, it } from 'bun:test'
import { Window } from '../src'

describe('anchor activation', () => {
  it('navigates the current window for ordinary links', () => {
    const window = new Window({ url: 'https://example.com/posts/1' })
    window.document.body!.innerHTML = '<a id="next" href="/posts/2">Next</a>'

    window.document.querySelector('#next')!.click()

    expect(window.location.href).toBe('https://example.com/posts/2')
  })

  it('opens target blank links with rel isolation', () => {
    const window = new Window({ url: 'https://bsky.app/post/1' })
    const calls: Array<{ url: string, target: string, features: string }> = []
    const originalOpen = window.open.bind(window)
    window.open = ((url?: string | URL, target?: string, features?: string) => {
      calls.push({ url: String(url), target: target ?? '', features: features ?? '' })
      return originalOpen(url, target, features)
    }) as typeof window.open
    window.document.body!.innerHTML = '<a id="outbound" href="https://example.com/survey" target="_blank" rel="noopener noreferrer">Survey</a>'

    window.document.querySelector('#outbound')!.click()

    expect(calls).toEqual([{
      url: 'https://example.com/survey',
      target: '_blank',
      features: 'noopener,noreferrer',
    }])
  })

  it('does not navigate when the click is cancelled', () => {
    const window = new Window({ url: 'https://example.com/posts/1' })
    window.document.body!.innerHTML = '<a id="next" href="/posts/2">Next</a>'
    const link = window.document.querySelector('#next')!
    link.addEventListener('click', event => event.preventDefault())

    link.click()

    expect(window.location.href).toBe('https://example.com/posts/1')
  })
})
