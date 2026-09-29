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
 */

interface ElementLike {
  nodeType?: number
  parentNode?: any
  ownerDocument?: any
  hasAttribute?: (name: string) => boolean
  getAttribute?: (name: string) => string | null
}

const ELEMENT_NODE = 1

/** The resolved style, or null when the element is not in a document. */
function computedStyle(element: ElementLike): any {
  const view = element.ownerDocument?.defaultView ?? element.ownerDocument
  return view?.getComputedStyle?.(element) ?? null
}

/**
 * Whether the element is painted: nothing in its ancestor chain hides it with
 * `display: none`, `visibility: hidden|collapse` or the `hidden` attribute.
 */
export function isRendered(element: ElementLike): boolean {
  for (let node: any = element; node && node.nodeType === ELEMENT_NODE; node = node.parentNode) {
    if (node.hasAttribute?.('hidden'))
      return false

    const style = computedStyle(node)
    if (!style)
      continue

    if (style.display === 'none')
      return false

    const visibility = style.visibility
    if (visibility === 'hidden' || visibility === 'collapse')
      return false
  }

  return true
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
