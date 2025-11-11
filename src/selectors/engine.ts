import type { VirtualElement } from '../nodes/VirtualElement'
import type { VirtualNode } from '../nodes/VirtualNode'

/**
 * Finds the first element matching the CSS selector starting from the given root node.
 *
 * @param root - The root node to search from (inclusive)
 * @param selector - CSS selector string (supports tags, classes, IDs, attributes, pseudo-classes, and combinators)
 * @returns The first matching VirtualElement, or null if no match is found
 * @throws {Error} If selector syntax is invalid
 *
 * @example
 * ```typescript
 * const element = querySelectorEngine(document, 'div.container > p#intro')
 * ```
 */
export function querySelectorEngine(root: VirtualNode, selector: string): VirtualElement | null {
  if (!selector || typeof selector !== 'string') {
    return null
  }

  if (!selector.trim()) {
    return null
  }

  const results = querySelectorAllEngine(root, selector)
  return results.length > 0 ? results[0] : null
}

/**
 * Finds all elements matching the CSS selector starting from the given root node.
 * Traverses the DOM tree depth-first and returns matching elements in document order.
 *
 * @param root - The root node to search from (inclusive)
 * @param selector - CSS selector string supporting:
 *   - Tag selectors: `div`, `span`
 *   - Class selectors: `.class-name`
 *   - ID selectors: `#element-id`
 *   - Attribute selectors: `[attr]`, `[attr="value"]`, `[attr^="value"]`, `[attr$="value"]`, `[attr*="value"]`, `[attr~="word"]`
 *   - Pseudo-classes: `:first-child`, `:last-child`, `:first-of-type`, `:last-of-type`, `:only-child`, `:only-of-type`, `:nth-child()`, `:nth-last-child()`, `:nth-of-type()`, `:nth-last-of-type()`, `:not()`, `:disabled`, `:enabled`, `:checked`, `:empty`
 *   - Combinators: ` ` (descendant), `>` (child), `+` (adjacent sibling), `~` (general sibling)
 * @returns Array of all matching VirtualElements in document order
 * @throws {Error} If selector syntax is invalid
 *
 * @example
 * ```typescript
 * const buttons = querySelectorAllEngine(document, 'button[type="submit"]:not(:disabled)')
 * ```
 */
export function querySelectorAllEngine(root: VirtualNode, selector: string): VirtualElement[] {
  if (!selector || typeof selector !== 'string') {
    return []
  }

  if (!selector.trim()) {
    return []
  }

  // Handle comma-separated selectors
  if (selector.includes(',')) {
    const selectors = selector.split(',').map(s => s.trim()).filter(Boolean)
    const allResults: VirtualElement[] = []
    const seen = new Set<VirtualElement>()

    for (const individualSelector of selectors) {
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

  // Check if we have combinators in the selector
  if (hasCombinators(selector)) {
    // Handle complex selectors with combinators
    function traverse(node: VirtualNode) {
      if (node.nodeType === 'element' && matchesComplexSelector(node as VirtualElement, selector, root)) {
        results.push(node as VirtualElement)
      }
      for (const child of node.children) {
        traverse(child)
      }
    }
    // Start from children, not root (querySelectorAll should only return descendants)
    for (const child of root.children) {
      traverse(child)
    }
  }
  else {
    // Simple selector - no combinators
    function traverse(node: VirtualNode) {
      if (node.nodeType === 'element' && matchesSimpleSelector(node as VirtualElement, selector)) {
        results.push(node as VirtualElement)
      }
      for (const child of node.children) {
        traverse(child)
      }
    }
    // Start from children, not root (querySelectorAll should only return descendants)
    for (const child of root.children) {
      traverse(child)
    }
  }

  return results
}

/**
 * Checks if a CSS selector contains any combinators (>, +, ~, or space).
 * This helps optimize selector matching by using simpler logic for simple selectors.
 *
 * @param selector - CSS selector string to analyze
 * @returns True if the selector contains any combinator characters
 * @internal
 */
export function hasCombinators(selector: string): boolean {
  // Remove content within brackets and pseudo-classes to avoid false positives
  const cleaned = selector
    .replace(/\[[^\]]*\]/g, '') // Remove attribute selectors
    .replace(/:not\([^)]*\)/g, '') // Remove :not() pseudo-class
    .replace(/:nth-child\([^)]*\)/g, '') // Remove :nth-child()

  return /[>+~\s]/.test(cleaned)
}

/**
 * Tests if an element matches a complex selector containing combinators.
 * Uses right-to-left matching (starting from the element itself) for efficiency.
 *
 * @param element - The element to test
 * @param selector - Complex CSS selector with combinators
 * @param root - Root node to limit ancestor traversal
 * @returns True if the element matches the complex selector
 * @internal
 */
export function matchesComplexSelector(element: VirtualElement, selector: string, root: VirtualNode): boolean {
  const parts = parseComplexSelector(selector)

  // Start from the rightmost part (the element itself)
  let currentElement: VirtualElement | null = element
  let skipCheck = false

  // Process parts from right to left
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]

    // Check if current element matches this part's selector (unless we already verified it)
    if (!skipCheck && !matchesSimpleSelector(currentElement, part.selector)) {
      return false
    }
    skipCheck = false

    // If this is the last part (leftmost), we're done
    if (i === 0) {
      return true
    }

    // Get the previous part (to the left) to determine how to navigate
    // The combinator in the previous part describes the relationship TO the current part
    const previousPart = parts[i - 1]

    // Apply the combinator to find the next element to check
    switch (previousPart.combinator) {
      case '>': {
        // Child combinator - current element must be direct parent of what we just matched
        currentElement = currentElement.parentNode as VirtualElement | null
        if (!currentElement || currentElement.nodeType !== 'element') {
          return false
        }
        break
      }

      case '+': {
        // Adjacent sibling - current element must be immediately before what we just matched
        currentElement = currentElement.previousElementSibling
        if (!currentElement) {
          return false
        }
        break
      }

      case '~': {
        // General sibling - find any previous sibling that matches the previous part
        let found = false
        let sibling: VirtualElement | null = currentElement.previousElementSibling

        while (sibling) {
          if (matchesSimpleSelector(sibling, previousPart.selector)) {
            currentElement = sibling
            found = true
            break
          }
          sibling = sibling.previousElementSibling
        }

        if (!found) {
          return false
        }
        // Found and verified match, skip checking in next iteration
        // Don't manually decrement i - let the for loop handle it
        skipCheck = true
        break
      }

      case ' ': {
        // Descendant combinator - find any ancestor that matches the previous part
        let found = false
        let ancestor = currentElement.parentNode as VirtualElement | null

        while (ancestor && ancestor.nodeType !== 'document') {
          // Stop if we've reached the root
          if (ancestor === root) {
            if (root.nodeType === 'element' && matchesSimpleSelector(root as VirtualElement, previousPart.selector)) {
              currentElement = root as VirtualElement
              found = true
            }
            break
          }

          if (ancestor.nodeType === 'element' && matchesSimpleSelector(ancestor, previousPart.selector)) {
            currentElement = ancestor
            found = true
            break
          }

          ancestor = ancestor.parentNode as VirtualElement | null
        }

        if (!found) {
          return false
        }

        // Found and verified match, skip checking in next iteration
        // Don't manually decrement i - let the for loop handle it
        skipCheck = true
        break
      }
    }
  }

  return true
}

/**
 * Parses a complex CSS selector into individual selector parts and their combinators.
 * Handles nested pseudo-classes and attribute selectors correctly.
 *
 * @param selector - Complex CSS selector to parse
 * @returns Array of selector parts with their following combinators
 * @internal
 *
 * @example
 * ```typescript
 * parseComplexSelector('div > p.intro')
 * // Returns: [{ selector: 'div', combinator: '>' }, { selector: 'p.intro', combinator: null }]
 * ```
 */
export function parseComplexSelector(selector: string): Array<{ selector: string, combinator: string | null }> {
  const parts: Array<{ selector: string, combinator: string | null }> = []
  let currentSelector = ''
  let inBrackets = false
  let inPseudo = false
  let pseudoDepth = 0

  // Helper to find next non-space character
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
      // Direct combinator character
      if (currentSelector.trim()) {
        parts.push({ selector: currentSelector.trim(), combinator: char })
        currentSelector = ''
      }
      // Skip whitespace after combinator
      while (selector[i + 1] === ' ') {
        i++
      }
    }
    else if (!inBrackets && !inPseudo && char === ' ') {
      // Space - check if next non-space is a combinator
      const nextNonSpace = peekNextNonSpace(i + 1)
      if (nextNonSpace && (nextNonSpace === '>' || nextNonSpace === '+' || nextNonSpace === '~')) {
        // Skip this space, the combinator will be handled next
        continue
      }
      else if (currentSelector && nextChar && nextChar !== ' ') {
        // This space is a descendant combinator
        if (currentSelector.trim()) {
          parts.push({ selector: currentSelector.trim(), combinator: ' ' })
          currentSelector = ''
        }
      }
      else if (currentSelector) {
        // Space within or after selector
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

/**
 * Tests if an element matches a simple selector (without combinators).
 * Supports tag names, IDs, classes, attributes, and pseudo-classes.
 *
 * @param element - The element to test
 * @param selector - Simple CSS selector (no combinators)
 * @returns True if the element matches all parts of the selector
 *
 * @example
 * ```typescript
 * matchesSimpleSelector(element, 'button.primary[disabled]')
 * ```
 */
export function matchesSimpleSelector(element: VirtualElement, selector: string): boolean {
  // Handle universal selector
  if (selector === '*') {
    return true
  }

  // Remove pseudo-class content before parsing other parts to avoid matching inside pseudo-classes
  const selectorWithoutPseudo = selector.replace(/:([a-z-]+)\([^)]*\)/gi, ':$1')

  // Remove attribute selectors before parsing classes/ids to avoid false matches inside brackets
  const selectorWithoutAttr = selectorWithoutPseudo.replace(/\[[^\]]+\]/g, '')

  // Parse selector parts (tag, id, classes, attributes, pseudo-classes)
  const tagMatch = selectorWithoutAttr.match(/^([a-z0-9-]+)/i)
  const idMatch = selectorWithoutAttr.match(/#([\w-]+)/)
  const classMatches = selectorWithoutAttr.match(/\.([\w-]+)/g)
  const attrMatches = selectorWithoutPseudo.match(/\[([^\]]+)\]/g)
  const pseudoMatches = selector.match(/:([a-z-]+)(\([^)]*\))?/gi)

  // Check tag name
  if (tagMatch && tagMatch[1].toLowerCase() !== element.tagName.toLowerCase()) {
    return false
  }

  // Check ID
  if (idMatch && element.getAttribute('id') !== idMatch[1]) {
    return false
  }

  // Check classes
  if (classMatches) {
    const elementClasses = element.getAttribute('class')?.split(/\s+/).filter(Boolean) || []
    for (const classMatch of classMatches) {
      const className = classMatch.slice(1) // Remove the dot
      if (!elementClasses.includes(className)) {
        return false
      }
    }
  }

  // Check attributes
  if (attrMatches) {
    for (const attrMatch of attrMatches) {
      const attrContent = attrMatch.slice(1, -1) // Remove [ and ]
      if (!matchesAttributeSelector(element, attrContent)) {
        return false
      }
    }
  }

  // Check pseudo-classes
  if (pseudoMatches) {
    for (const pseudoMatch of pseudoMatches) {
      if (!matchesPseudoClass(element, pseudoMatch)) {
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
 * - `:disabled` - Elements with disabled attribute
 * - `:enabled` - Elements without disabled attribute
 * - `:checked` - Elements with checked attribute
 * - `:empty` - Elements with no children
 *
 * @param element - The element to test
 * @param pseudo - Pseudo-class selector (e.g., ':first-child', ':nth-child(2n+1)')
 * @returns True if the element matches the pseudo-class
 */
export function matchesPseudoClass(element: VirtualElement, pseudo: string): boolean {
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
      const siblings = element.parentNode?.children.filter(child => child.nodeType === 'element') || []
      return siblings[0] === element
    }

    case 'last-child':
    {
      // Only consider element children (not text nodes)
      const siblings = element.parentNode?.children.filter(child => child.nodeType === 'element') || []
      return siblings[siblings.length - 1] === element
    }

    case 'nth-child':
    {
      if (!pseudoArg)
        return false
      const siblings = element.parentNode?.children.filter(child => child.nodeType === 'element') || []
      const index = siblings.indexOf(element)
      if (index === -1)
        return false

      const position = index + 1 // 1-indexed

      if (pseudoArg === 'odd')
        return position % 2 === 1
      if (pseudoArg === 'even')
        return position % 2 === 0

      const n = Number.parseInt(pseudoArg, 10)
      if (!Number.isNaN(n))
        return position === n

      return false
    }

    case 'not':
    {
      if (!pseudoArg)
        return false
        // Recursively check if element does NOT match the selector inside :not()
      return !matchesSimpleSelector(element, pseudoArg)
    }

    case 'disabled':
      return element.hasAttribute('disabled')

    case 'enabled':
      return !element.hasAttribute('disabled')

    case 'checked':
      return element.hasAttribute('checked')

    case 'empty':
      // :empty matches elements with no children (elements or text nodes)
      return element.childNodes.length === 0 || (element.childNodes.length === 1 && element.childNodes[0].nodeType === 'text' && (element.childNodes[0].nodeValue?.trim() === '' || element.childNodes[0].nodeValue === null))

    case 'first-of-type':
    {
      if (!element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(
        child => child.nodeType === 'element' && (child as VirtualElement).tagName === element.tagName,
      )
      return siblings[0] === element
    }

    case 'last-of-type':
    {
      if (!element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(
        child => child.nodeType === 'element' && (child as VirtualElement).tagName === element.tagName,
      )
      return siblings[siblings.length - 1] === element
    }

    case 'only-child':
    {
      if (!element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(child => child.nodeType === 'element')
      return siblings.length === 1 && siblings[0] === element
    }

    case 'only-of-type':
    {
      if (!element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(
        child => child.nodeType === 'element' && (child as VirtualElement).tagName === element.tagName,
      )
      return siblings.length === 1 && siblings[0] === element
    }

    case 'nth-of-type':
    {
      if (!pseudoArg || !element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(
        child => child.nodeType === 'element' && (child as VirtualElement).tagName === element.tagName,
      )
      const index = siblings.indexOf(element)
      if (index === -1)
        return false

      const position = index + 1 // 1-indexed

      if (pseudoArg === 'odd')
        return position % 2 === 1
      if (pseudoArg === 'even')
        return position % 2 === 0

      // Handle An+B notation (e.g., 2n+1, 3n, -n+6)
      const anPlusBMatch = pseudoArg.match(/^(-?\d*)n([+-]\d+)?$/)
      if (anPlusBMatch) {
        const a = anPlusBMatch[1] === '' ? 1 : anPlusBMatch[1] === '-' ? -1 : Number.parseInt(anPlusBMatch[1], 10)
        const b = anPlusBMatch[2] ? Number.parseInt(anPlusBMatch[2], 10) : 0

        // Position must satisfy: position = a*n + b for some non-negative integer n
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

    case 'nth-last-child':
    {
      if (!pseudoArg || !element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(child => child.nodeType === 'element')
      const index = siblings.indexOf(element)
      if (index === -1)
        return false

      const position = siblings.length - index // Position from the end (1-indexed)

      if (pseudoArg === 'odd')
        return position % 2 === 1
      if (pseudoArg === 'even')
        return position % 2 === 0

      const n = Number.parseInt(pseudoArg, 10)
      if (!Number.isNaN(n))
        return position === n

      return false
    }

    case 'nth-last-of-type':
    {
      if (!pseudoArg || !element.parentNode)
        return false
      const siblings = element.parentNode.children.filter(
        child => child.nodeType === 'element' && (child as VirtualElement).tagName === element.tagName,
      )
      const index = siblings.indexOf(element)
      if (index === -1)
        return false

      const position = siblings.length - index // Position from the end (1-indexed)

      if (pseudoArg === 'odd')
        return position % 2 === 1
      if (pseudoArg === 'even')
        return position % 2 === 0

      const n = Number.parseInt(pseudoArg, 10)
      if (!Number.isNaN(n))
        return position === n

      return false
    }

    default:
      throw new Error(`Unsupported pseudo-class: ":${pseudoName}". Supported pseudo-classes are: :first-child, :last-child, :first-of-type, :last-of-type, :only-child, :only-of-type, :nth-child(), :nth-last-child(), :nth-of-type(), :nth-last-of-type(), :not(), :disabled, :enabled, :checked, :empty`)
  }
}

/**
 * Tests if an element matches an attribute selector.
 *
 * Supported attribute selectors:
 * - `[attr]` - Has attribute
 * - `[attr="value"]` - Exact match
 * - `[attr^="value"]` - Starts with
 * - `[attr$="value"]` - Ends with
 * - `[attr*="value"]` - Contains substring
 * - `[attr~="word"]` - Contains word (space-separated)
 *
 * @param element - The element to test
 * @param attrSelector - Attribute selector content (without the brackets)
 * @returns True if the element's attribute matches the selector
 *
 * @example
 * ```typescript
 * matchesAttributeSelector(element, 'href^="https"')  // Tests [href^="https"]
 * ```
 */
export function matchesAttributeSelector(element: VirtualElement, attrSelector: string): boolean {
  // [attr] - has attribute
  if (!attrSelector.includes('=')) {
    return element.hasAttribute(attrSelector)
  }

  // [attr="value"] - exact match
  const exactMatch = attrSelector.match(/^([a-z0-9-]+)="([^"]*)"$/i)
  if (exactMatch) {
    return element.getAttribute(exactMatch[1]) === exactMatch[2]
  }

  // [attr^="value"] - starts with
  const startsWithMatch = attrSelector.match(/^([a-z0-9-]+)\^="([^"]*)"$/i)
  if (startsWithMatch) {
    const value = element.getAttribute(startsWithMatch[1])
    return value !== null && value.startsWith(startsWithMatch[2])
  }

  // [attr$="value"] - ends with
  const endsWithMatch = attrSelector.match(/^([a-z0-9-]+)\$="([^"]*)"$/i)
  if (endsWithMatch) {
    const value = element.getAttribute(endsWithMatch[1])
    return value !== null && value.endsWith(endsWithMatch[2])
  }

  // [attr*="value"] - contains
  const containsMatch = attrSelector.match(/^([a-z0-9-]+)\*="([^"]*)"$/i)
  if (containsMatch) {
    const value = element.getAttribute(containsMatch[1])
    return value !== null && value.includes(containsMatch[2])
  }

  // [attr~="value"] - contains word
  const wordMatch = attrSelector.match(/^([a-z0-9-]+)~="([^"]*)"$/i)
  if (wordMatch) {
    const value = element.getAttribute(wordMatch[1])
    if (value === null)
      return false
    const words = value.split(/\s+/)
    return words.includes(wordMatch[2])
  }

  return false
}
