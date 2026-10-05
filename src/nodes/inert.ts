/**
 * Template content is inert: elements in it are not custom-element
 * constructed or upgraded, as in a browser, where template content belongs to
 * a document with no browsing context. A component written for a browser
 * relies on that - a <template> full of <video> or custom elements costs
 * nothing until it is instantiated.
 *
 * Parsing a template's children, and cloning nodes that live in template
 * content, run inside `inert()`; `isInert()` is what element creation checks.
 */
let inertDepth = 0

export function isInert(): boolean {
  return inertDepth > 0
}

export function inert<T>(fn: () => T): T {
  inertDepth++
  try {
    return fn()
  }
  finally {
    inertDepth--
  }
}

/** Whether a node sits inside some template's content. */
export function isInTemplateContent(node: any): boolean {
  let current = node?.parentNode
  while (current) {
    if (current._isTemplateContent)
      return true
    current = current.parentNode
  }
  return false
}
