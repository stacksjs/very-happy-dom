import type { VirtualElement } from '../nodes/VirtualElement'
import { DOCUMENT_NODE, ELEMENT_NODE, TEXT_NODE, type VirtualNode } from '../nodes/VirtualNode'

interface ParsedSimpleSelector {
  tag: string | null
  id: string | null
  classes: string[] | null
  attrs: string[] | null
  pseudos: string[] | null
}

const SIMPLE_ID_RE = /^#([\w-]+)$/
const SIMPLE_CLASS_RE = /^\.([\w-]+)$/
const SIMPLE_TAG_RE = /^[a-z][a-z0-9-]*$/i

const parsedSelectorCache = new Map<string, ParsedSimpleSelector>()
const combinatorCache = new Map<string, boolean>()

function parseSimpleSelector(selector: string): ParsedSimpleSelector {
  const cached = parsedSelectorCache.get(selector)
  if (cached) return cached

  const selectorWithoutPseudo = selector.replace(/:([a-z-]+)\([^)]*\)/gi, ':$1')
  const selectorWithoutAttr = selectorWithoutPseudo.replace(/\[[^\]]+\]/g, '')

  const tagMatch = selectorWithoutAttr.match(/^([a-z0-9-]+)/i)
  const idMatch = selectorWithoutAttr.match(/#([\w-]+)/)
  const classMatches = selectorWithoutAttr.match(/\.([\w-]+)/g)
  const attrMatches = selectorWithoutPseudo.match(/\[([^\]]+)\]/g)
  const pseudoMatches = selector.match(/::?[a-z-]+(\([^)]*\))?/gi)

  const result: ParsedSimpleSelector = {
    tag: tagMatch ? tagMatch[1].toLowerCase() : null,
    id: idMatch ? idMatch[1] : null,
    classes: classMatches ? classMatches.map(c => c.slice(1)) : null,
    attrs: attrMatches ? attrMatches.map(a => a.slice(1, -1)) : null,
    pseudos: pseudoMatches || null,
  }

  parsedSelectorCache.set(selector, result)
  return result
}

function splitSelectorList(selector: string): string[] {
  if (!selector.includes(',')) return [selector.trim()]

  const parts: string[] = []
  let current = ''
  let bracketDepth = 0
  let parenDepth = 0

  for (let i = 0; i < selector.length; i++) {
    const char = selector[i]
    if (char === '[') {
      bracketDepth++
    }
    else if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1)
    }
    else if (char === '(') {
      parenDepth++
    }
    else if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
    }

    if (char === ',' && bracketDepth === 0 && parenDepth === 0) {
      if (current.trim()) {
        parts.push(current.trim())
      }
      current = ''
      continue
    }

    current += char
  }

  if (current.trim()) {
    parts.push(current.trim())
  }

  return parts
}

function matchesNthPosition(position: number, pseudoArg: string): boolean {
  if (pseudoArg === 'odd')
    return position % 2 === 1
  if (pseudoArg === 'even')
    return position % 2 === 0

  const anPlusBMatch = pseudoArg.match(/^(-?\d*)n([+-]\d+)?$/)
  if (anPlusBMatch) {
    const a = anPlusBMatch[1] === '' ? 1 : anPlusBMatch[1] === '-' ? -1 : Number.parseInt(anPlusBMatch[1], 10)
    const b = anPlusBMatch[2] ? Number.parseInt(anPlusBMatch[2], 10) : 0

    if (a === 0)
      return position === b

    const n = (position - b) / a
    return n >= 0 && Number.isInteger(n)
  }

  const n = Number.parseInt(pseudoArg, 10)
  if (!Number.isNaN(n))
    return position === n

  return false
}

function selectorUsesScope(selector: string): boolean {
  return /(?:^|[^\w-]):scope\b/i.test(selector)
}

function getSearchRoots(root: VirtualNode, selector: string): VirtualNode[] {
  if (selectorUsesScope(selector) && root.nodeType === ELEMENT_NODE) {
    return [root]
  }
  return root.children
}

export function querySelectorEngine(root: VirtualNode, selector: string): VirtualElement | null {
  if (!selector || typeof selector !== 'string') {
    return null
  }

  const trimmed = selector.trim()
  if (!trimmed) {
    return null
  }

  let idFast: RegExpMatchArray | null
  let classFast: RegExpMatchArray | null

  if ((idFast = trimmed.match(SIMPLE_ID_RE))) {
    const targetId = idFast[1]
    const findById = (node: VirtualNode): VirtualElement | null => {
      const cn = node.childNodes
      for (let i = 0; i < cn.length; i++) {
        const child = cn[i]
        if (child.nodeType === ELEMENT_NODE) {
          if (child.attributes.get('id') === targetId) {
            return child as VirtualElement
          }
          const match = findById(child)
          if (match) return match
        }
      }
      return null
    }
    return findById(root)
  }

  if ((classFast = trimmed.match(SIMPLE_CLASS_RE))) {
    const targetClass = classFast[1]
    const findByClass = (node: VirtualNode): VirtualElement | null => {
      const cn = node.childNodes
      for (let i = 0; i < cn.length; i++) {
        const child = cn[i]
        if (child.nodeType === ELEMENT_NODE) {
          const cls = child.attributes.get('class')
          if (cls !== undefined && (cls === targetClass || cls.includes(targetClass))) {
            if (cls === targetClass || (` ${cls} `).includes(` ${targetClass} `)) {
              return child as VirtualElement
            }
          }
          const match = findByClass(child)
          if (match) return match
        }
      }
      return null
    }
    return findByClass(root)
  }

  if (SIMPLE_TAG_RE.test(trimmed)) {
    const targetTag = trimmed.toLowerCase()
    const findByTag = (node: VirtualNode): VirtualElement | null => {
      const cn = node.childNodes
      for (let i = 0; i < cn.length; i++) {
        const child = cn[i]
        if (child.nodeType === ELEMENT_NODE) {
          if ((child as VirtualElement).tagName.toLowerCase() === targetTag) {
            return child as VirtualElement
          }
          const match = findByTag(child)
          if (match) return match
        }
      }
      return null
    }
    return findByTag(root)
  }

  const selectorList = splitSelectorList(selector)
  if (selectorList.length > 1) {
    const results = querySelectorAllEngine(root, selector)
    return results.length > 0 ? results[0] : null
  }

  const useCombinators = hasCombinators(selector)

  const matchFn2 = useCombinators
    ? (el: VirtualElement) => matchesComplexSelector(el, selector, root)
    : (el: VirtualElement) => matchesSimpleSelector(el, selector, root)

  const findFirstElement = (el: VirtualElement): VirtualElement | null => {
    if (matchFn2(el)) return el
    const cn = el.childNodes
    for (let i = 0; i < cn.length; i++) {
      if (cn[i].nodeType === ELEMENT_NODE) {
        const match = findFirstElement(cn[i] as VirtualElement)
        if (match) return match
      }
    }
    return null
  }

  const findFirst = (node: VirtualNode): VirtualElement | null => {
    if (node.nodeType === ELEMENT_NODE) {
      return findFirstElement(node as VirtualElement)
    }
    const cn = node.childNodes
    for (let i = 0; i < cn.length; i++) {
      if (cn[i].nodeType === ELEMENT_NODE) {
        const match = findFirstElement(cn[i] as VirtualElement)
        if (match) return match
      }
    }
    return null
  }

  for (const child of getSearchRoots(root, selector)) {
    const match = findFirst(child)
    if (match) {
      return match
    }
  }

  return null
}

export function querySelectorAllEngine(root: VirtualNode, selector: string): VirtualElement[] {
  if (!selector || typeof selector !== 'string') {
    return []
  }

  const trimmed = selector.trim()
  if (!trimmed) {
    return []
  }

  let idFast: RegExpMatchArray | null
  let classFast: RegExpMatchArray | null

  if ((idFast = trimmed.match(SIMPLE_ID_RE))) {
    const targetId = idFast[1]
    const results: VirtualElement[] = []
    const findById = (node: VirtualNode) => {
      const cn = node.childNodes
      for (let i = 0; i < cn.length; i++) {
        const child = cn[i]
        if (child.nodeType === ELEMENT_NODE) {
          if (child.attributes.get('id') === targetId) {
            results.push(child as VirtualElement)
          }
          findById(child)
        }
      }
    }
    findById(root)
    return results
  }

  if ((classFast = trimmed.match(SIMPLE_CLASS_RE))) {
    const targetClass = classFast[1]
    const results: VirtualElement[] = []
    const findByClass = (node: VirtualNode) => {
      const cn = node.childNodes
      for (let i = 0; i < cn.length; i++) {
        const child = cn[i]
        if (child.nodeType === ELEMENT_NODE) {
          const cls = child.attributes.get('class')
          if (cls !== undefined && (cls === targetClass || (` ${cls} `).includes(` ${targetClass} `))) {
            results.push(child as VirtualElement)
          }
          findByClass(child)
        }
      }
    }
    findByClass(root)
    return results
  }

  if (SIMPLE_TAG_RE.test(trimmed)) {
    const targetTag = trimmed.toLowerCase()
    const results: VirtualElement[] = []
    const findByTag = (node: VirtualNode) => {
      const cn = node.childNodes
      for (let i = 0; i < cn.length; i++) {
        const child = cn[i]
        if (child.nodeType === ELEMENT_NODE) {
          if ((child as VirtualElement).tagName.toLowerCase() === targetTag) {
            results.push(child as VirtualElement)
          }
          findByTag(child)
        }
      }
    }
    findByTag(root)
    return results
  }

  const selectorList = splitSelectorList(selector)
  if (selectorList.length > 1) {
    const allResults: VirtualElement[] = []
    const seen = new Set<VirtualElement>()

    for (const individualSelector of selectorList) {
      const selectorResults = querySelectorAllEngine(root, individualSelector)
      for (const element of selectorResults) {
        if (!seen.has(element)) {
          seen.add(element)
          allResults.push(element)
        }
      }
    }

    return allResults
  }

  const results: VirtualElement[] = []
  const useCombinators = hasCombinators(selector)
  const matchFn = useCombinators
    ? (el: VirtualElement) => matchesComplexSelector(el, selector, root)
    : (el: VirtualElement) => matchesSimpleSelector(el, selector, root)

  function traverseElement(el: VirtualElement) {
    if (matchFn(el)) {
      results.push(el)
    }
    const cn = el.childNodes
    for (let i = 0; i < cn.length; i++) {
      if (cn[i].nodeType === ELEMENT_NODE) {
        traverseElement(cn[i] as VirtualElement)
      }
    }
  }

  for (const child of getSearchRoots(root, selector)) {
    if (child.nodeType === ELEMENT_NODE) {
      traverseElement(child as VirtualElement)
    }
  }

  return results
}

export function hasCombinators(selector: string): boolean {
  const cached = combinatorCache.get(selector)
  if (cached !== undefined) return cached

  const cleaned = selector
    .replace(/\[[^\]]*\]/g, '')
    .replace(/:[a-z-]+\([^)]*\)/gi, '')

  const result = /[>+~\s]/.test(cleaned)
  combinatorCache.set(selector, result)
  return result
}

export function matchesComplexSelector(element: VirtualElement, selector: string, root: VirtualNode): boolean {
  const parts = parseComplexSelector(selector)

  let currentElement: VirtualElement | null = element
  let skipCheck = false

  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]

    if (!skipCheck && !matchesSimpleSelector(currentElement, part.selector, root)) {
      return false
    }
    skipCheck = false

    if (i === 0) {
      return true
    }

    const previousPart = parts[i - 1]

    switch (previousPart.combinator) {
      case '>': {
        currentElement = currentElement.parentNode as VirtualElement | null
        if (!currentElement || currentElement.nodeType !== ELEMENT_NODE) {
          return false
        }
        break
      }

      case '+': {
        currentElement = currentElement.previousElementSibling
        if (!currentElement) {
          return false
        }
        break
      }

      case '~': {
        let found = false
        let sibling: VirtualElement | null = currentElement.previousElementSibling

        while (sibling) {
          if (matchesSimpleSelector(sibling, previousPart.selector, root)) {
            currentElement = sibling
            found = true
            break
          }
          sibling = sibling.previousElementSibling
        }

        if (!found) {
          return false
        }
        skipCheck = true
        break
      }

      case ' ': {
        let found = false
        let ancestor = currentElement.parentNode as VirtualElement | null

        while (ancestor && ancestor.nodeType !== DOCUMENT_NODE) {
          if (ancestor === root) {
            if (root.nodeType === ELEMENT_NODE && matchesSimpleSelector(root as VirtualElement, previousPart.selector, root)) {
              currentElement = root as VirtualElement
              found = true
            }
            break
          }

          if (ancestor.nodeType === ELEMENT_NODE && matchesSimpleSelector(ancestor, previousPart.selector, root)) {
            currentElement = ancestor
            found = true
            break
          }

          ancestor = ancestor.parentNode as VirtualElement | null
        }

        if (!found) {
          return false
        }

        skipCheck = true
        break
      }
    }
  }

  return true
}

export function parseComplexSelector(selector: string): Array<{ selector: string, combinator: string | null }> {
  const parts: Array<{ selector: string, combinator: string | null }> = []
  let currentSelector = ''
  let inBrackets = false
  let inPseudo = false
  let pseudoDepth = 0

  function peekNextNonSpace(startIndex: number): string | null {
    for (let j = startIndex; j < selector.length; j++) {
      if (selector[j] !== ' ') {
        return selector[j]
      }
    }
    return null
  }

  for (let i = 0; i < selector.length; i++) {
    const char = selector[i]
    const nextChar = selector[i + 1]

    if (char === '[') {
      inBrackets = true
      currentSelector += char
    }
    else if (char === ']') {
      inBrackets = false
      currentSelector += char
    }
    else if (char === '(' && currentSelector.endsWith(':not(')) {
      inPseudo = true
      pseudoDepth = 1
      currentSelector += char
    }
    else if (char === '(' && /:\w+\($/.test(currentSelector)) {
      inPseudo = true
      pseudoDepth = 1
      currentSelector += char
    }
    else if (inPseudo && char === '(') {
      pseudoDepth++
      currentSelector += char
    }
    else if (inPseudo && char === ')') {
      pseudoDepth--
      if (pseudoDepth === 0) {
        inPseudo = false
      }
      currentSelector += char
    }
    else if (!inBrackets && !inPseudo && (char === '>' || char === '+' || char === '~')) {
      if (currentSelector.trim()) {
        parts.push({ selector: currentSelector.trim(), combinator: char })
        currentSelector = ''
      }
      while (selector[i + 1] === ' ') {
        i++
      }
    }
    else if (!inBrackets && !inPseudo && char === ' ') {
      const nextNonSpace = peekNextNonSpace(i + 1)
      if (nextNonSpace && (nextNonSpace === '>' || nextNonSpace === '+' || nextNonSpace === '~')) {
        continue
      }
      else if (currentSelector && nextChar && nextChar !== ' ') {
        if (currentSelector.trim()) {
          parts.push({ selector: currentSelector.trim(), combinator: ' ' })
          currentSelector = ''
        }
      }
      else if (currentSelector) {
        currentSelector += char
      }
    }
    else if (char !== ' ' || currentSelector) {
      currentSelector += char
    }
  }

  if (currentSelector.trim()) {
    parts.push({ selector: currentSelector.trim(), combinator: null })
  }

  return parts
}

export function matchesSimpleSelector(element: VirtualElement, selector: string, scopeRoot?: VirtualNode): boolean {
  if (selector === '*') {
    return true
  }

  const parsed = parseSimpleSelector(selector)

  if (parsed.tag && parsed.tag !== element.tagName.toLowerCase()) {
    return false
  }

  if (parsed.id && element.attributes.get('id') !== parsed.id) {
    return false
  }

  if (parsed.classes) {
    const classAttr = element.attributes.get('class')
    if (!classAttr) return false
    for (const className of parsed.classes) {
      if (classAttr !== className && !(` ${classAttr} `).includes(` ${className} `)) {
        return false
      }
    }
  }

  if (parsed.attrs) {
    for (const attrContent of parsed.attrs) {
      if (!matchesAttributeSelector(element, attrContent)) {
        return false
      }
    }
  }

  if (parsed.pseudos) {
    for (const pseudoMatch of parsed.pseudos) {
      if (!matchesPseudoClass(element, pseudoMatch, scopeRoot)) {
        return false
      }
    }
  }

  return true
}

/**
 * Tests if an element matches a pseudo-class selector.
 *
 * Supported pseudo-classes:
 * - `:first-child` - First element child of parent
 * - `:last-child` - Last element child of parent
 * - `:first-of-type` - First element of its type among siblings
 * - `:last-of-type` - Last element of its type among siblings
 * - `:only-child` - Only element child of parent
 * - `:only-of-type` - Only element of its type among siblings
 * - `:nth-child(n)` - Nth element child (supports 'odd', 'even', numbers, and An+B notation like '2n+1')
 * - `:nth-last-child(n)` - Nth element child from the end
 * - `:nth-of-type(n)` - Nth element of its type (supports An+B notation)
 * - `:nth-last-of-type(n)` - Nth element of its type from the end
 * - `:not(selector)` - Elements that don't match the selector
 * - `:is(selector)` - Elements that match the selector
 * - `:where(selector)` - Elements that match the selector
 * - `:scope` - Elements that are the scope root
 * - `:disabled` - Elements with disabled attribute
 * - `:enabled` - Elements without disabled attribute
 * - `:checked` - Elements with checked attribute
 * - `:empty` - Elements with no children
 *
 * @param element - The element to test
 * @param pseudo - Pseudo-class selector (e.g., ':first-child', ':nth-child(2n+1)')
 * @param scopeRoot - Optional scope root for :scope pseudo-class
 * @returns True if the element matches the pseudo-class
 */
export function matchesPseudoClass(element: VirtualElement, pseudo: string, scopeRoot?: VirtualNode): boolean {
  // Ignore pseudo-elements (::before, ::after, etc.) — they cannot match DOM elements
  if (pseudo.startsWith('::')) {
    return true
  }

  const pseudoMatch = pseudo.match(/:([a-z-]+)(\(([^)]*)\))?/i)
  if (!pseudoMatch) {
    throw new Error(`Invalid pseudo-class selector: "${pseudo}"`)
  }

  const pseudoName = pseudoMatch[1]
  const pseudoArg = pseudoMatch[3]

  switch (pseudoName) {
    case 'first-child':
    {
      // Only consider element children (not text nodes)
      const siblings = element.parentNode?.children.filter(child => child.nodeType === ELEMENT_NODE) || []
      return siblings[0] === element
    }

    case 'last-child':
    {
      // Only consider element children (not text nodes)
      const siblings = element.parentNode?.children.filter(child => child.nodeType === ELEMENT_NODE) || []
      return siblings[siblings.length - 1] === element
    }

    case 'nth-child':
    {
      if (!pseudoArg)
        return false
      const siblings = element.parentNode?.children.filter(child => child.nodeType === ELEMENT_NODE) || []
      const index = siblings.indexOf(element)
      if (index === -1)
        return false

      return matchesNthPosition(index + 1, pseudoArg)
    }

    case 'not':
    {
      if (!pseudoArg)
        return false
        // Recursively check if element does NOT match the selector inside :not()
      return !splitSelectorList(pseudoArg).some(part => matchesSimpleSelector(element, part, scopeRoot))
    }

    case 'is':
    case 'where':
    {
      if (!pseudoArg)
        return false
      return splitSelectorList(pseudoArg).some(part => matchesSimpleSelector(element, part, scopeRoot))
    }

    case 'root':
    {
      // :root matches the document element (the <html> element)
      const doc = element.ownerDocument
      return doc ? doc.documentElement === element : false
    }

    case 'has':
    {
      if (!pseudoArg)
        return false
      // :has() checks if the element has descendants matching the selector
      const selectors = splitSelectorList(pseudoArg)
      return selectors.some((sel) => {
        // Check for relative selectors (starting with > + ~)
        const trimmedSel = sel.trim()
        if (trimmedSel.startsWith('>') || trimmedSel.startsWith('+') || trimmedSel.startsWith('~')) {
          // For relative selectors, the scope is the element itself
          const fullSel = `:scope ${trimmedSel}`
          const results = querySelectorAllEngine(element, fullSel)
          return results.length > 0
        }
        // For regular selectors, search descendants
        const results = querySelectorAllEngine(element, trimmedSel)
        return results.length > 0
      })
    }

    case 'scope':
      return scopeRoot === element

    case 'disabled':
      return element.hasAttribute('disabled')

    case 'enabled':
      return !element.hasAttribute('disabled')

    case 'checked':
      return element.hasAttribute('checked')

    case 'empty':
      // :empty matches elements with no children (elements or text nodes)
      return element.childNodes.length === 0 || (element.childNodes.length === 1 && element.childNodes[0].nodeType === TEXT_NODE && (element.childNodes[0].nodeValue?.trim() === '' || element.childNodes[0].nodeValue === null))

    case 'required':
      return element.hasAttribute('required')

    case 'optional':
    {
      const tag = element.tagName
      if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return false
      return !element.hasAttribute('required')
    }

    case 'valid':
      return typeof (element as any).validity === 'object' ? (element as any).validity.valid : true

    case 'invalid':
      return typeof (element as any).validity === 'object' ? !(element as any).validity.valid : false

    case 'placeholder-shown':
    {
      const tag = element.tagName
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') return false
      if (!element.hasAttribute('placeholder')) return false
      const val = (element as any).value
      return val === '' || val === undefined || val === null
    }

    case 'read-only':
    {
      const tag = element.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        return element.hasAttribute('readonly') || element.hasAttribute('disabled')
      }
      return (element as any).contentEditable !== 'true'
    }

    case 'read-write':
    {
      const tag = element.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        return !element.hasAttribute('readonly') && !element.hasAttribute('disabled')
      }
      return (element as any).contentEditable === 'true'
    }

    case 'any-link':
      return (element.tagName === 'A' || element.tagName === 'AREA') && element.hasAttribute('href')

    case 'link':
      return (element.tagName === 'A' || element.tagName === 'AREA') && element.hasAttribute('href')

    case 'visited':
      // In virtual DOM, no links are ever visited
      return false

    case 'target':
    case 'hover':
    case 'active':
    case 'focus':
    case 'focus-within':
    case 'focus-visible':
      return false

    case 'first-of-type':
    {
      if (!element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(
        child => child.nodeType === ELEMENT_NODE && (child as VirtualElement).tagName === element.tagName,
      )
      return siblings[0] === element
    }

    case 'last-of-type':
    {
      if (!element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(
        child => child.nodeType === ELEMENT_NODE && (child as VirtualElement).tagName === element.tagName,
      )
      return siblings[siblings.length - 1] === element
    }

    case 'only-child':
    {
      if (!element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(child => child.nodeType === ELEMENT_NODE)
      return siblings.length === 1 && siblings[0] === element
    }

    case 'only-of-type':
    {
      if (!element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(
        child => child.nodeType === ELEMENT_NODE && (child as VirtualElement).tagName === element.tagName,
      )
      return siblings.length === 1 && siblings[0] === element
    }

    case 'nth-of-type':
    {
      if (!pseudoArg || !element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(
        child => child.nodeType === ELEMENT_NODE && (child as VirtualElement).tagName === element.tagName,
      )
      const index = siblings.indexOf(element)
      if (index === -1)
        return false

      return matchesNthPosition(index + 1, pseudoArg)
    }

    case 'nth-last-child':
    {
      if (!pseudoArg || !element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(child => child.nodeType === ELEMENT_NODE)
      const index = siblings.indexOf(element)
      if (index === -1)
        return false

      return matchesNthPosition(siblings.length - index, pseudoArg)
    }

    case 'nth-last-of-type':
    {
      if (!pseudoArg || !element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(
        child => child.nodeType === ELEMENT_NODE && (child as VirtualElement).tagName === element.tagName,
      )
      const index = siblings.indexOf(element)
      if (index === -1)
        return false

      return matchesNthPosition(siblings.length - index, pseudoArg)
    }

    default:
      throw new Error(`Unsupported pseudo-class: ":${pseudoName}". Supported pseudo-classes are: :root, :first-child, :last-child, :first-of-type, :last-of-type, :only-child, :only-of-type, :nth-child(), :nth-last-child(), :nth-of-type(), :nth-last-of-type(), :not(), :is(), :where(), :has(), :scope, :disabled, :enabled, :checked, :empty, :required, :optional, :valid, :invalid, :placeholder-shown, :read-only, :read-write, :any-link, :link, :visited, :target, :hover, :active, :focus, :focus-within, :focus-visible`)
  }
}

const attrOperatorPatterns = new Map<string, RegExp>()

function getAttrOperatorRegex(operator: string): RegExp {
  let re = attrOperatorPatterns.get(operator)
  if (re) return re
  const escapedOperator = operator.replace(/([\^$*~|])/g, '\\$1')
  re = new RegExp(`^([a-z0-9:-]+)${escapedOperator}(["'])(.*?)\\2(?:\\s+[is])?$`, 'i')
  attrOperatorPatterns.set(operator, re)
  return re
}

function parseAttributeMatch(selector: string, operator: string): [string, string, string | null] | null {
  const re = getAttrOperatorRegex(operator)
  const match = selector.match(re)
  if (!match) {
    return null
  }
  const flagMatch = selector.match(/\s+([is])$/i)
  return [match[1], match[3], flagMatch ? flagMatch[1].toLowerCase() : null]
}

function normalizeAttributeValue(value: string, flag: string | null): string {
  return flag === 'i' ? value.toLowerCase() : value
}

export function matchesAttributeSelector(element: VirtualElement, attrSelector: string): boolean {
  if (!attrSelector.includes('=')) {
    return element.hasAttribute(attrSelector)
  }

  const exactMatch = parseAttributeMatch(attrSelector, '=')
  if (exactMatch) {
    const value = element.getAttribute(exactMatch[0])
    return value !== null && normalizeAttributeValue(value, exactMatch[2]) === normalizeAttributeValue(exactMatch[1], exactMatch[2])
  }

  // [attr^="value"] - starts with
  const startsWithMatch = parseAttributeMatch(attrSelector, '^=')
  if (startsWithMatch) {
    const value = element.getAttribute(startsWithMatch[0])
    return value !== null && normalizeAttributeValue(value, startsWithMatch[2]).startsWith(normalizeAttributeValue(startsWithMatch[1], startsWithMatch[2]))
  }

  // [attr$="value"] - ends with
  const endsWithMatch = parseAttributeMatch(attrSelector, '$=')
  if (endsWithMatch) {
    const value = element.getAttribute(endsWithMatch[0])
    return value !== null && normalizeAttributeValue(value, endsWithMatch[2]).endsWith(normalizeAttributeValue(endsWithMatch[1], endsWithMatch[2]))
  }

  // [attr*="value"] - contains
  const containsMatch = parseAttributeMatch(attrSelector, '*=')
  if (containsMatch) {
    const value = element.getAttribute(containsMatch[0])
    return value !== null && normalizeAttributeValue(value, containsMatch[2]).includes(normalizeAttributeValue(containsMatch[1], containsMatch[2]))
  }

  // [attr~="value"] - contains word
  const wordMatch = parseAttributeMatch(attrSelector, '~=')
  if (wordMatch) {
    const value = element.getAttribute(wordMatch[0])
    if (value === null)
      return false
    const words = normalizeAttributeValue(value, wordMatch[2]).split(/\s+/)
    return words.includes(normalizeAttributeValue(wordMatch[1], wordMatch[2]))
  }

  const dashMatch = parseAttributeMatch(attrSelector, '|=')
  if (dashMatch) {
    const value = element.getAttribute(dashMatch[0])
    if (value === null) {
      return false
    }
    const normalizedValue = normalizeAttributeValue(value, dashMatch[2])
    const normalizedExpected = normalizeAttributeValue(dashMatch[1], dashMatch[2])
    return normalizedValue === normalizedExpected || normalizedValue.startsWith(`${normalizedExpected}-`)
  }

  return false
}
