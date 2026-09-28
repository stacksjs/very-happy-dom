/**
 * ARIA roles and accessible names.
 *
 * `getByRole` is the locator people reach for first, and it needs two things
 * this package did not have: the role an element carries without anyone writing
 * one, and the name a screen reader would announce for it.
 *
 * This is a working subset rather than the full specification. It covers the
 * elements test suites actually query and the naming paths that decide those
 * queries — `aria-labelledby`, `aria-label`, the native label of a control, and
 * name-from-content. Where it cannot determine something it returns null or an
 * empty string rather than guessing.
 */

/** The parts of an element this module reads. */
interface ElementLike {
  tagName: string
  getAttribute: (name: string) => string | null
  hasAttribute: (name: string) => boolean
  textContent: string | null
  labels?: ElementLike[]
  ownerDocument?: { getElementById: (id: string) => ElementLike | null } | null
  querySelector?: (selector: string) => ElementLike | null
}

/** Roles whose name may come from the element's own text. */
const NAME_FROM_CONTENT = new Set([
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'gridcell',
  'heading',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'row',
  'rowheader',
  'switch',
  'tab',
  'tooltip',
  'treeitem',
])

/** `<input type>` to role. Types absent here have no mapped role. */
const INPUT_TYPE_ROLES: Record<string, string> = {
  button: 'button',
  submit: 'button',
  reset: 'button',
  image: 'button',
  checkbox: 'checkbox',
  radio: 'radio',
  range: 'slider',
  number: 'spinbutton',
  search: 'searchbox',
  email: 'textbox',
  tel: 'textbox',
  text: 'textbox',
  url: 'textbox',
}

/** Tag name to role, for the tags that map unconditionally. */
const TAG_ROLES: Record<string, string> = {
  ARTICLE: 'article',
  ASIDE: 'complementary',
  BUTTON: 'button',
  DD: 'definition',
  DIALOG: 'dialog',
  DL: 'list',
  DT: 'term',
  FIELDSET: 'group',
  FIGURE: 'figure',
  FOOTER: 'contentinfo',
  FORM: 'form',
  H1: 'heading',
  H2: 'heading',
  H3: 'heading',
  H4: 'heading',
  H5: 'heading',
  H6: 'heading',
  HEADER: 'banner',
  HR: 'separator',
  LI: 'listitem',
  MAIN: 'main',
  MATH: 'math',
  MENU: 'list',
  METER: 'meter',
  NAV: 'navigation',
  OL: 'list',
  OPTGROUP: 'group',
  OPTION: 'option',
  OUTPUT: 'status',
  P: 'paragraph',
  PROGRESS: 'progressbar',
  SEARCH: 'search',
  TABLE: 'table',
  TBODY: 'rowgroup',
  TD: 'cell',
  TEXTAREA: 'textbox',
  TFOOT: 'rowgroup',
  TH: 'columnheader',
  THEAD: 'rowgroup',
  TR: 'row',
  UL: 'list',
}

/**
 * The element's role: an explicit `role` attribute wins, otherwise the implicit
 * role for its tag. Returns null when nothing maps.
 */
export function computeRole(element: ElementLike): string | null {
  const explicit = element.getAttribute('role')?.trim()
  if (explicit) {
    // A role list is allowed; the first supported token applies.
    const first = explicit.split(/\s+/)[0]
    if (first)
      return first
  }

  const tag = element.tagName?.toUpperCase()

  if (tag === 'A' || tag === 'AREA')
    return element.hasAttribute('href') ? 'link' : null

  if (tag === 'INPUT') {
    const type = (element.getAttribute('type') || 'text').toLowerCase()
    // `hidden` has no role at all, rather than an unlabelled textbox.
    if (type === 'hidden')
      return null
    return INPUT_TYPE_ROLES[type] ?? 'textbox'
  }

  if (tag === 'SELECT') {
    // A dropdown is a combobox; a visibly multi-row control is a listbox.
    const multiple = element.hasAttribute('multiple')
    const size = Number(element.getAttribute('size') ?? '0')
    return multiple || size > 1 ? 'listbox' : 'combobox'
  }

  if (tag === 'IMG') {
    const alt = element.getAttribute('alt')
    // An explicitly empty alt marks the image decorative.
    return alt === '' ? 'presentation' : 'img'
  }

  if (tag === 'SECTION')
    // A region only counts as one once it has a name. Only the explicit
    // labelling forms are consulted: a section is not named from its content,
    // and calling the full name algorithm here would recurse, since that
    // algorithm asks for the role.
    return explicitName(element) ? 'region' : null

  return TAG_ROLES[tag] ?? null
}

function normalize(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * The name from the author-supplied labelling attributes alone.
 *
 * Role-independent, so it is safe to consult while deciding a role.
 */
function explicitName(element: ElementLike): string {
  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    const document = element.ownerDocument
    const named = labelledBy
      .split(/\s+/)
      .map(id => document?.getElementById(id))
      .filter(Boolean)
      .map(target => normalize(target!.textContent))
      .filter(Boolean)
      .join(' ')
    if (named)
      return named
  }

  const ariaLabel = normalize(element.getAttribute('aria-label'))
  if (ariaLabel)
    return ariaLabel

  return normalize(element.getAttribute('title'))
}

/**
 * The name a screen reader would announce.
 *
 * Follows the order that decides real queries: `aria-labelledby`, then
 * `aria-label`, then the element's native labelling, then content for the roles
 * that allow it, then `title`, and `placeholder` as a last resort for fields.
 */
export function accessibleName(element: ElementLike): string {
  const labelledBy = element.getAttribute('aria-labelledby')
  if (labelledBy) {
    const document = element.ownerDocument
    const named = labelledBy
      .split(/\s+/)
      .map(id => document?.getElementById(id))
      .filter(Boolean)
      .map(target => normalize(target!.textContent))
      .filter(Boolean)
      .join(' ')
    if (named)
      return named
  }

  const ariaLabel = normalize(element.getAttribute('aria-label'))
  if (ariaLabel)
    return ariaLabel

  const tag = element.tagName?.toUpperCase()

  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    const fromLabel = (element.labels ?? [])
      .map(label => normalize(label.textContent))
      .filter(Boolean)
      .join(' ')
    if (fromLabel)
      return fromLabel

    // A push button's face is its value, not its label.
    const type = (element.getAttribute('type') || '').toLowerCase()
    if (tag === 'INPUT' && (type === 'button' || type === 'submit' || type === 'reset')) {
      const value = normalize(element.getAttribute('value'))
      if (value)
        return value
    }
  }

  if (tag === 'IMG' || tag === 'AREA') {
    const alt = normalize(element.getAttribute('alt'))
    if (alt)
      return alt
  }

  if (tag === 'FIELDSET') {
    const legend = normalize(element.querySelector?.('legend')?.textContent)
    if (legend)
      return legend
  }

  if (tag === 'TABLE') {
    const caption = normalize(element.querySelector?.('caption')?.textContent)
    if (caption)
      return caption
  }

  const role = computeRole(element)
  if (role && NAME_FROM_CONTENT.has(role)) {
    const content = normalize(element.textContent)
    if (content)
      return content
  }

  const title = normalize(element.getAttribute('title'))
  if (title)
    return title

  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    const placeholder = normalize(element.getAttribute('placeholder'))
    if (placeholder)
      return placeholder
  }

  return ''
}

/** Heading depth, or null when the element is not a heading. */
export function headingLevel(element: ElementLike): number | null {
  const explicit = element.getAttribute('aria-level')
  if (explicit && Number.isFinite(Number(explicit)))
    return Number(explicit)

  const match = /^H([1-6])$/.exec(element.tagName?.toUpperCase() ?? '')
  return match ? Number(match[1]) : null
}
