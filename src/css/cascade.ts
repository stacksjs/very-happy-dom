/**
 * Style cascade
 *
 * Resolves which declaration wins for an element, given the document's
 * stylesheets. `getComputedStyle` used to read the inline `style` attribute and
 * nothing else, so anything styled through a class, id or type selector was
 * invisible to it — which silently returns the wrong answer rather than failing.
 *
 * Only the author origin is modelled. There is no user-agent stylesheet beyond
 * the per-tag defaults `VirtualDocument` already applies, and no inheritance:
 * this resolves declarations that target the element itself.
 */

/** The parts of an element this module needs, kept structural to avoid a cycle. */
interface ElementLike {
  matches: (selector: string) => boolean
}

interface StyleDeclarationLike {
  getPropertyValue: (property: string) => string
  getPropertyPriority: (property: string) => string
  [Symbol.iterator]: () => Iterator<string>
}

interface StyleRuleLike {
  selectorText?: string
  style?: StyleDeclarationLike
}

interface StyleSheetLike {
  cssRules?: ArrayLike<unknown>
}

interface Declaration {
  value: string
  specificity: number
  order: number
}

/**
 * A winning normal declaration and a winning important one per property. They
 * are tracked separately because the inline attribute sits between them in the
 * cascade: sheet-normal < inline-normal < sheet-important < inline-important.
 */
export interface Cascade {
  normal: Map<string, Declaration>
  important: Map<string, Declaration>
}

/**
 * Selector specificity as a single comparable number.
 *
 * Counts ids, then class/attribute/pseudo-class, then type/pseudo-element, and
 * packs them so a higher category always outranks a lower one. Functional
 * pseudo-classes are approximated: the tokens inside `:not(...)` and `:is(...)`
 * are counted as they are encountered, which matches the spec for the common
 * single-argument cases.
 */
export function specificity(selector: string): number {
  // Strip strings so their contents cannot be mistaken for selector tokens.
  const cleaned = selector.replace(/"[^"]*"|'[^']*'/g, '""')

  let ids = 0
  let classes = 0
  let types = 0

  // Pseudo-elements rank with types; pseudo-classes rank with classes.
  const pseudoElements = cleaned.match(/::[\w-]+/g)
  types += pseudoElements ? pseudoElements.length : 0

  const withoutPseudoElements = cleaned.replace(/::[\w-]+/g, ' ')

  const idMatches = withoutPseudoElements.match(/#[\w-]+/g)
  ids += idMatches ? idMatches.length : 0

  const classMatches = withoutPseudoElements.match(/\.[\w-]+/g)
  classes += classMatches ? classMatches.length : 0

  const attributeMatches = withoutPseudoElements.match(/\[[^\]]*\]/g)
  classes += attributeMatches ? attributeMatches.length : 0

  const pseudoClassMatches = withoutPseudoElements.match(/:[\w-]+/g)
  classes += pseudoClassMatches ? pseudoClassMatches.length : 0

  // Element names: a leading identifier in each compound selector. Drop every
  // other token first so only bare type names are left to count.
  const typeCandidates = withoutPseudoElements
    .replace(/#[\w-]+/g, ' ')
    .replace(/\.[\w-]+/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/:[\w-]+(\([^)]*\))?/g, ' ')
    .replace(/[>+~,()]/g, ' ')
    .split(/\s+/)
    .filter(token => /^[a-z][\w-]*$/i.test(token))

  types += typeCandidates.length

  return ids * 1_000_000 + classes * 1_000 + types
}

/** True for anything that cannot be matched against an element. */
function isUnmatchable(selectorText: string): boolean {
  // `replaceSync` does not descend into at-rule blocks, so a `@media` rule
  // arrives with its selector intact and a body that was never meant to be
  // read as declarations. Such a rule must never apply to an element.
  return selectorText.length === 0 || selectorText.startsWith('@')
}

/**
 * Highest specificity among the selectors in a rule's selector list that match
 * the element, or -1 when none do.
 */
function matchSpecificity(element: ElementLike, selectorText: string): number {
  let best = -1

  for (const part of selectorText.split(',')) {
    const selector = part.trim()
    if (!selector)
      continue

    let matches = false
    try {
      matches = element.matches(selector)
    }
    catch {
      // An unsupported or malformed selector simply does not match, the same
      // way a browser drops a rule it cannot parse.
      matches = false
    }

    if (matches)
      best = Math.max(best, specificity(selector))
  }

  return best
}

function record(into: Map<string, Declaration>, property: string, candidate: Declaration): void {
  const current = into.get(property)

  // Later wins on a tie, which is what document order means for equal
  // specificity.
  if (!current || candidate.specificity >= current.specificity)
    into.set(property, candidate)
}

/**
 * Collect the declarations from `sheets` that apply to `element`, keeping only
 * the winner per property.
 *
 * `sheets` must already be in cascade order — document order for `<style>`
 * elements, with adopted stylesheets after them.
 */
export function collectCascade(element: ElementLike, sheets: readonly StyleSheetLike[]): Cascade {
  const cascade: Cascade = { normal: new Map(), important: new Map() }
  let order = 0

  for (const sheet of sheets) {
    const rules = sheet?.cssRules
    if (!rules)
      continue

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i] as StyleRuleLike
      const selectorText = rule?.selectorText?.trim()
      if (!selectorText || isUnmatchable(selectorText) || !rule.style)
        continue

      order++

      const spec = matchSpecificity(element, selectorText)
      if (spec < 0)
        continue

      for (const property of rule.style) {
        const value = rule.style.getPropertyValue(property)
        if (!value)
          continue

        const target = rule.style.getPropertyPriority(property) === 'important'
          ? cascade.important
          : cascade.normal

        record(target, property, { value, specificity: spec, order })
      }
    }
  }

  return cascade
}

/**
 * Resolve one property for an element.
 *
 * Author-origin order, weakest first: sheet-normal, inline-normal,
 * sheet-important, inline-important. Returns null when nothing declares the
 * property, so the caller can fall back to its defaults.
 */
export function resolveProperty(
  property: string,
  inlineStyle: StyleDeclarationLike,
  cascade: Cascade,
): string | null {
  const inlineValue = inlineStyle.getPropertyValue(property)
  const inlineIsImportant = inlineValue !== '' && inlineStyle.getPropertyPriority(property) === 'important'

  if (inlineIsImportant)
    return inlineValue

  const important = cascade.important.get(property)
  if (important)
    return important.value

  if (inlineValue)
    return inlineValue

  const normal = cascade.normal.get(property)
  if (normal)
    return normal.value

  return null
}
