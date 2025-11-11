import type { VirtualElement } from '../nodes/VirtualElement'
import type { VirtualNode } from '../nodes/VirtualNode'
import { XPathResult, XPathResultType } from './XPathResult'

/**
 * Simple XPath evaluator implementation
 * Supports basic XPath expressions
 */
export class XPathEvaluator {
  /**
   * Evaluates an XPath expression
   */
  evaluate(
    expression: string,
    contextNode: VirtualNode,
    _resolver: any = null,
    type: XPathResultType = XPathResultType.ANY_TYPE,
    _result: XPathResult | null = null,
  ): XPathResult {
    const nodes = this._evaluateExpression(expression, contextNode)

    // Determine result type if ANY_TYPE
    let actualType = type
    if (type === XPathResultType.ANY_TYPE) {
      actualType = XPathResultType.ORDERED_NODE_SNAPSHOT_TYPE
    }

    return new XPathResult(actualType, nodes)
  }

  /**
   * Internal method to evaluate XPath expression
   */
  private _evaluateExpression(expression: string, contextNode: VirtualNode): VirtualNode[] {
    const trimmed = expression.trim()

    // Handle simple expressions
    if (trimmed === '.') {
      return [contextNode]
    }

    if (trimmed === '..') {
      return contextNode.parentNode ? [contextNode.parentNode] : []
    }

    // Handle descendant-or-self axis (//)
    if (trimmed.startsWith('//')) {
      const rest = trimmed.substring(2)
      return this._findDescendants(contextNode, rest)
    }

    // Handle child axis (/)
    if (trimmed.startsWith('/')) {
      const rest = trimmed.substring(1)
      return this._findChildren(contextNode, rest)
    }

    // Handle attribute access (@attr)
    if (trimmed.startsWith('@')) {
      const attrName = trimmed.substring(1)
      if (contextNode.nodeType === 'element') {
        const value = (contextNode as VirtualElement).getAttribute(attrName)
        if (value !== null) {
          // Return text node with attribute value
          return [{ nodeType: 'text', nodeValue: value, nodeName: '#text' } as any]
        }
      }
      return []
    }

    // Handle simple element name
    return this._findDescendants(contextNode, trimmed)
  }

  /**
   * Find child nodes matching expression
   */
  private _findChildren(node: VirtualNode, expression: string): VirtualNode[] {
    const results: VirtualNode[] = []

    // Parse expression parts (e.g., "div/span" -> ["div", "span"])
    const parts = expression.split('/').filter(p => p.trim())

    if (parts.length === 0)
      return results

    const [first, ...rest] = parts

    for (const child of node.children || []) {
      if (this._matchesExpression(child, first)) {
        if (rest.length === 0) {
          results.push(child)
        }
        else {
          results.push(...this._findChildren(child, rest.join('/')))
        }
      }
    }

    return results
  }

  /**
   * Find descendant nodes matching expression
   */
  private _findDescendants(node: VirtualNode, expression: string): VirtualNode[] {
    const results: VirtualNode[] = []

    // Parse expression parts
    const parts = expression.split('/').filter(p => p.trim())

    if (parts.length === 0)
      return results

    const [first, ...rest] = parts

    const traverse = (current: VirtualNode) => {
      if (this._matchesExpression(current, first)) {
        if (rest.length === 0) {
          results.push(current)
        }
        else {
          results.push(...this._findChildren(current, rest.join('/')))
        }
      }

      for (const child of current.children || []) {
        traverse(child)
      }
    }

    traverse(node)
    return results
  }

  /**
   * Check if node matches expression part
   */
  private _matchesExpression(node: VirtualNode, expression: string): boolean {
    // Handle wildcard
    if (expression === '*') {
      return node.nodeType === 'element'
    }

    // Handle text() function
    if (expression === 'text()') {
      return node.nodeType === 'text'
    }

    // Handle node() function
    if (expression === 'node()') {
      return true
    }

    // Handle element with predicate (e.g., "div[@class='foo']")
    const predicateMatch = expression.match(/^(\w+)\[(.+)\]$/)
    if (predicateMatch) {
      const [, tagName, predicate] = predicateMatch
      if (node.nodeType !== 'element')
        return false
      const element = node as VirtualElement

      if (tagName !== '*' && element.tagName !== tagName.toUpperCase()) {
        return false
      }

      return this._evaluatePredicate(element, predicate)
    }

    // Handle simple tag name
    if (node.nodeType === 'element') {
      const element = node as VirtualElement
      return element.tagName === expression.toUpperCase()
    }

    return false
  }

  /**
   * Evaluate predicate expression
   */
  private _evaluatePredicate(element: VirtualElement, predicate: string): boolean {
    // Handle @attr='value' or @attr="value"
    const attrMatch = predicate.match(/^@(\w+)=['"](.+)['"]$/)
    if (attrMatch) {
      const [, attrName, attrValue] = attrMatch
      return element.getAttribute(attrName) === attrValue
    }

    // Handle @attr (attribute exists)
    if (predicate.startsWith('@')) {
      const attrName = predicate.substring(1)
      return element.getAttribute(attrName) !== null
    }

    // Handle numeric index (1-based)
    const indexMatch = predicate.match(/^(\d+)$/)
    if (indexMatch) {
      const index = Number.parseInt(indexMatch[1])
      const parent = element.parentNode
      if (parent) {
        const siblings = parent.children.filter(c => c.nodeType === 'element')
        return siblings.indexOf(element) === index - 1
      }
    }

    return false
  }

  /**
   * Parse tag name from expression part
   */
  private _parseTagName(expression: string): string {
    const match = expression.match(/^(\w+)/)
    return match ? match[1] : expression
  }
}
