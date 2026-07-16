const ownerDocumentKey = Symbol('very-happy-dom.custom-element-owner-document')

/**
 * Instantiates a custom element with the creating document available while its
 * constructor runs. Browsers establish ownerDocument before user constructor
 * code executes; carrying that context through `super()` lets constructors
 * safely create shadow DOM, templates, and specialized HTML elements.
 */
export function constructCustomElement<T>(
  constructor: new (...args: any[]) => T,
  ownerDocument: any,
  ...args: any[]
): T {
  const target = constructor as any
  const hadOwnContext = Object.prototype.hasOwnProperty.call(target, ownerDocumentKey)
  const previousContext = target[ownerDocumentKey]
  target[ownerDocumentKey] = ownerDocument

  try {
    return new constructor(...args)
  }
  finally {
    if (hadOwnContext) target[ownerDocumentKey] = previousContext
    else delete target[ownerDocumentKey]
  }
}

export function getCustomElementOwnerDocument(constructor: Function): any {
  return (constructor as any)[ownerDocumentKey] ?? null
}
