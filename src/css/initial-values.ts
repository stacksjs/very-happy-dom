/**
 * Initial values, and the per-tag `display` a document applies in place of a
 * user-agent stylesheet.
 *
 * Lifted out of `getComputedStyle` so the layout pass reads the same defaults.
 * Two copies would drift, and the one layout needs is exactly the one
 * `getComputedStyle` already answered with.
 */

/**
 * The properties that inherit when nothing declares them.
 *
 * Shared so `getComputedStyle` and the layout pass cannot disagree about what
 * comes down from a parent. They resolve it differently — layout wants a number
 * and `getComputedStyle` reports the declaration — but which properties
 * inherit at all is one fact and lives in one place.
 *
 * Only the ones a caller reads or layout uses. A complete list would be longer;
 * an inherited property missing from here falls back to its initial value,
 * which is the behaviour everything had before any of this.
 */
export const INHERITED_PROPERTIES: ReadonlySet<string> = new Set([
  'color',
  'cursor',
  'direction',
  'font',
  'font-family',
  'font-size',
  'font-style',
  'font-variant',
  'font-weight',
  'letter-spacing',
  'line-height',
  'list-style',
  'list-style-image',
  'list-style-position',
  'list-style-type',
  'text-align',
  'text-indent',
  'text-transform',
  'visibility',
  'white-space',
  'word-spacing',
])

const DEFAULT_DISPLAY: Record<string, string> = {
  // Block
  ADDRESS: 'block', ARTICLE: 'block', ASIDE: 'block', BLOCKQUOTE: 'block',
  BODY: 'block', DETAILS: 'block', DIALOG: 'block', DIV: 'block',
  DL: 'block', DT: 'block', FIELDSET: 'block', FIGCAPTION: 'block',
  FIGURE: 'block', FOOTER: 'block', FORM: 'block', H1: 'block',
  H2: 'block', H3: 'block', H4: 'block', H5: 'block', H6: 'block',
  HEADER: 'block', HR: 'block', HTML: 'block', LEGEND: 'block',
  MAIN: 'block', NAV: 'block', OL: 'block', P: 'block',
  PRE: 'block', SECTION: 'block', UL: 'block',
  // List-item
  LI: 'list-item',
  // Table
  TABLE: 'table', CAPTION: 'table-caption',
  THEAD: 'table-header-group', TBODY: 'table-row-group',
  TFOOT: 'table-footer-group', TR: 'table-row',
  TH: 'table-cell', TD: 'table-cell', COLGROUP: 'table-column-group',
  COL: 'table-column',
  // Inline-block
  BUTTON: 'inline-block', INPUT: 'inline-block', SELECT: 'inline-block',
  TEXTAREA: 'inline-block',
  // Inline (default for everything else) — these are explicit for clarity
  A: 'inline', ABBR: 'inline', B: 'inline', CITE: 'inline', CODE: 'inline',
  DFN: 'inline', EM: 'inline', I: 'inline', KBD: 'inline',
  LABEL: 'inline', MARK: 'inline', Q: 'inline', S: 'inline',
  SAMP: 'inline', SMALL: 'inline', SPAN: 'inline', STRONG: 'inline',
  SUB: 'inline', SUP: 'inline', TIME: 'inline', U: 'inline',
  VAR: 'inline', IMG: 'inline', BR: 'inline',
  // Hidden
  SCRIPT: 'none', STYLE: 'none', HEAD: 'none', TITLE: 'none',
  META: 'none', LINK: 'none',
  // Flex by default? No — keep author-specified.
}

export function initialValue(prop: string, tagName: string): string {
  switch (prop) {
    case 'display': return DEFAULT_DISPLAY[tagName] || 'inline'
    case 'visibility': return 'visible'
    case 'opacity': return '1'
    case 'position': return 'static'
    case 'float': return 'none'
    case 'clear': return 'none'
    case 'overflow':
    case 'overflow-x':
    case 'overflow-y':
      return 'visible'
    case 'box-sizing': return 'content-box'
    case 'z-index': return 'auto'
    case 'flex-direction': return 'row'
    case 'flex-wrap': return 'nowrap'
    case 'flex-grow': return '0'
    // Not 0: an item shrinks by default, which is why flex children get
    // squeezed rather than overflowing when the line is too narrow.
    case 'flex-shrink': return '1'
    case 'flex-basis': return 'auto'
    case 'align-self': return 'auto'
    case 'justify-self': return 'auto'
    case 'justify-items': return 'legacy'
    case 'order': return '0'
    case 'grid-template-columns':
    case 'grid-template-rows':
    case 'grid-template-areas':
      return 'none'
    case 'grid-auto-columns':
    case 'grid-auto-rows':
      return 'auto'
    case 'grid-auto-flow': return 'row'
    case 'grid-row-start':
    case 'grid-row-end':
    case 'grid-column-start':
    case 'grid-column-end':
      return 'auto'
    case 'row-gap':
    case 'column-gap':
      return 'normal'
    case 'justify-content': return 'normal'
    case 'align-items': return 'normal'
    case 'align-content': return 'normal'
    case 'text-align': return 'start'
    case 'text-transform': return 'none'
    case 'text-decoration':
    case 'text-decoration-line':
      return 'none'
    case 'font-size': return '16px'
    case 'font-family': return 'serif'
    case 'font-weight': return '400'
    case 'font-style': return 'normal'
    case 'line-height': return 'normal'
    case 'color': return 'rgb(0, 0, 0)'
    case 'background-color': return 'rgba(0, 0, 0, 0)'
    case 'border-width':
    case 'border-top-width':
    case 'border-right-width':
    case 'border-bottom-width':
    case 'border-left-width':
      return '0px'
    case 'border-style':
    case 'border-top-style':
    case 'border-right-style':
    case 'border-bottom-style':
    case 'border-left-style':
      return 'none'
    case 'margin':
    case 'margin-top':
    case 'margin-right':
    case 'margin-bottom':
    case 'margin-left':
    case 'padding':
    case 'padding-top':
    case 'padding-right':
    case 'padding-bottom':
    case 'padding-left':
      return '0px'
    case 'width':
    case 'height':
    case 'min-width':
    case 'min-height':
      return 'auto'
    case 'max-width':
    case 'max-height':
      return 'none'
    case 'cursor': return 'auto'
    case 'pointer-events': return 'auto'
    default: return ''
  }
}

