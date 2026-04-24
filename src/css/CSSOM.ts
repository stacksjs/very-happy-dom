/**
 * CSS Object Model (CSSOM) implementation
 *
 * Provides lightweight but functional CSS classes that happy-dom/jsdom expose.
 * Classes store data, support basic operations, and pass instanceof checks.
 */

// ---------------------------------------------------------------------------
// CSSStyleDeclaration (standalone, not the Proxy-based one on elements)
// ---------------------------------------------------------------------------

export class CSSStyleDeclaration {
  private _properties: Map<string, { value: string, priority: string }> = new Map()

  get length(): number {
    return this._properties.size
  }

  getPropertyValue(property: string): string {
    return this._properties.get(property)?.value ?? ''
  }

  setProperty(property: string, value: string, priority?: string): void {
    this._properties.set(property, { value, priority: priority ?? '' })
  }

  removeProperty(property: string): string {
    const old = this.getPropertyValue(property)
    this._properties.delete(property)
    return old
  }

  getPropertyPriority(property: string): string {
    return this._properties.get(property)?.priority ?? ''
  }

  get cssText(): string {
    return Array.from(this._properties.entries())
      .map(([prop, { value, priority }]) => `${prop}: ${value}${priority ? ' !important' : ''}`)
      .join('; ')
  }

  set cssText(text: string) {
    this._properties.clear()
    for (const decl of text.split(';')) {
      const [prop, ...rest] = decl.split(':')
      if (prop && rest.length) {
        const value = rest.join(':').trim()
        const important = value.endsWith('!important')
        this.setProperty(
          prop.trim(),
          important ? value.replace(/\s*!important\s*$/, '').trim() : value,
          important ? 'important' : '',
        )
      }
    }
  }

  item(index: number): string {
    return Array.from(this._properties.keys())[index] ?? ''
  }

  [Symbol.iterator](): MapIterator<string> {
    return this._properties.keys()
  }
}

// ---------------------------------------------------------------------------
// MediaList
// ---------------------------------------------------------------------------

export class MediaList {
  private _media: string[] = []

  get mediaText(): string {
    return this._media.join(', ')
  }

  set mediaText(value: string) {
    this._media = value ? value.split(',').map(s => s.trim()) : []
  }

  get length(): number {
    return this._media.length
  }

  item(index: number): string | null {
    return this._media[index] ?? null
  }

  appendMedium(medium: string): void {
    if (!this._media.includes(medium))
      this._media.push(medium)
  }

  deleteMedium(medium: string): void {
    this._media = this._media.filter(m => m !== medium)
  }

  toString(): string {
    return this.mediaText
  }
}

// ---------------------------------------------------------------------------
// CSSRule (base)
// ---------------------------------------------------------------------------

export class CSSRule {
  static readonly STYLE_RULE = 1
  static readonly CHARSET_RULE = 2
  static readonly IMPORT_RULE = 3
  static readonly MEDIA_RULE = 4
  static readonly FONT_FACE_RULE = 5
  static readonly PAGE_RULE = 6
  static readonly KEYFRAMES_RULE = 7
  static readonly KEYFRAME_RULE = 8
  static readonly NAMESPACE_RULE = 10
  static readonly COUNTER_STYLE_RULE = 11
  static readonly SUPPORTS_RULE = 12
  static readonly FONT_FEATURE_VALUES_RULE = 14
  static readonly CONTAINER_RULE = 17

  readonly type: number
  cssText: string = ''
  parentRule: CSSRule | null = null
  parentStyleSheet: CSSStyleSheet | null = null

  constructor(type: number) {
    this.type = type
  }
}

// ---------------------------------------------------------------------------
// CSSGroupingRule
// ---------------------------------------------------------------------------

export class CSSGroupingRule extends CSSRule {
  readonly cssRules: CSSRule[] = []

  insertRule(rule: string, index: number = 0): number {
    const cssRule = new CSSStyleRule()
    cssRule.cssText = rule
    cssRule.parentRule = this
    cssRule.parentStyleSheet = this.parentStyleSheet
    this.cssRules.splice(index, 0, cssRule)
    return index
  }

  deleteRule(index: number): void {
    this.cssRules.splice(index, 1)
  }
}

// ---------------------------------------------------------------------------
// CSSConditionRule
// ---------------------------------------------------------------------------

export class CSSConditionRule extends CSSGroupingRule {
  conditionText: string = ''
}

// ---------------------------------------------------------------------------
// CSSStyleRule
// ---------------------------------------------------------------------------

export class CSSStyleRule extends CSSRule {
  selectorText: string = ''
  readonly style: CSSStyleDeclaration = new CSSStyleDeclaration()

  constructor() {
    super(CSSRule.STYLE_RULE)
  }
}

// ---------------------------------------------------------------------------
// CSSMediaRule
// ---------------------------------------------------------------------------

export class CSSMediaRule extends CSSConditionRule {
  readonly media: MediaList = new MediaList()
  // cssRules inherited from CSSGroupingRule

  constructor() {
    super(CSSRule.MEDIA_RULE)
  }
}

// ---------------------------------------------------------------------------
// CSSKeyframeRule
// ---------------------------------------------------------------------------

export class CSSKeyframeRule extends CSSRule {
  keyText: string = ''
  readonly style: CSSStyleDeclaration = new CSSStyleDeclaration()

  constructor() {
    super(CSSRule.KEYFRAME_RULE)
  }
}

// ---------------------------------------------------------------------------
// CSSKeyframesRule
// ---------------------------------------------------------------------------

export class CSSKeyframesRule extends CSSRule {
  name: string = ''
  readonly cssRules: CSSRule[] = []

  constructor() {
    super(CSSRule.KEYFRAMES_RULE)
  }

  appendRule(rule: string): void {
    const keyframeRule = new CSSKeyframeRule()
    keyframeRule.cssText = rule
    keyframeRule.parentRule = this
    keyframeRule.parentStyleSheet = this.parentStyleSheet
    this.cssRules.push(keyframeRule)
  }

  deleteRule(select: string): void {
    const index = this.cssRules.findIndex(r => (r as CSSKeyframeRule).keyText === select)
    if (index !== -1) {
      this.cssRules.splice(index, 1)
    }
  }

  findRule(select: string): CSSKeyframeRule | null {
    return (this.cssRules.find(r => (r as CSSKeyframeRule).keyText === select) as CSSKeyframeRule) ?? null
  }
}

// ---------------------------------------------------------------------------
// CSSFontFaceRule
// ---------------------------------------------------------------------------

export class CSSFontFaceRule extends CSSRule {
  readonly style: CSSStyleDeclaration = new CSSStyleDeclaration()

  constructor() {
    super(CSSRule.FONT_FACE_RULE)
  }
}

// ---------------------------------------------------------------------------
// CSSSupportsRule
// ---------------------------------------------------------------------------

export class CSSSupportsRule extends CSSConditionRule {
  // conditionText inherited from CSSConditionRule
  // cssRules inherited from CSSGroupingRule
  // insertRule / deleteRule inherited from CSSGroupingRule

  constructor() {
    super(CSSRule.SUPPORTS_RULE)
  }
}

// ---------------------------------------------------------------------------
// CSSContainerRule
// ---------------------------------------------------------------------------

export class CSSContainerRule extends CSSConditionRule {
  // conditionText inherited from CSSConditionRule
  // cssRules inherited from CSSGroupingRule
  containerName: string = ''
  containerQuery: string = ''

  constructor() {
    super(CSSRule.CONTAINER_RULE)
  }
}

// ---------------------------------------------------------------------------
// CSSScopeRule
// ---------------------------------------------------------------------------

export class CSSScopeRule extends CSSGroupingRule {
  start: string = ''
  end: string = ''

  constructor() {
    super(CSSRule.STYLE_RULE) // No dedicated type constant for scope rules yet
  }
}

// ---------------------------------------------------------------------------
// CSSStyleSheet
// ---------------------------------------------------------------------------

export class CSSStyleSheet {
  readonly cssRules: CSSRule[] = []
  disabled: boolean = false
  href: string | null = null
  media: MediaList = new MediaList()
  ownerNode: any = null
  ownerRule: CSSRule | null = null
  parentStyleSheet: CSSStyleSheet | null = null
  title: string | null = null
  readonly type: string = 'text/css'

  insertRule(rule: string, index: number = 0): number {
    const cssRule = new CSSStyleRule()
    cssRule.cssText = rule
    cssRule.parentStyleSheet = this
    this.cssRules.splice(index, 0, cssRule)
    return index
  }

  deleteRule(index: number): void {
    this.cssRules.splice(index, 1)
  }

  replace(text: string): Promise<CSSStyleSheet> {
    this.replaceSync(text)
    return Promise.resolve(this)
  }

  replaceSync(text: string): void {
    const rules = this.cssRules as CSSRule[]
    rules.length = 0
    for (const raw of splitTopLevelRules(text)) {
      const rule = raw.trim()
      if (!rule)
        continue
      const braceIdx = rule.indexOf('{')
      if (braceIdx === -1)
        continue
      const selector = rule.slice(0, braceIdx).trim()
      const body = rule.slice(braceIdx + 1, rule.lastIndexOf('}')).trim()
      const styleRule = new CSSStyleRule()
      styleRule.selectorText = selector
      styleRule.parentStyleSheet = this
      for (const decl of body.split(';')) {
        const colon = decl.indexOf(':')
        if (colon === -1) continue
        const prop = decl.slice(0, colon).trim()
        const value = decl.slice(colon + 1).trim()
        if (prop && value)
          styleRule.style.setProperty(prop, value)
      }
      rules.push(styleRule)
    }
  }
}

function splitTopLevelRules(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        out.push(text.slice(start, i + 1))
        start = i + 1
      }
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// CSS namespace object
// ---------------------------------------------------------------------------

const CSS_IDENT_RE = /^[\w-]+$/
const CSS_FUNCTION_RE = /^\w+\(.+\)$/

export const CSS = {
  escape(value: string): string {
    return value.replace(/([^\w-])/g, '\\$1')
  },
  /**
   * Best-effort CSS.supports(). Without a real CSS parser we stay permissive:
   * accept any non-empty input, recognize "not (...)" for the 1-arg condition
   * form, and reject clearly malformed declarations in the 2-arg form.
   */
  supports(property: string, value?: string): boolean {
    if (value === undefined) {
      const condition = property.trim()
      if (!condition)
        return false
      if (condition.startsWith('not ')) {
        const inner = condition.slice(4).trim().replace(/^\(|\)$/g, '')
        const colon = inner.indexOf(':')
        if (colon === -1)
          return !true // invalid inner — conservatively: not(invalid) == false
        return !CSS.supports(inner.slice(0, colon).trim(), inner.slice(colon + 1).trim())
      }
      // Bare property name OR `property: value` condition both permitted.
      return true
    }
    if (!property || !value)
      return false
    if (!CSS_IDENT_RE.test(property))
      return false
    const trimmed = value.trim()
    if (!trimmed)
      return false
    if (CSS_IDENT_RE.test(trimmed))
      return true
    if (CSS_FUNCTION_RE.test(trimmed))
      return true
    if (/^-?\d+(?:\.\d+)?(?:[a-z%]+)?$/i.test(trimmed))
      return true
    if (/^#[0-9a-f]{3,8}$/i.test(trimmed))
      return true
    return trimmed.split(/\s+/).every(tok =>
      CSS_IDENT_RE.test(tok)
      || CSS_FUNCTION_RE.test(tok)
      || /^-?\d+(?:\.\d+)?(?:[a-z%]+)?$/i.test(tok)
      || /^#[0-9a-f]{3,8}$/i.test(tok))
  },
}

// ---------------------------------------------------------------------------
// StylePropertyMapReadOnly / StylePropertyMap (stubs)
// ---------------------------------------------------------------------------

export class StylePropertyMapReadOnly {
  get size(): number {
    return 0
  }

  has(_property: string): boolean {
    return false
  }

  get(_property: string): any {
    return undefined
  }

  getAll(_property: string): any[] {
    return []
  }

  forEach(_callback: Function): void {}

  entries(): IterableIterator<[string, any]> {
    return [][Symbol.iterator]() as any
  }

  keys(): IterableIterator<string> {
    return [][Symbol.iterator]() as any
  }

  values(): IterableIterator<any> {
    return [][Symbol.iterator]() as any
  }
}

export class StylePropertyMap extends StylePropertyMapReadOnly {
  set(_property: string, ..._values: any[]): void {}
  append(_property: string, ..._values: any[]): void {}
  delete(_property: string): void {}
  clear(): void {}
}
