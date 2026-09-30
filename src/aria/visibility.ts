/**
 * Two related questions with different answers, kept deliberately apart.
 *
 * "Can a user see this?" is about painting: `display`, `visibility` and the
 * `hidden` attribute, inherited from every ancestor. That is what `isVisible()`
 * asks.
 *
 * "Would a screen reader announce this?" is the same, plus `aria-hidden`. An
 * `aria-hidden` element is painted — it is still visible — but it is removed
 * from the accessibility tree, and a role query reads that tree. That is what
 * `getByRole()` and the other `getBy*` helpers ask (#1601).
 *
 * Both walk the ancestor chain, because hiding a container hides everything
 * inside it, and both resolve through `getComputedStyle()` so a rule from a
 * stylesheet counts, not only an inline style.
 *
 * Collapsing an element to nothing hides it too (#1617). `height: 0` is how a
 * closed accordion, disclosure or drawer is built when the author wants a
 * transition, since `display: none` cannot be animated — and that markup was
 * fully reachable, so a role query matched a button inside a shut drawer and,
 * since #1604, clicking it succeeded.
 *
 * This is narrower than Playwright's rule, deliberately. Playwright asks whether
 * the bounding box is non-empty; there is no layout pass here, so an element
 * nobody sized reports `0 × 0` — a plain `<button>Save</button>` with no CSS has
 * an empty box. Zero therefore means *unknown*, not *collapsed*, and only a
 * declared zero can be trusted to mean the latter. A reader who knows
 * Playwright's definition should not assume the box is being consulted.
 */

interface ElementLike {
  nodeType?: number
  parentNode?: any
  ownerDocument?: any
  hasAttribute?: (name: string) => boolean
  getAttribute?: (name: string) => string | null
}

const ELEMENT_NODE = 1

/** The properties that can collapse a box, as `getComputedStyle` names them. */
const COLLAPSING_PROPERTIES = ['height', 'width', 'max-height', 'max-width']

/**
 * Whether a resolved size is a *declared* zero.
 *
 * `auto` and `''` mean nobody said, and `none` is `max-height`'s spelling of the
 * same. Treating any of those as zero would make almost every unstyled element
 * invisible, because without layout an unsized box really does measure nothing.
 *
 * Those three are named for the reader, not for the machine: they would fall out
 * of the `Number.isFinite` check below anyway. Kept because this predicate
 * decides whether elements exist as far as every query is concerned, and the
 * reason a word is not a zero is worth saying out loud.
 *
 * `0%` counts: zero of any container is zero. Anything that does not parse as a
 * number — `calc(...)`, a custom property — is left alone rather than guessed at,
 * which errs toward the element staying reachable.
 */
function isDeclaredZero(value: string | null | undefined): boolean {
  const declared = String(value ?? '').trim().toLowerCase()

  if (declared === '' || declared === 'auto' || declared === 'none')
    return false

  const size = Number.parseFloat(declared)
  return Number.isFinite(size) && size === 0
}

/** Whether anything in the element's own style collapses it to nothing. */
function isCollapsed(style: any): boolean {
  return COLLAPSING_PROPERTIES.some(property => isDeclaredZero(style.getPropertyValue?.(property)))
}

/** The resolved style, or null when the element is not in a document. */
function computedStyle(element: ElementLike): any {
  const view = element.ownerDocument?.defaultView ?? element.ownerDocument
  return view?.getComputedStyle?.(element) ?? null
}

/**
 * Whether the element is painted: nothing in its ancestor chain hides it with
 * `display: none`, `visibility: hidden|collapse`, the `hidden` attribute, or a
 * declared zero size.
 */
export function isRendered(element: ElementLike): boolean {
  for (let node: any = element; node && node.nodeType === ELEMENT_NODE; node = node.parentNode) {
    if (hidesItself(node))
      return false
  }

  return true
}

/**
 * Whether the element's own style hides it, ignoring its ancestors.
 *
 * @internal Shared with `innerText`, which walks the tree itself and so has
 * already dealt with ancestors by not descending into a hidden one. Calling the
 * ancestor-walking form per node would make that walk quadratic, and having two
 * definitions of "hidden" is the thing #1601 set out to avoid.
 */
export function hidesItself(element: ElementLike, style?: any): boolean {
  if (element.hasAttribute?.('hidden'))
    return true

  // A caller walking a whole tree can resolve the style itself and hand it over,
  // which is what lets `innerText` avoid resolving twice per element — and, when
  // the document has no stylesheets, avoid the cascade entirely by passing the
  // inline style, which is then the whole answer anyway.
  const resolved = style ?? computedStyle(element) ?? (element as any).style
  if (!resolved?.getPropertyValue)
    return false

  // An inline declaration block with nothing in it cannot hide anything, and most
  // elements have one. Worth the check because the alternative is six property
  // lookups per element on a tree walk — `innerText` visits every node.
  // A computed style reports no length, so this only short-circuits the inline
  // case, which is the one that needs it.
  if (resolved.length === 0)
    return false

  if (resolved.getPropertyValue('display') === 'none')
    return true

  const visibility = resolved.getPropertyValue('visibility')
  if (visibility === 'hidden' || visibility === 'collapse')
    return true

  // A collapse is normally declared on the container rather than on the control
  // inside it, which is why the caller checks every ancestor.
  return isCollapsed(resolved)
}

/**
 * Whether the element reaches the accessibility tree: painted, and not marked
 * `aria-hidden` on itself or an ancestor.
 */
export function isExposedToAria(element: ElementLike): boolean {
  for (let node: any = element; node && node.nodeType === ELEMENT_NODE; node = node.parentNode) {
    if (node.getAttribute?.('aria-hidden') === 'true')
      return false
  }

  return isRendered(element)
}
