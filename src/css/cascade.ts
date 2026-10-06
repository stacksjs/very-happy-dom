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

import type { MediaContext } from './media'
import { matchesMediaQuery } from './media'

/** The parts of an element this module needs, kept structural to avoid a cycle. */
interface ElementLike {
  matches: (selector: string) => boolean
}

interface StyleDeclarationLike {
  getPropertyValue: (property: string) => string
  getPropertyPriority: (property: string) => string
  [Symbol.iterator]: () => Iterator<string>
  /**
   * Declared properties plus the longhands a shorthand expanded into. Iterating
   * reports only what the author wrote, which is the right answer for a public
   * API and the wrong one here: `margin: 10px` has to reach the cascade as four
   * longhands, because that is the only form `resolveProperty` looks up.
   */
  _allProperties?: () => IterableIterator<string>
}

interface StyleRuleLike {
  selectorText?: string
  style?: StyleDeclarationLike
  /** Present on a `@media` rule, whose nested rules apply when it matches. */
  conditionText?: string
  cssRules?: ArrayLike<unknown>
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

/**
 * True for anything that cannot be matched against an element.
 *
 * `@media` is no longer among them: it arrives as a `CSSMediaRule` with its own
 * nested rules now (#1611), and is handled before this is reached. The other
 * at-rules — `@font-face`, `@keyframes`, `@supports` — are still flattened by
 * the parser into a rule whose body was never meant to be read as declarations,
 * so they must never apply to an element.
 */
function isUnmatchable(selectorText: string): boolean {
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
export function collectCascade(
  element: ElementLike,
  sheets: readonly StyleSheetLike[],
  media?: MediaContext,
): Cascade {
  const cascade: Cascade = { normal: new Map(), important: new Map() }
  let order = 0

  /**
   * Walk a rule list, descending into any `@media` block whose condition holds.
   *
   * Nested rules take their order from the same counter as their neighbours, so
   * a declaration inside a matching `@media` beats an identical one written
   * above it and loses to one written below — which is what document order means
   * and what a browser does.
   */
  const walk = (rules: ArrayLike<unknown>): void => {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i] as StyleRuleLike

      if (rule?.conditionText !== undefined && rule.cssRules) {
        // Without a context nothing can be evaluated, so the block is skipped
        // rather than guessed at — which is the behaviour every caller had
        // before a context existed to pass.
        if (media && matchesMediaQuery(rule.conditionText, media))
          walk(rule.cssRules)
        continue
      }

      const selectorText = rule?.selectorText?.trim()
      if (!selectorText || isUnmatchable(selectorText) || !rule.style)
        continue

      order++

      const spec = matchSpecificity(element, selectorText)
      if (spec < 0)
        continue

      for (const property of rule.style._allProperties?.() ?? rule.style) {
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

  for (const sheet of sheets) {
    if (sheet?.cssRules)
      walk(sheet.cssRules)
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
