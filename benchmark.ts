/**
 * DOM Performance Benchmarks using mitata
 *
 * Competing with happy-dom performance test:
 * https://github.com/capricorn86/happy-dom-performance-test
 */

import { bench, group, run } from 'mitata'
import { Window, createDocument } from './src'

// Benchmark: Document Creation
group('Document Creation', () => {
  bench('createDocument()', () => {
    createDocument()
  })

  bench('create Window', () => {
    new Window()
  })

  bench('create 100 documents', () => {
    for (let i = 0; i < 100; i++) {
      createDocument()
    }
  })
})

// Benchmark: Element Creation
group('Element Creation', () => {
  const doc = createDocument()

  bench('createElement', () => {
    doc.createElement('div')
  }).baseline()

  bench('createElement + setAttribute', () => {
    const el = doc.createElement('div')
    el.setAttribute('id', 'test')
    el.setAttribute('class', 'container')
  })

  bench('create 1000 elements', () => {
    for (let i = 0; i < 1000; i++) {
      doc.createElement('div')
    }
  })

  bench('create + set attributes (1000x)', () => {
    for (let i = 0; i < 1000; i++) {
      const el = doc.createElement('div')
      el.setAttribute('id', `item-${i}`)
      el.setAttribute('class', 'item')
      el.setAttribute('data-index', i.toString())
    }
  })
})

// Benchmark: HTML Parsing
group('HTML Parsing', () => {
  const doc = createDocument()

  const smallHTML = '<div>Hello World</div>'

  const mediumHTML = `
    <div class="container">
      <h1 id="title">Hello World</h1>
      <p class="description">Lorem ipsum dolor sit amet</p>
      <ul class="list">
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
        <li>Item 4</li>
        <li>Item 5</li>
      </ul>
    </div>
  `

  const largeHTML = `
    <html>
      <head>
        <title>Test Page</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width">
      </head>
      <body>
        <header>
          <nav>
            <ul>
              ${Array.from({ length: 10 }).map((_, i) => `<li><a href="#${i}">Link ${i}</a></li>`).join('')}
            </ul>
          </nav>
        </header>
        <main>
          ${Array.from({ length: 100 }).map((_, i) => `
            <article class="post" data-id="${i}">
              <h2 class="post-title">Post ${i}</h2>
              <p class="post-content">This is the content for post number ${i}</p>
              <footer>
                <span class="author">Author ${i % 5}</span>
                <time datetime="2024-01-01">2024-01-01</time>
              </footer>
            </article>
          `).join('')}
        </main>
      </body>
    </html>
  `

  bench('parse small HTML', () => {
    doc.body!.innerHTML = smallHTML
  }).baseline()

  bench('parse medium HTML', () => {
    doc.body!.innerHTML = mediumHTML
  })

  bench('parse large HTML (100 articles)', () => {
    doc.documentElement!.innerHTML = largeHTML
  })

  bench('parse + query', () => {
    const freshDoc = createDocument()
    freshDoc.body!.innerHTML = mediumHTML
    freshDoc.querySelector('.container')
  })
})

// Benchmark: querySelector Operations
group('querySelector Operations', () => {
  const doc = createDocument()

  // Setup large DOM
  doc.body!.innerHTML = `
    <div class="app">
      ${Array.from({ length: 200 }).map((_, i) => `
        <div class="item" id="item-${i}" data-index="${i}">
          <h3 class="title">Title ${i}</h3>
          <p class="description">Description ${i}</p>
          <button class="btn" type="button">Click</button>
        </div>
      `).join('')}
    </div>
  `

  bench('querySelector by ID', () => {
    doc.querySelector('#item-100')
  }).baseline()

  bench('querySelector by class', () => {
    doc.querySelector('.title')
  })

  bench('querySelector by tag', () => {
    doc.querySelector('button')
  })

  bench('querySelector by attribute', () => {
    doc.querySelector('[data-index="50"]')
  })

  bench('querySelector nested', () => {
    doc.querySelector('.app .item .title')
  })
})

// Benchmark: querySelectorAll Operations
group('querySelectorAll Operations', () => {
  const doc = createDocument()

  // Setup large DOM
  doc.body!.innerHTML = `
    <div class="app">
      ${Array.from({ length: 200 }).map((_, i) => `
        <div class="item" id="item-${i}" data-index="${i}">
          <h3 class="title">Title ${i}</h3>
          <p class="description">Description ${i}</p>
          <button class="btn" type="button">Click</button>
        </div>
      `).join('')}
    </div>
  `

  bench('querySelectorAll by class (200 results)', () => {
    doc.querySelectorAll('.item')
  }).baseline()

  bench('querySelectorAll by tag (200 results)', () => {
    doc.querySelectorAll('div')
  })

  bench('querySelectorAll by attribute', () => {
    doc.querySelectorAll('[data-index]')
  })

  bench('querySelectorAll + iteration', () => {
    const items = doc.querySelectorAll('.item')
    for (const item of items) {
      item.getAttribute('id')
    }
  })
})

// Benchmark: DOM Manipulation
group('DOM Manipulation', () => {
  bench('appendChild (single)', () => {
    const doc = createDocument()
    const parent = doc.createElement('div')
    const child = doc.createElement('span')
    parent.appendChild(child)
  }).baseline()

  bench('appendChild (1000 children)', () => {
    const doc = createDocument()
    const parent = doc.createElement('div')
    for (let i = 0; i < 1000; i++) {
      const child = doc.createElement('div')
      child.textContent = `Child ${i}`
      parent.appendChild(child)
    }
  })

  bench('removeChild (1000 children)', () => {
    const doc = createDocument()
    const parent = doc.createElement('div')

    // Add children
    for (let i = 0; i < 1000; i++) {
      const child = doc.createElement('div')
      parent.appendChild(child)
    }

    // Remove children
    while (parent.children.length > 0) {
      parent.removeChild(parent.children[0])
    }
  })

  bench('textContent set (1000x)', () => {
    const doc = createDocument()
    const el = doc.createElement('div')
    for (let i = 0; i < 1000; i++) {
      el.textContent = `Updated ${i}`
    }
  })

  bench('textContent get (1000x)', () => {
    const doc = createDocument()
    const el = doc.createElement('div')
    el.textContent = 'Test content'
    for (let i = 0; i < 1000; i++) {
      const _text = el.textContent
    }
  })
})

// Benchmark: Attribute Operations
group('Attribute Operations', () => {
  const doc = createDocument()
  const el = doc.createElement('div')

  bench('setAttribute', () => {
    el.setAttribute('id', 'test')
  }).baseline()

  bench('getAttribute', () => {
    el.getAttribute('id')
  })

  bench('hasAttribute', () => {
    el.hasAttribute('id')
  })

  bench('removeAttribute', () => {
    el.removeAttribute('id')
  })

  bench('set 10 attributes', () => {
    for (let i = 0; i < 10; i++) {
      el.setAttribute(`attr-${i}`, `value-${i}`)
    }
  })

  bench('get 10 attributes', () => {
    for (let i = 0; i < 10; i++) {
      el.getAttribute(`attr-${i}`)
    }
  })
})

// Benchmark: Class List Operations
group('ClassList Operations', () => {
  bench('classList.add', () => {
    const doc = createDocument()
    const el = doc.createElement('div')
    el.classList.add('test-class')
  }).baseline()

  bench('classList.remove', () => {
    const doc = createDocument()
    const el = doc.createElement('div')
    el.classList.add('test-class')
    el.classList.remove('test-class')
  })

  bench('classList.contains', () => {
    const doc = createDocument()
    const el = doc.createElement('div')
    el.classList.add('test-class')
    el.classList.contains('test-class')
  })

  bench('classList.toggle', () => {
    const doc = createDocument()
    const el = doc.createElement('div')
    el.classList.toggle('active')
  })

  bench('classList add 100 classes', () => {
    const doc = createDocument()
    const el = doc.createElement('div')
    for (let i = 0; i < 100; i++) {
      el.classList.add(`class-${i}`)
    }
  })

  bench('classList contains check (100x)', () => {
    const doc = createDocument()
    const el = doc.createElement('div')
    el.classList.add('active')
    for (let i = 0; i < 100; i++) {
      el.classList.contains('active')
    }
  })
})

// Benchmark: innerHTML Operations
group('innerHTML Operations', () => {
  const doc = createDocument()

  const html = `
    <div class="container">
      <h1>Title</h1>
      <p>Content</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>
    </div>
  `

  bench('innerHTML set', () => {
    const el = doc.createElement('div')
    el.innerHTML = html
  }).baseline()

  bench('innerHTML get', () => {
    const el = doc.createElement('div')
    el.innerHTML = html
    const _result = el.innerHTML
  })

  bench('innerHTML set 100x', () => {
    const el = doc.createElement('div')
    for (let i = 0; i < 100; i++) {
      el.innerHTML = `<div>Content ${i}</div>`
    }
  })

  bench('outerHTML get', () => {
    const el = doc.createElement('div')
    el.innerHTML = html
    const _result = el.outerHTML
  })
})

// Benchmark: DOM Traversal
group('DOM Traversal', () => {
  const doc = createDocument()
  doc.body!.innerHTML = `
    <div id="root">
      ${Array.from({ length: 100 }).map((_, i) => `
        <div class="parent" data-id="${i}">
          <div class="child-1">Child 1</div>
          <div class="child-2">Child 2</div>
          <div class="child-3">Child 3</div>
        </div>
      `).join('')}
    </div>
  `

  bench('parentNode access (100x)', () => {
    const children = doc.querySelectorAll('.child-1')
    for (const child of children) {
      const _parent = child.parentNode
    }
  }).baseline()

  bench('childNodes iteration (100x)', () => {
    const parents = doc.querySelectorAll('.parent')
    for (const parent of parents) {
      for (const _child of parent.childNodes) {
        // iterate
      }
    }
  })

  bench('firstChild/lastChild (100x)', () => {
    const parents = doc.querySelectorAll('.parent')
    for (const parent of parents) {
      const _first = parent.firstChild
      const _last = parent.lastChild
    }
  })

  bench('nextSibling/previousSibling (100x)', () => {
    const children = doc.querySelectorAll('.child-2')
    for (const child of children) {
      const _prev = child.previousSibling
      const _next = child.nextSibling
    }
  })

  bench('tree traversal (walk entire tree)', () => {
    const walk = (node: any) => {
      for (const child of node.childNodes) {
        walk(child)
      }
    }
    walk(doc.body)
  })
})

// Benchmark: insertBefore & replaceChild
group('Advanced DOM Manipulation', () => {
  bench('insertBefore (100x)', () => {
    const doc = createDocument()
    const parent = doc.createElement('div')
    const reference = doc.createElement('span')
    parent.appendChild(reference)

    for (let i = 0; i < 100; i++) {
      const newEl = doc.createElement('div')
      parent.insertBefore(newEl, reference)
    }
  }).baseline()

  bench('replaceChild (100x)', () => {
    const doc = createDocument()
    const parent = doc.createElement('div')

    for (let i = 0; i < 100; i++) {
      const oldChild = doc.createElement('div')
      oldChild.textContent = `Old ${i}`
      parent.appendChild(oldChild)
    }

    for (let i = 0; i < 100; i++) {
      const newChild = doc.createElement('span')
      newChild.textContent = `New ${i}`
      parent.replaceChild(newChild, parent.children[0])
    }
  })

  bench('cloneNode shallow (100x)', () => {
    const doc = createDocument()
    const el = doc.createElement('div')
    el.setAttribute('id', 'source')
    el.setAttribute('class', 'test')

    for (let i = 0; i < 100; i++) {
      el.cloneNode(false)
    }
  })

  bench('cloneNode deep (100x)', () => {
    const doc = createDocument()
    const el = doc.createElement('div')
    el.innerHTML = '<div><span>Text</span><p>More</p></div>'

    for (let i = 0; i < 100; i++) {
      el.cloneNode(true)
    }
  })
})

// Benchmark: Style Operations
group('Style Operations', () => {
  const doc = createDocument()
  const el = doc.createElement('div')

  bench('style.setProperty', () => {
    el.style.setProperty('color', 'red')
  }).baseline()

  bench('style.getPropertyValue', () => {
    el.style.getPropertyValue('color')
  })

  bench('style.removeProperty', () => {
    el.style.removeProperty('color')
  })

  bench('set multiple styles (10)', () => {
    const element = doc.createElement('div')
    element.style.setProperty('color', 'red')
    element.style.setProperty('background', 'blue')
    element.style.setProperty('padding', '10px')
    element.style.setProperty('margin', '20px')
    element.style.setProperty('border', '1px solid black')
    element.style.setProperty('width', '100px')
    element.style.setProperty('height', '100px')
    element.style.setProperty('display', 'flex')
    element.style.setProperty('position', 'relative')
    element.style.setProperty('z-index', '10')
  })

  bench('getAttribute(style)', () => {
    const element = doc.createElement('div')
    element.setAttribute('style', 'color: red; background: blue;')
    element.getAttribute('style')
  })
})

// Benchmark: Dataset Operations
group('Dataset Operations', () => {
  const doc = createDocument()

  bench('dataset.set', () => {
    const el = doc.createElement('div')
    el.dataset.userId = '123'
  }).baseline()

  bench('dataset.get', () => {
    const el = doc.createElement('div')
    el.dataset.userId = '123'
    const _value = el.dataset.userId
  })

  bench('dataset multiple (10)', () => {
    const el = doc.createElement('div')
    for (let i = 0; i < 10; i++) {
      el.dataset[`attr${i}`] = `value${i}`
    }
  })

  bench('data-* via setAttribute/getAttribute', () => {
    const el = doc.createElement('div')
    el.setAttribute('data-user-id', '123')
    el.getAttribute('data-user-id')
  })
})

// Benchmark: Event Handling
group('Event Handling', () => {
  const window = new Window()
  const doc = window.document

  bench('addEventListener', () => {
    const el = doc.createElement('button')
    el.addEventListener('click', () => {})
  }).baseline()

  bench('removeEventListener', () => {
    const el = doc.createElement('button')
    const handler = () => {}
    el.addEventListener('click', handler)
    el.removeEventListener('click', handler)
  })

  bench('dispatchEvent', () => {
    const el = doc.createElement('button')
    let _clicked = false
    el.addEventListener('click', () => {
      _clicked = true
    })
    const event = new window.CustomEvent('click')
    el.dispatchEvent(event)
  })

  bench('add 10 event listeners', () => {
    const el = doc.createElement('div')
    for (let i = 0; i < 10; i++) {
      el.addEventListener(`event${i}`, () => {})
    }
  })

  bench('dispatch 100 events', () => {
    const el = doc.createElement('div')
    let _count = 0
    el.addEventListener('test', () => {
      _count++
    })
    for (let i = 0; i < 100; i++) {
      const event = new window.CustomEvent('test')
      el.dispatchEvent(event)
    }
  })
})

// Benchmark: Canvas API
group('Canvas API', () => {
  const window = new Window()
  const doc = window.document

  bench('createElement canvas', () => {
    doc.createElement('canvas')
  }).baseline()

  bench('canvas getContext 2d', () => {
    const canvas = doc.createElement('canvas')
    canvas.getContext('2d')
  })

  bench('canvas drawing operations', () => {
    const canvas = doc.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'red'
      ctx.fillRect(0, 0, 100, 100)
      ctx.strokeStyle = 'blue'
      ctx.strokeRect(10, 10, 80, 80)
    }
  })

  bench('canvas state save/restore', () => {
    const canvas = doc.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.save()
      ctx.fillStyle = 'red'
      ctx.restore()
    }
  })

  bench('canvas paths', () => {
    const canvas = doc.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(10, 10)
      ctx.lineTo(100, 100)
      ctx.arc(50, 50, 40, 0, Math.PI * 2)
      ctx.closePath()
      ctx.stroke()
    }
  })

  bench('canvas toDataURL', () => {
    const canvas = doc.createElement('canvas')
    canvas.toDataURL()
  })
})

// Benchmark: Storage API
group('Storage API', () => {
  bench('localStorage setItem', () => {
    const window = new Window()
    window.localStorage.setItem('key', 'value')
  }).baseline()

  bench('localStorage getItem', () => {
    const window = new Window()
    window.localStorage.setItem('key', 'value')
    window.localStorage.getItem('key')
  })

  bench('localStorage 100 operations', () => {
    const window = new Window()
    for (let i = 0; i < 100; i++) {
      window.localStorage.setItem(`key${i}`, `value${i}`)
    }
  })

  bench('sessionStorage setItem', () => {
    const window = new Window()
    window.sessionStorage.setItem('key', 'value')
  })
})

// Benchmark: DocumentFragment
group('DocumentFragment Operations', () => {
  const doc = createDocument()

  bench('createDocumentFragment', () => {
    doc.createDocumentFragment()
  }).baseline()

  bench('fragment + append 100 elements', () => {
    const fragment = doc.createDocumentFragment()
    for (let i = 0; i < 100; i++) {
      const el = doc.createElement('div')
      el.textContent = `Item ${i}`
      fragment.appendChild(el)
    }
  })

  bench('fragment vs direct append (100)', () => {
    const parent = doc.createElement('div')
    const fragment = doc.createDocumentFragment()

    for (let i = 0; i < 100; i++) {
      const el = doc.createElement('div')
      fragment.appendChild(el)
    }

    parent.appendChild(fragment)
  })
})

// Benchmark: Real-World Scenarios
group('🌍 Real-World Scenarios', () => {
  bench('Build data table (50 rows × 5 cols)', () => {
    const doc = createDocument()
    const table = doc.createElement('table')

    for (let i = 0; i < 50; i++) {
      const row = doc.createElement('tr')
      for (let j = 0; j < 5; j++) {
        const cell = doc.createElement('td')
        cell.textContent = `Cell ${i},${j}`
        row.appendChild(cell)
      }
      table.appendChild(row)
    }

    doc.body!.appendChild(table)
  }).baseline()

  bench('Update list items (100 items)', () => {
    const doc = createDocument()
    const ul = doc.createElement('ul')

    // Create list
    for (let i = 0; i < 100; i++) {
      const li = doc.createElement('li')
      li.textContent = `Item ${i}`
      li.setAttribute('class', 'item')
      ul.appendChild(li)
    }

    // Update all items
    const items = ul.querySelectorAll('.item')
    for (let i = 0; i < items.length; i++) {
      items[i].textContent = `Updated ${i}`
      items[i].classList.add('updated')
    }
  })

  bench('Filter and re-render list (100→50)', () => {
    const doc = createDocument()
    const container = doc.createElement('div')

    // Initial render
    const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}`, active: i % 2 === 0 }))

    for (const item of data) {
      const el = doc.createElement('div')
      el.setAttribute('data-id', item.id.toString())
      el.textContent = item.name
      container.appendChild(el)
    }

    // Filter and re-render
    container.innerHTML = ''
    const filtered = data.filter(item => item.active)
    for (const item of filtered) {
      const el = doc.createElement('div')
      el.setAttribute('data-id', item.id.toString())
      el.textContent = item.name
      container.appendChild(el)
    }
  })

  bench('Build card grid (4×6 cards)', () => {
    const doc = createDocument()
    const grid = doc.createElement('div')
    grid.setAttribute('class', 'grid')

    for (let i = 0; i < 24; i++) {
      const card = doc.createElement('div')
      card.setAttribute('class', 'card')

      const title = doc.createElement('h3')
      title.textContent = `Card ${i}`

      const desc = doc.createElement('p')
      desc.textContent = 'Lorem ipsum dolor sit amet'

      const button = doc.createElement('button')
      button.textContent = 'Click me'
      button.setAttribute('class', 'btn')

      card.appendChild(title)
      card.appendChild(desc)
      card.appendChild(button)
      grid.appendChild(card)
    }

    doc.body!.appendChild(grid)
  })

  bench('Form with validation (10 inputs)', () => {
    const doc = createDocument()
    const form = doc.createElement('form')

    for (let i = 0; i < 10; i++) {
      const label = doc.createElement('label')
      label.textContent = `Field ${i}`

      const input = doc.createElement('input')
      input.setAttribute('type', 'text')
      input.setAttribute('name', `field${i}`)
      input.setAttribute('required', 'true')
      input.setAttribute('class', 'form-input')

      const error = doc.createElement('span')
      error.setAttribute('class', 'error')
      error.textContent = ''

      form.appendChild(label)
      form.appendChild(input)
      form.appendChild(error)
    }

    // Validate all inputs
    const inputs = form.querySelectorAll('input')
    for (const input of inputs) {
      const isValid = input.hasAttribute('required')
      if (!isValid) {
        const errorSpan = input.nextSibling
        if (errorSpan)
          (errorSpan as any).textContent = 'Required field'
      }
    }
  })
})

// Benchmark: Memory & Cleanup
group('Memory Efficiency', () => {
  bench('create + destroy 100 windows', () => {
    for (let i = 0; i < 100; i++) {
      const window = new Window()
      window.document.body!.innerHTML = '<div>Test</div>'
    }
  })

  bench('large DOM tree creation', () => {
    const doc = createDocument()
    const buildTree = (parent: any, depth: number) => {
      if (depth === 0)
        return
      for (let i = 0; i < 5; i++) {
        const el = doc.createElement('div')
        parent.appendChild(el)
        buildTree(el, depth - 1)
      }
    }
    buildTree(doc.body, 5)
  })

  bench('clone deep tree', () => {
    const doc = createDocument()
    doc.body!.innerHTML = `
      <div>
        ${Array.from({ length: 50 }).map(() => '<div><span>Text</span></div>').join('')}
      </div>
    `
  })
})

// Run all benchmarks
await run({
  format: 'mitata', // output format: 'mitata', 'json', 'markdown', 'quiet'
  colors: true, // enable/disable colors
})
