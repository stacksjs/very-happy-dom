import { beforeEach, describe, expect, test } from 'bun:test'
import { Browser } from '../src/browser/Browser'
import '../src/matchers'

// =============================================================================
// innerText renders text (#1614).
//
// It excluded hidden subtrees and trimmed the ends, but left interior runs of
// whitespace alone — so the only difference from textContent was the trimming,
// and the name promised three things while doing one and a half.
//
// It bites hardest on templated markup, which is to say all markup. Indentation
// between elements came through as literal runs of spaces, so a comparison
// against 'Save changes' failed for a reason invisible in the source. Playwright's
// toHaveText normalises before comparing, so an assertion routed through a matcher
// was insulated and a direct read was not — the same markup passing one and
// failing the other.
//
// The visibility half had #1600's gap too: it read `el.style` directly, so a
// display: none from a stylesheet was not excluded.
// =============================================================================

let page: any
let document: any

beforeEach(() => {
  page = new Browser().newPage()
  document = page.mainFrame.window.document
  page.setDefaultTimeout(200)
})

const text = (selector: string): string => document.querySelector(selector).innerText

describe('whitespace is collapsed', () => {
  test('runs of spaces, tabs and newlines become one space', async () => {
    await page.setContent('<p id="p">  Save   changes \n  more  </p>')

    expect(text('#p')).toBe('Save changes more')
  })

  test('indented markup reads the same as the single-line form', async () => {
    // The case that makes this matter: the two are the same document as far as a
    // reader is concerned, and used to give different answers.
    await page.setContent(`
      <div id="indented">
        <span>Save</span>
        <span>changes</span>
      </div>
      <div id="tight"><span>Save</span> <span>changes</span></div>
    `)

    expect(text('#indented')).toBe(text('#tight'))
    expect(text('#tight')).toBe('Save changes')
  })

  test('a space is not doubled across element boundaries', async () => {
    await page.setContent('<p id="p"><span>a </span><span> b</span></p>')

    expect(text('#p')).toBe('a b')
  })

  test('textContent is untouched', async () => {
    // It was correct as it stood, and this is the difference between the two.
    await page.setContent('<p id="p">  Save   changes  </p>')

    expect(document.querySelector('#p').textContent).toBe('  Save   changes  ')
    expect(text('#p')).toBe('Save changes')
  })
})

describe('line structure survives', () => {
  test('block elements are separated by a newline', async () => {
    await page.setContent('<div id="d"><p>one</p><p>two</p></div>')

    expect(text('#d')).toBe('one\ntwo')
  })

  test('br is a newline, and spaces before it do not render', async () => {
    await page.setContent('<p id="p">one   <br>   two</p>')

    expect(text('#p')).toBe('one\ntwo')
  })

  test('inline elements do not break the line', async () => {
    await page.setContent('<p id="p">a <span>b</span> c</p>')

    expect(text('#p')).toBe('a b c')
  })
})

describe('white-space preserves what it says', () => {
  test('a <pre> keeps its runs with no rule needed', async () => {
    await page.setContent('<pre id="p">two  spaces\nand a line</pre>')

    expect(text('#p')).toBe('two  spaces\nand a line')
  })

  test('white-space: pre from a stylesheet', async () => {
    await page.setContent('<head><style>.keep { white-space: pre }</style></head>'
      + '<body><div class="keep" id="d">two  spaces</div></body>')

    expect(text('#d')).toBe('two  spaces')
  })

  test('pre-line keeps newlines and collapses spaces', async () => {
    await page.setContent('<head><style>.pl { white-space: pre-line }</style></head>'
      + '<body><div class="pl" id="d">two  spaces\nand a line</div></body>')

    expect(text('#d')).toBe('two spaces\nand a line')
  })

  test('it is inherited by children', async () => {
    await page.setContent('<head><style>.keep { white-space: pre }</style></head>'
      + '<body><div class="keep" id="d"><span>two  spaces</span></div></body>')

    expect(text('#d')).toBe('two  spaces')
  })

  test('blank lines inside a pre are not squeezed', async () => {
    // The generic cleanup collapses three-plus newlines, which would be the
    // opposite of what `pre` asks for.
    await page.setContent('<pre id="p">a\n\n\n\nb</pre>')

    expect(text('#p')).toBe('a\n\n\n\nb')
  })
})

describe('visibility comes from the cascade, not the style attribute', () => {
  test('display: none from a stylesheet is excluded', async () => {
    // The #1600 gap, in innerText: this used to include HIDDEN, because only the
    // inline style attribute was consulted.
    await page.setContent('<head><style>.gone { display: none }</style></head>'
      + '<body><p id="p">x<span class="gone">HIDDEN</span>y</p></body>')

    expect(text('#p')).toBe('xy')
  })

  test('an inline display: none still works', async () => {
    await page.setContent('<p id="p">x<span style="display:none">HIDDEN</span>y</p>')

    expect(text('#p')).toBe('xy')
  })

  test('visibility: hidden from a stylesheet is excluded', async () => {
    await page.setContent('<head><style>.invisible { visibility: hidden }</style></head>'
      + '<body><p id="p">x<span class="invisible">HIDDEN</span>y</p></body>')

    expect(text('#p')).toBe('xy')
  })

  test('the hidden attribute is excluded', async () => {
    await page.setContent('<p id="p">x<span hidden>HIDDEN</span>y</p>')

    expect(text('#p')).toBe('xy')
  })

  test('script and style contents never appear', async () => {
    await page.setContent('<div id="d"><script>var a = 1</script><style>.x{}</style>visible</div>')

    expect(text('#d')).toBe('visible')
  })
})

describe('the two readers still agree', () => {
  test('allInnerTexts matches innerText for the same element', async () => {
    // Pinned in #1607 and still pinned: normalising in one and not the other is
    // exactly the drift this was filed to avoid.
    await page.setContent('<ul><li>  one   spaced  </li><li>two</li></ul>')

    const fromAll = await page.locator('li').allInnerTexts()
    const fromOne = await page.locator('li').first().innerText()

    expect(fromAll[0]).toBe(fromOne)
    expect(fromAll).toEqual(['one spaced', 'two'])
  })

  test('toHaveText agrees with a direct read', async () => {
    // The trap named in the issue: the matcher normalised before comparing, so
    // the same markup passed one and failed the other.
    await page.setContent('<p id="p">  Save   changes  </p>')

    await expect(page.locator('#p')).toHaveText('Save changes')
    expect(text('#p')).toBe('Save changes')
  })
})

describe('the walk stays linear', () => {
  test('a deep tree does not pay per ancestor', async () => {
    // Visibility is checked per node with the non-walking predicate; using the
    // ancestor-walking form would make this O(n*depth).
    const depth = 400
    await page.setContent(`<div id="root">${'<div>'.repeat(depth)}leaf${'</div>'.repeat(depth)}</div>`)

    const started = Date.now()
    expect(text('#root')).toBe('leaf')
    expect(Date.now() - started).toBeLessThan(2000)
  })

  test('cost grows with the tree, not with its square', async () => {
    // The first version of this accumulated into one string and stripped its tail
    // at every block boundary — a regex and a copy over everything so far, which
    // is quadratic. A 2000-element table took 6.3ms where the chunk form takes
    // 0.4ms. A ratio rather than a wall-clock budget, because the shape is what
    // matters and absolute numbers depend on the machine.
    const rows = (count: number, id: string): string => {
      const markup = Array.from({ length: count }, (_, i) =>
        `<tr><td>Trail ${i}</td><td><span>  ${i} km  </span></td></tr>`).join('')
      return `<table id="${id}"><tbody>${markup}</tbody></table>`
    }

    // Both sizes in one document, so the two can be measured alternately.
    await page.setContent(rows(200, 'small') + rows(800, 'large'))
    const small = document.querySelector('#small')
    const large = document.querySelector('#large')

    const ratio = growthRatio(() => void small.innerText, () => void large.innerText)

    // Four times the rows. Linear is about 4x; quadratic would be about 16x, so
    // the threshold sits between the two. `measures the shape and not the
    // machine` below is what shows 8 is low enough to catch quadratic.
    expect(ratio, `ratio was ${ratio.toFixed(2)}`).toBeLessThan(8)
  })

  test('the measurement measures the shape and not the machine', () => {
    // Calibration, so the test above cannot quietly stop meaning anything. The
    // same harness is pointed at two functions whose shape is known: it has to
    // clear the linear one and catch the quadratic one. If `growthRatio` were
    // ever loosened enough to stop detecting quadratic growth, this fails.
    const linear = (count: number): void => {
      const chunks: string[] = []
      for (let i = 0; i < count; i++)
        chunks.push(`Trail ${i}  `)
      void chunks.join('\n').trim()
    }

    // The shape of the original bug: normalising the whole accumulated string
    // once per row. The regex is global and scans forward, so every row pays
    // for every row before it.
    //
    // An end-anchored `/\s+$/` was tried here first and is not quadratic — it
    // scans backwards from the end, so it costs the same whatever has piled up
    // in front of it. It measured between 6.7 and 9.4, straddling the
    // threshold, which would have made this calibration flakier than the test
    // it is meant to protect.
    const quadratic = (count: number): void => {
      let text = ''
      for (let i = 0; i < count; i++) {
        text += `Trail ${i}  \n`
        text = text.replace(/[ \t]+\n/g, '\n')
      }
      void text
    }

    const linearRatio = growthRatio(() => linear(200), () => linear(800))
    const quadraticRatio = growthRatio(() => quadratic(200), () => quadratic(800))

    expect(linearRatio, `linear ratio was ${linearRatio.toFixed(2)}`).toBeLessThan(8)
    expect(quadraticRatio, `quadratic ratio was ${quadraticRatio.toFixed(2)}`).toBeGreaterThan(8)
  })
})

/**
 * How much slower an operation gets when its input grows four times.
 *
 * About 4 for a linear operation and about 16 for a quadratic one. Timing in a
 * test is the obvious way to write this and the obvious way to get a flaky
 * test, so two things are done about it:
 *
 * The two sizes are sampled **alternately** rather than one size and then the
 * other. Sampling in phases means a garbage collection or a busy moment during
 * the second phase inflates one arm of the ratio and nothing cancels it — which
 * is how the earlier version of this failed occasionally in a full-suite run
 * while passing every time on its own. Alternating puts any such interruption
 * on both arms.
 *
 * And the ratio is the **best of several rounds**, each round being a minimum
 * per size. Both are the right estimator for an asymptotic property: the
 * fastest sample is the one least polluted by whatever else is running, and a
 * single bad round cannot decide the result.
 */
function growthRatio(small: () => void, large: () => void, rounds = 3, samples = 7): number {
  // Warm up both, so neither pays for a first-call compile inside a sample.
  for (let i = 0; i < 5; i++) {
    small()
    large()
  }

  let best = Number.POSITIVE_INFINITY

  for (let round = 0; round < rounds; round++) {
    let bestSmall = Number.POSITIVE_INFINITY
    let bestLarge = Number.POSITIVE_INFINITY

    for (let i = 0; i < samples; i++) {
      let started = Bun.nanoseconds()
      small()
      bestSmall = Math.min(bestSmall, Bun.nanoseconds() - started)

      started = Bun.nanoseconds()
      large()
      bestLarge = Math.min(bestLarge, Bun.nanoseconds() - started)
    }

    if (bestSmall > 0)
      best = Math.min(best, bestLarge / bestSmall)
  }

  return best
}
