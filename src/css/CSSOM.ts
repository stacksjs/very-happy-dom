/**
 * CSS Object Model (CSSOM) implementation
 *
 * Provides lightweight but functional CSS classes that happy-dom/jsdom expose.
 * Classes store data, support basic operations, and pass instanceof checks.
 */

import { expandShorthand } from './shorthand'

// ---------------------------------------------------------------------------
// CSSStyleDeclaration (standalone, not the Proxy-based one on elements)
// ---------------------------------------------------------------------------

export class CSSStyleDeclaration {
  private _properties: Map<string, { value: string, priority: string }> = new Map()
  /**
   * Longhands written by a shorthand rather than by the author. They answer
   * reads but stay out of `cssText`, `item()` and `length`, so expanding a
   * shorthand does not change how a declaration serializes.
   */
  private _derived: Set<string> = new Set()

  /** The author's own declarations, in the order they were set. */
  private _declared(): Array<[string, { value: string, priority: string }]> {
    return Array.from(this._properties.entries()).filter(([prop]) => !this._derived.has(prop))
  }

  get length(): number {
    return this._properties.size - this._derived.size
  }

  getPropertyValue(property: string): string {
    return this._properties.get(property)?.value ?? ''
  }

  setProperty(property: string, value: string, priority?: string): void {
    this._properties.set(property, { value, priority: priority ?? '' })
    this._derived.delete(property)

    // A longhand set on its own replaces whatever a shorthand put there; one
    // set by a shorthand is recorded as derived so it stays out of the
    // serialized text.
    for (const [longhand, longhandValue] of expandShorthand(property, value) ?? []) {
      this._properties.set(longhand, { value: longhandValue, priority: priority ?? '' })
      this._derived.add(longhand)
    }
  }

  removeProperty(property: string): string {
    const old = this.getPropertyValue(property)
    this._properties.delete(property)
    this._derived.delete(property)

    for (const [longhand] of expandShorthand(property, old) ?? []) {
      if (this._derived.has(longhand)) {
        this._properties.delete(longhand)
        this._derived.delete(longhand)
      }
    }

    return old
  }

  getPropertyPriority(property: string): string {
    return this._properties.get(property)?.priority ?? ''
  }

  get cssText(): string {
    return this._declared()
      .map(([prop, { value, priority }]) => `${prop}: ${value}${priority ? ' !important' : ''}`)
      .join('; ')
  }

  set cssText(text: string) {
    this._properties.clear()
    this._derived.clear()
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
    return this._declared()[index]?.[0] ?? ''
  }

  /**
   * Apply one parsed declaration, letting an `!important` value already in
   * place stand.
   *
   * Within a block importance beats order, so `margin: 10px !important;
   * margin-top: 5px` keeps a 10px top margin. `setProperty()` cannot do this —
   * a direct call is expected to overwrite, the way a browser's does — so the
   * rule lives on the path the CSS parsers use.
   *
   * The test is per property rather than per declaration, because a normal
   * shorthand still sets the sides that are not individually important:
   * `margin-top: 5px !important; margin: 10px` leaves the top at 5px and moves
   * the other three to 10px.
   */
  _applyParsed(property: string, value: string, priority: string): void {
    this._applyOne(property, value, priority, false)

    const expanded = expandShorthand(property, value)
    if (!expanded)
      return

    for (let i = 0; i < expanded.length; i++)
      this._applyOne(expanded[i][0], expanded[i][1], priority, true)
  }

  private _applyOne(name: string, value: string, priority: string, derived: boolean): void {
    if (!priority && this._properties.get(name)?.priority === 'important')
      return

    this._properties.set(name, { value, priority })
    if (derived)
      this._derived.add(name)
    else
      this._derived.delete(name)
  }

  /**
   * Every property that can be read off this declaration, derived longhands
   * included.
   *
   * The cascade needs these — a longhand is the only form `resolveProperty()`
   * looks up — but iteration is a public API that reports what the author
   * wrote, so the two views are kept apart rather than overloading one.
   */
  _allProperties(): IterableIterator<string> {
    // The map's own iterator, not a copy: the cascade reads this once per
    // matching rule, so a copy here is a per-rule allocation.
    return this._properties.keys()
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this._declared().map(([prop]) => prop)[Symbol.iterator]()
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
  protected _cssText: string = ''
  parentRule: CSSRule | null = null
  parentStyleSheet: CSSStyleSheet | null = null

  constructor(type: number) {
    this.type = type
  }

  get cssText(): string {
    return this._cssText
  }

  set cssText(text: string) {
    this._cssText = text
  }
}

// ---------------------------------------------------------------------------
// CSSGroupingRule
// ---------------------------------------------------------------------------

/**
 * Read a declaration block into a style rule's `style`.
 *
 * `!important` is kept out of the value and recorded as the priority, so the
 * cascade can rank it rather than comparing it as part of a string.
 */
function readDeclarations(body: string, target: CSSStyleRule): void {
  for (const declaration of body.split(';')) {
    const colon = declaration.indexOf(':')
    if (colon === -1)
      continue

    const property = declaration.slice(0, colon).trim()
    const raw = declaration.slice(colon + 1).trim()
    if (!property || !raw)
      continue

    const important = /!\s*important$/i.test(raw)
    const value = important ? raw.replace(/\s*!\s*important$/i, '').trim() : raw
    if (value)
      target.style._applyParsed(property, value, important ? 'important' : '')
  }
}

/**
 * Parse a stylesheet's text into rules.
 *
 * `@media` becomes a real `CSSMediaRule` holding its own nested rules. It used to
 * become a `CSSStyleRule` whose `selectorText` was the whole `@media (...)` line
 * and whose `style` held the block body read as declarations — so `.a { color`
 * was a property name (#1611). The cascade had to skip anything starting with
 * `@` to avoid applying that nonsense to elements, which is why no `@media` rule
 * ever took effect.
 *
 * Other at-rules are still flattened the old way. They are skipped by the cascade
 * and nothing reads them yet, so giving each its own class would be motion
 * without a caller.
 */
function parseRuleList(text: string, sheet: CSSStyleSheet | null): CSSRule[] {
  const parsed: CSSRule[] = []

  for (const raw of splitTopLevelRules(text)) {
    const rule = raw.trim()
    if (!rule)
      continue

    const braceIdx = rule.indexOf('{')
    if (braceIdx === -1)
      continue

    const selector = rule.slice(0, braceIdx).trim()
    const body = rule.slice(braceIdx + 1, rule.lastIndexOf('}')).trim()

    const media = /^@media\b(.*)$/is.exec(selector)
    if (media) {
      const mediaRule = new CSSMediaRule()
      const condition = media[1].trim()
      mediaRule.conditionText = condition
      mediaRule.media.mediaText = condition
      mediaRule.parentStyleSheet = sheet
      // The body is a rule list of its own, read by this same function so a
      // nested block cannot be parsed differently from a top-level one.
      const nestedRules = mediaRule.cssRules as CSSRule[]
      for (const nested of parseRuleList(body, sheet)) {
        nested.parentRule = mediaRule
        nestedRules.push(nested)
      }
      parsed.push(mediaRule)
      continue
    }

    const styleRule = new CSSStyleRule()
    styleRule.selectorText = selector
    styleRule.parentStyleSheet = sheet
    readDeclarations(body, styleRule)
    parsed.push(styleRule)
  }

  return parsed
}

/**
 * Parse one rule's text, as `insertRule()` is handed it.
 *
 * It used to store the text on `cssText` and stop there, leaving the rule with
 * no `selectorText` and an empty `style` — so a rule inserted at runtime, which
 * is how CSS-in-JS writes styles, could never match anything in the cascade.
 *
 * `parseRuleList` already knows how to read a rule, including `@media`, so the
 * text goes through it and the first rule it yields is the one asked for.
 */
function parseInsertedRule(rule: string, sheet: CSSStyleSheet | null): CSSRule {
  const parsed = parseRuleList(rule, sheet)[0]
  if (parsed)
    return parsed

  // Nothing parsed — keep the old behaviour so the text is not simply lost.
  const fallback = new CSSStyleRule()
  fallback.cssText = rule
  return fallback
}

export class CSSGroupingRule extends CSSRule {
  readonly cssRules: CSSRule[] = []

  insertRule(rule: string, index: number = 0): number {
    const cssRule = parseInsertedRule(rule, this.parentStyleSheet)
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

  /**
   * The rule as text, serialized from what it actually holds.
   *
   * It used to be whatever string the rule was built from, which `insertRule()`
   * stored without parsing — so the text and the rule's own `selectorText` and
   * `style` could disagree, and for an inserted rule they always did.
   */
  get cssText(): string {
    const declarations = this.style.cssText
    if (!this.selectorText)
      return this._cssText
    return declarations ? `${this.selectorText} { ${declarations} }` : `${this.selectorText} { }`
  }

  set cssText(text: string) {
    this._cssText = text
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
    const cssRule = parseInsertedRule(rule, this)
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
    for (const rule of parseRuleList(text, this))
      rules.push(rule)
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
