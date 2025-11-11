import { bench, run } from 'mitata'
import { Window } from './src'

// Benchmark: DOM Creation
bench('DOM Creation - Create window', () => {
  new Window()
})

bench('DOM Creation - Create window + document', () => {
  const window = new Window()
  return window.document
})

// Benchmark: Element Creation
bench('Element Creation - createElement', () => {
  const window = new Window()
  window.document.createElement('div')
})

bench('Element Creation - 100 elements', () => {
  const window = new Window()
  for (let i = 0; i < 100; i++) {
    window.document.createElement('div')
  }
})

// Benchmark: DOM Manipulation
bench('DOM Manipulation - appendChild', () => {
  const window = new Window()
  const parent = window.document.createElement('div')
  const child = window.document.createElement('span')
  parent.appendChild(child)
})

bench('DOM Manipulation - 100 appendChild', () => {
  const window = new Window()
  const parent = window.document.createElement('div')
  for (let i = 0; i < 100; i++) {
    const child = window.document.createElement('span')
    parent.appendChild(child)
  }
})

// Benchmark: Query Selectors
bench('querySelector - simple tag', () => {
  const window = new Window()
  window.document.body.innerHTML = '<div><span id="test">Hello</span></div>'
  window.document.querySelector('span')
})

bench('querySelector - with class', () => {
  const window = new Window()
  window.document.body.innerHTML = '<div><span class="test">Hello</span></div>'
  window.document.querySelector('.test')
})

bench('querySelectorAll - 100 elements', () => {
  const window = new Window()
  let html = ''
  for (let i = 0; i < 100; i++) {
    html += `<div class="item">Item ${i}</div>`
  }
  window.document.body.innerHTML = html
  window.document.querySelectorAll('.item')
})

// Benchmark: Attributes
bench('Attributes - setAttribute', () => {
  const window = new Window()
  const el = window.document.createElement('div')
  el.setAttribute('class', 'test')
})

bench('Attributes - 10 attributes', () => {
  const window = new Window()
  const el = window.document.createElement('div')
  for (let i = 0; i < 10; i++) {
    el.setAttribute(`attr-${i}`, `value-${i}`)
  }
})

// Benchmark: Event Handling
bench('Events - addEventListener', () => {
  const window = new Window()
  const el = window.document.createElement('button')
  el.addEventListener('click', () => {})
})

bench('Events - dispatchEvent', () => {
  const window = new Window()
  const el = window.document.createElement('button')
  const event = new window.CustomEvent('click')
  el.dispatchEvent(event)
})

// Benchmark: Canvas API
bench('Canvas - createElement canvas', () => {
  const window = new Window()
  window.document.createElement('canvas')
})

bench('Canvas - getContext 2d', () => {
  const window = new Window()
  const canvas = window.document.createElement('canvas')
  canvas.getContext('2d')
})

bench('Canvas - fillRect', () => {
  const window = new Window()
  const canvas = window.document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx?.fillRect(0, 0, 100, 100)
})

// Benchmark: Storage
bench('Storage - localStorage setItem', () => {
  const window = new Window()
  window.localStorage.setItem('key', 'value')
})

bench('Storage - localStorage getItem', () => {
  const window = new Window()
  window.localStorage.setItem('key', 'value')
  window.localStorage.getItem('key')
})

// Benchmark: Complex DOM Operations
bench('Complex - Build tree (100 nodes)', () => {
  const window = new Window()
  const root = window.document.createElement('div')
  for (let i = 0; i < 10; i++) {
    const parent = window.document.createElement('div')
    for (let j = 0; j < 10; j++) {
      const child = window.document.createElement('span')
      child.textContent = `Node ${i}-${j}`
      parent.appendChild(child)
    }
    root.appendChild(parent)
  }
  window.document.body.appendChild(root)
})

bench('Complex - innerHTML parsing', () => {
  const window = new Window()
  window.document.body.innerHTML = `
    <div class="container">
      <header>
        <h1>Title</h1>
        <nav>
          <a href="/home">Home</a>
          <a href="/about">About</a>
        </nav>
      </header>
      <main>
        <article>
          <h2>Article Title</h2>
          <p>Content here</p>
        </article>
      </main>
    </div>
  `
})

await run({
  percentiles: false,
})
