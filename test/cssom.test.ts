import { describe, expect, test } from 'bun:test'
import {
  Attr,
  CSS,
  CSSContainerRule,
  CSSFontFaceRule,
  CSSKeyframeRule,
  CSSKeyframesRule,
  CSSMediaRule,
  CSSRule,
  CSSStyleDeclaration,
  CSSStyleRule,
  CSSStyleSheet,
  CSSSupportsRule,
  DOMMatrix,
  DOMMatrixReadOnly,
  DOMPoint,
  DOMPointReadOnly,
  DOMRect,
  DOMRectReadOnly,
  HTMLCollection,
  MediaList,
  MediaQueryList,
  NamedNodeMap,
  NodeList,
  Screen,
  ValidityState,
  VirtualDocument,
  Window,
  XMLSerializer,
} from '../src'

// =============================================================================
// CSSStyleDeclaration
// =============================================================================

describe('CSSStyleDeclaration', () => {
  test('setProperty and getPropertyValue', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('color', 'red')
    expect(style.getPropertyValue('color')).toBe('red')
  })

  test('getPropertyValue returns empty string for unset property', () => {
    const style = new CSSStyleDeclaration()
    expect(style.getPropertyValue('color')).toBe('')
  })

  test('removeProperty returns the old value', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('color', 'blue')
    const old = style.removeProperty('color')
    expect(old).toBe('blue')
    expect(style.getPropertyValue('color')).toBe('')
  })

  test('removeProperty returns empty string for unset property', () => {
    const style = new CSSStyleDeclaration()
    expect(style.removeProperty('color')).toBe('')
  })

  test('getPropertyPriority returns "important" when set', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('color', 'red', 'important')
    expect(style.getPropertyPriority('color')).toBe('important')
  })

  test('getPropertyPriority returns empty string when no priority', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('color', 'red')
    expect(style.getPropertyPriority('color')).toBe('')
  })

  test('cssText getter serializes all properties', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('color', 'red')
    style.setProperty('font-size', '16px')
    expect(style.cssText).toBe('color: red; font-size: 16px')
  })

  test('cssText getter includes !important', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('color', 'red', 'important')
    expect(style.cssText).toBe('color: red !important')
  })

  test('cssText setter parses declarations', () => {
    const style = new CSSStyleDeclaration()
    style.cssText = 'color: red; font-size: 16px'
    expect(style.getPropertyValue('color')).toBe('red')
    expect(style.getPropertyValue('font-size')).toBe('16px')
  })

  test('cssText setter round-trip', () => {
    const style = new CSSStyleDeclaration()
    style.cssText = 'color: red; font-size: 16px'
    expect(style.cssText).toBe('color: red; font-size: 16px')
  })

  test('cssText setter clears existing properties', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('background', 'blue')
    style.cssText = 'color: red'
    expect(style.getPropertyValue('background')).toBe('')
    expect(style.getPropertyValue('color')).toBe('red')
  })

  test('cssText setter handles !important', () => {
    const style = new CSSStyleDeclaration()
    style.cssText = 'color: red !important'
    expect(style.getPropertyValue('color')).toBe('red')
    expect(style.getPropertyPriority('color')).toBe('important')
  })

  test('item() returns property name by index', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('color', 'red')
    style.setProperty('font-size', '16px')
    expect(style.item(0)).toBe('color')
    expect(style.item(1)).toBe('font-size')
  })

  test('item() returns empty string for out-of-range index', () => {
    const style = new CSSStyleDeclaration()
    expect(style.item(0)).toBe('')
    expect(style.item(99)).toBe('')
  })

  test('length reflects the number of properties', () => {
    const style = new CSSStyleDeclaration()
    expect(style.length).toBe(0)
    style.setProperty('color', 'red')
    expect(style.length).toBe(1)
    style.setProperty('font-size', '16px')
    expect(style.length).toBe(2)
    style.removeProperty('color')
    expect(style.length).toBe(1)
  })

  test('Symbol.iterator yields property names', () => {
    const style = new CSSStyleDeclaration()
    style.setProperty('color', 'red')
    style.setProperty('margin', '10px')
    const names = [...style]
    expect(names).toEqual(['color', 'margin'])
  })
})

// =============================================================================
// CSSStyleSheet
// =============================================================================

describe('CSSStyleSheet', () => {
  test('insertRule adds to cssRules', () => {
    const sheet = new CSSStyleSheet()
    sheet.insertRule('body { color: red }')
    expect(sheet.cssRules.length).toBe(1)
    expect(sheet.cssRules[0].cssText).toBe('body { color: red }')
  })

  test('insertRule at default index 0', () => {
    const sheet = new CSSStyleSheet()
    sheet.insertRule('a { color: blue }')
    sheet.insertRule('b { color: green }')
    expect(sheet.cssRules[0].cssText).toBe('b { color: green }')
    expect(sheet.cssRules[1].cssText).toBe('a { color: blue }')
  })

  test('insertRule at specific index', () => {
    const sheet = new CSSStyleSheet()
    sheet.insertRule('a { color: blue }', 0)
    sheet.insertRule('b { color: green }', 1)
    expect(sheet.cssRules[0].cssText).toBe('a { color: blue }')
    expect(sheet.cssRules[1].cssText).toBe('b { color: green }')
  })

  test('deleteRule removes from cssRules', () => {
    const sheet = new CSSStyleSheet()
    sheet.insertRule('a { color: blue }', 0)
    sheet.insertRule('b { color: green }', 1)
    sheet.deleteRule(0)
    expect(sheet.cssRules.length).toBe(1)
    expect(sheet.cssRules[0].cssText).toBe('b { color: green }')
  })

  test('replaceSync clears all rules', () => {
    const sheet = new CSSStyleSheet()
    sheet.insertRule('a { color: blue }', 0)
    sheet.insertRule('b { color: green }', 1)
    sheet.replaceSync('')
    expect(sheet.cssRules.length).toBe(0)
  })

  test('disabled property defaults to false', () => {
    const sheet = new CSSStyleSheet()
    expect(sheet.disabled).toBe(false)
  })

  test('disabled property can be toggled', () => {
    const sheet = new CSSStyleSheet()
    sheet.disabled = true
    expect(sheet.disabled).toBe(true)
  })

  test('parentStyleSheet is set on inserted rules', () => {
    const sheet = new CSSStyleSheet()
    sheet.insertRule('a { color: red }', 0)
    expect(sheet.cssRules[0].parentStyleSheet).toBe(sheet)
  })

  test('type is text/css', () => {
    const sheet = new CSSStyleSheet()
    expect(sheet.type).toBe('text/css')
  })
})

// =============================================================================
// CSSRule types
// =============================================================================

describe('CSSRule type constants', () => {
  test('STYLE_RULE is 1', () => {
    expect(CSSRule.STYLE_RULE).toBe(1)
  })

  test('CHARSET_RULE is 2', () => {
    expect(CSSRule.CHARSET_RULE).toBe(2)
  })

  test('IMPORT_RULE is 3', () => {
    expect(CSSRule.IMPORT_RULE).toBe(3)
  })

  test('MEDIA_RULE is 4', () => {
    expect(CSSRule.MEDIA_RULE).toBe(4)
  })

  test('FONT_FACE_RULE is 5', () => {
    expect(CSSRule.FONT_FACE_RULE).toBe(5)
  })

  test('PAGE_RULE is 6', () => {
    expect(CSSRule.PAGE_RULE).toBe(6)
  })

  test('KEYFRAMES_RULE is 7', () => {
    expect(CSSRule.KEYFRAMES_RULE).toBe(7)
  })

  test('KEYFRAME_RULE is 8', () => {
    expect(CSSRule.KEYFRAME_RULE).toBe(8)
  })

  test('NAMESPACE_RULE is 10', () => {
    expect(CSSRule.NAMESPACE_RULE).toBe(10)
  })

  test('SUPPORTS_RULE is 12', () => {
    expect(CSSRule.SUPPORTS_RULE).toBe(12)
  })

  test('CONTAINER_RULE is 17', () => {
    expect(CSSRule.CONTAINER_RULE).toBe(17)
  })
})

describe('CSSStyleRule', () => {
  test('has selectorText property', () => {
    const rule = new CSSStyleRule()
    rule.selectorText = '.my-class'
    expect(rule.selectorText).toBe('.my-class')
  })

  test('has style property (CSSStyleDeclaration)', () => {
    const rule = new CSSStyleRule()
    rule.style.setProperty('color', 'red')
    expect(rule.style.getPropertyValue('color')).toBe('red')
  })

  test('type is STYLE_RULE', () => {
    const rule = new CSSStyleRule()
    expect(rule.type).toBe(CSSRule.STYLE_RULE)
  })
})

describe('CSSMediaRule', () => {
  test('has media property (MediaList)', () => {
    const rule = new CSSMediaRule()
    rule.media.appendMedium('screen')
    expect(rule.media.mediaText).toBe('screen')
  })

  test('has cssRules array', () => {
    const rule = new CSSMediaRule()
    expect(rule.cssRules).toEqual([])
  })

  test('insertRule adds to nested cssRules', () => {
    const rule = new CSSMediaRule()
    rule.insertRule('body { color: red }', 0)
    expect(rule.cssRules.length).toBe(1)
  })

  test('deleteRule removes from nested cssRules', () => {
    const rule = new CSSMediaRule()
    rule.insertRule('body { color: red }', 0)
    rule.deleteRule(0)
    expect(rule.cssRules.length).toBe(0)
  })

  test('type is MEDIA_RULE', () => {
    const rule = new CSSMediaRule()
    expect(rule.type).toBe(CSSRule.MEDIA_RULE)
  })
})

describe('CSSKeyframesRule', () => {
  test('has name property', () => {
    const rule = new CSSKeyframesRule()
    rule.name = 'fadeIn'
    expect(rule.name).toBe('fadeIn')
  })

  test('appendRule adds a CSSKeyframeRule', () => {
    const rule = new CSSKeyframesRule()
    rule.appendRule('from { opacity: 0 }')
    expect(rule.cssRules.length).toBe(1)
    expect(rule.cssRules[0].cssText).toBe('from { opacity: 0 }')
  })

  test('deleteRule removes by keyText', () => {
    const rule = new CSSKeyframesRule()
    const kf = new CSSKeyframeRule()
    kf.keyText = 'from'
    rule.cssRules.push(kf)
    rule.deleteRule('from')
    expect(rule.cssRules.length).toBe(0)
  })

  test('findRule returns matching keyframe or null', () => {
    const rule = new CSSKeyframesRule()
    const kf = new CSSKeyframeRule()
    kf.keyText = '50%'
    rule.cssRules.push(kf)
    expect(rule.findRule('50%')).toBe(kf)
    expect(rule.findRule('100%')).toBeNull()
  })

  test('type is KEYFRAMES_RULE', () => {
    const rule = new CSSKeyframesRule()
    expect(rule.type).toBe(CSSRule.KEYFRAMES_RULE)
  })
})

describe('CSSKeyframeRule', () => {
  test('has keyText property', () => {
    const rule = new CSSKeyframeRule()
    rule.keyText = '50%'
    expect(rule.keyText).toBe('50%')
  })

  test('has style property', () => {
    const rule = new CSSKeyframeRule()
    rule.style.setProperty('opacity', '0.5')
    expect(rule.style.getPropertyValue('opacity')).toBe('0.5')
  })

  test('type is KEYFRAME_RULE', () => {
    const rule = new CSSKeyframeRule()
    expect(rule.type).toBe(CSSRule.KEYFRAME_RULE)
  })
})

describe('CSSFontFaceRule', () => {
  test('has style property', () => {
    const rule = new CSSFontFaceRule()
    rule.style.setProperty('font-family', 'MyFont')
    expect(rule.style.getPropertyValue('font-family')).toBe('MyFont')
  })

  test('type is FONT_FACE_RULE', () => {
    const rule = new CSSFontFaceRule()
    expect(rule.type).toBe(CSSRule.FONT_FACE_RULE)
  })
})

describe('CSSSupportsRule', () => {
  test('has conditionText property', () => {
    const rule = new CSSSupportsRule()
    rule.conditionText = '(display: grid)'
    expect(rule.conditionText).toBe('(display: grid)')
  })

  test('inherits insertRule from CSSGroupingRule', () => {
    const rule = new CSSSupportsRule()
    rule.insertRule('body { color: red }', 0)
    expect(rule.cssRules.length).toBe(1)
  })

  test('type is SUPPORTS_RULE', () => {
    const rule = new CSSSupportsRule()
    expect(rule.type).toBe(CSSRule.SUPPORTS_RULE)
  })
})

describe('CSSContainerRule', () => {
  test('has containerName property', () => {
    const rule = new CSSContainerRule()
    rule.containerName = 'sidebar'
    expect(rule.containerName).toBe('sidebar')
  })

  test('has containerQuery property', () => {
    const rule = new CSSContainerRule()
    rule.containerQuery = '(min-width: 700px)'
    expect(rule.containerQuery).toBe('(min-width: 700px)')
  })

  test('has conditionText inherited from CSSConditionRule', () => {
    const rule = new CSSContainerRule()
    rule.conditionText = '(min-width: 700px)'
    expect(rule.conditionText).toBe('(min-width: 700px)')
  })

  test('type is CONTAINER_RULE', () => {
    const rule = new CSSContainerRule()
    expect(rule.type).toBe(CSSRule.CONTAINER_RULE)
  })
})

// =============================================================================
// MediaList
// =============================================================================

describe('MediaList', () => {
  test('appendMedium adds a medium', () => {
    const ml = new MediaList()
    ml.appendMedium('screen')
    expect(ml.length).toBe(1)
    expect(ml.item(0)).toBe('screen')
  })

  test('appendMedium does not add duplicates', () => {
    const ml = new MediaList()
    ml.appendMedium('screen')
    ml.appendMedium('screen')
    expect(ml.length).toBe(1)
  })

  test('deleteMedium removes a medium', () => {
    const ml = new MediaList()
    ml.appendMedium('screen')
    ml.appendMedium('print')
    ml.deleteMedium('screen')
    expect(ml.length).toBe(1)
    expect(ml.item(0)).toBe('print')
  })

  test('mediaText getter joins with commas', () => {
    const ml = new MediaList()
    ml.appendMedium('screen')
    ml.appendMedium('print')
    expect(ml.mediaText).toBe('screen, print')
  })

  test('mediaText setter parses comma-separated values', () => {
    const ml = new MediaList()
    ml.mediaText = 'screen, print, all'
    expect(ml.length).toBe(3)
    expect(ml.item(0)).toBe('screen')
    expect(ml.item(1)).toBe('print')
    expect(ml.item(2)).toBe('all')
  })

  test('mediaText setter with empty string clears the list', () => {
    const ml = new MediaList()
    ml.appendMedium('screen')
    ml.mediaText = ''
    expect(ml.length).toBe(0)
  })

  test('item() returns null for out-of-range index', () => {
    const ml = new MediaList()
    expect(ml.item(0)).toBeNull()
  })

  test('toString() returns mediaText', () => {
    const ml = new MediaList()
    ml.appendMedium('screen')
    expect(ml.toString()).toBe('screen')
  })
})

// =============================================================================
// CSS namespace
// =============================================================================

describe('CSS namespace', () => {
  test('CSS.escape escapes special characters', () => {
    expect(CSS.escape('foo.bar')).toBe('foo\\.bar')
    expect(CSS.escape('#id')).toBe('\\#id')
    expect(CSS.escape('a b')).toBe('a\\ b')
  })

  test('CSS.escape leaves alphanumeric and hyphens alone', () => {
    expect(CSS.escape('my-class')).toBe('my-class')
    expect(CSS.escape('abc123')).toBe('abc123')
  })

  test('CSS.supports returns boolean', () => {
    expect(typeof CSS.supports('display', 'flex')).toBe('boolean')
  })

  test('CSS.supports returns true (virtual DOM accepts everything)', () => {
    expect(CSS.supports('display', 'flex')).toBe(true)
    expect(CSS.supports('color')).toBe(true)
  })
})

// =============================================================================
// DOMRect
// =============================================================================

describe('DOMRect', () => {
  test('constructor sets x, y, width, height', () => {
    const rect = new DOMRect(10, 20, 100, 50)
    expect(rect.x).toBe(10)
    expect(rect.y).toBe(20)
    expect(rect.width).toBe(100)
    expect(rect.height).toBe(50)
  })

  test('constructor defaults to zeros', () => {
    const rect = new DOMRect()
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(0)
    expect(rect.width).toBe(0)
    expect(rect.height).toBe(0)
  })

  test('top is computed correctly', () => {
    const rect = new DOMRect(0, 10, 100, 50)
    expect(rect.top).toBe(10)
  })

  test('right is computed correctly', () => {
    const rect = new DOMRect(10, 0, 100, 50)
    expect(rect.right).toBe(110)
  })

  test('bottom is computed correctly', () => {
    const rect = new DOMRect(0, 10, 100, 50)
    expect(rect.bottom).toBe(60)
  })

  test('left is computed correctly', () => {
    const rect = new DOMRect(10, 0, 100, 50)
    expect(rect.left).toBe(10)
  })

  test('negative width: left < x', () => {
    const rect = new DOMRect(100, 0, -50, 10)
    expect(rect.left).toBe(50)
    expect(rect.right).toBe(100)
  })

  test('negative height: top < y', () => {
    const rect = new DOMRect(0, 100, 10, -50)
    expect(rect.top).toBe(50)
    expect(rect.bottom).toBe(100)
  })

  test('toJSON returns all properties', () => {
    const rect = new DOMRect(1, 2, 3, 4)
    const json = rect.toJSON()
    expect(json).toEqual({
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      top: 2,
      right: 4,
      bottom: 6,
      left: 1,
    })
  })

  test('fromRect static method', () => {
    const rect = DOMRect.fromRect({ x: 5, y: 10, width: 20, height: 30 })
    expect(rect.x).toBe(5)
    expect(rect.y).toBe(10)
    expect(rect.width).toBe(20)
    expect(rect.height).toBe(30)
    expect(rect).toBeInstanceOf(DOMRect)
  })

  test('properties are writable', () => {
    const rect = new DOMRect(0, 0, 0, 0)
    rect.x = 42
    rect.y = 43
    rect.width = 100
    rect.height = 200
    expect(rect.x).toBe(42)
    expect(rect.y).toBe(43)
    expect(rect.width).toBe(100)
    expect(rect.height).toBe(200)
  })
})

describe('DOMRectReadOnly', () => {
  test('properties exist and are set by constructor', () => {
    const rect = new DOMRectReadOnly(1, 2, 3, 4)
    expect(rect.x).toBe(1)
    expect(rect.y).toBe(2)
    expect(rect.width).toBe(3)
    expect(rect.height).toBe(4)
  })

  test('computed properties (top, right, bottom, left) exist', () => {
    const rect = new DOMRectReadOnly(10, 20, 30, 40)
    expect(rect.top).toBe(20)
    expect(rect.right).toBe(40)
    expect(rect.bottom).toBe(60)
    expect(rect.left).toBe(10)
  })

  test('fromRect static method returns DOMRectReadOnly', () => {
    const rect = DOMRectReadOnly.fromRect({ x: 1, y: 2 })
    expect(rect).toBeInstanceOf(DOMRectReadOnly)
    expect(rect.x).toBe(1)
    expect(rect.y).toBe(2)
    expect(rect.width).toBe(0)
    expect(rect.height).toBe(0)
  })
})

// =============================================================================
// DOMPoint
// =============================================================================

describe('DOMPoint', () => {
  test('constructor with x, y, z, w', () => {
    const pt = new DOMPoint(1, 2, 3, 4)
    expect(pt.x).toBe(1)
    expect(pt.y).toBe(2)
    expect(pt.z).toBe(3)
    expect(pt.w).toBe(4)
  })

  test('default w is 1', () => {
    const pt = new DOMPoint(0, 0, 0)
    expect(pt.w).toBe(1)
  })

  test('defaults to (0, 0, 0, 1)', () => {
    const pt = new DOMPoint()
    expect(pt.x).toBe(0)
    expect(pt.y).toBe(0)
    expect(pt.z).toBe(0)
    expect(pt.w).toBe(1)
  })

  test('toJSON', () => {
    const pt = new DOMPoint(1, 2, 3, 4)
    expect(pt.toJSON()).toEqual({ x: 1, y: 2, z: 3, w: 4 })
  })

  test('fromPoint static method', () => {
    const pt = DOMPoint.fromPoint({ x: 10, y: 20, z: 30, w: 40 })
    expect(pt).toBeInstanceOf(DOMPoint)
    expect(pt.x).toBe(10)
    expect(pt.y).toBe(20)
    expect(pt.z).toBe(30)
    expect(pt.w).toBe(40)
  })

  test('fromPoint with partial values uses defaults', () => {
    const pt = DOMPoint.fromPoint({ x: 5 })
    expect(pt.x).toBe(5)
    expect(pt.y).toBe(0)
    expect(pt.z).toBe(0)
    expect(pt.w).toBe(1)
  })

  test('properties are writable', () => {
    const pt = new DOMPoint()
    pt.x = 10
    pt.y = 20
    pt.z = 30
    pt.w = 40
    expect(pt.x).toBe(10)
    expect(pt.y).toBe(20)
    expect(pt.z).toBe(30)
    expect(pt.w).toBe(40)
  })
})

describe('DOMPointReadOnly', () => {
  test('properties exist and are set by constructor', () => {
    const pt = new DOMPointReadOnly(1, 2, 3, 4)
    expect(pt.x).toBe(1)
    expect(pt.y).toBe(2)
    expect(pt.z).toBe(3)
    expect(pt.w).toBe(4)
  })

  test('default w is 1', () => {
    const pt = new DOMPointReadOnly()
    expect(pt.w).toBe(1)
  })

  test('fromPoint static method returns DOMPointReadOnly', () => {
    const pt = DOMPointReadOnly.fromPoint({ x: 1, y: 2 })
    expect(pt).toBeInstanceOf(DOMPointReadOnly)
    expect(pt.x).toBe(1)
    expect(pt.w).toBe(1)
  })
})

// =============================================================================
// DOMMatrix
// =============================================================================

describe('DOMMatrix', () => {
  test('default constructor creates identity matrix', () => {
    const m = new DOMMatrix()
    expect(m.a).toBe(1)
    expect(m.b).toBe(0)
    expect(m.c).toBe(0)
    expect(m.d).toBe(1)
    expect(m.e).toBe(0)
    expect(m.f).toBe(0)
  })

  test('constructor with 6-element array sets a-f', () => {
    const m = new DOMMatrix([2, 3, 4, 5, 6, 7])
    expect(m.a).toBe(2)
    expect(m.b).toBe(3)
    expect(m.c).toBe(4)
    expect(m.d).toBe(5)
    expect(m.e).toBe(6)
    expect(m.f).toBe(7)
  })

  test('is2D is true for identity and 6-element init', () => {
    const identity = new DOMMatrix()
    expect(identity.is2D).toBe(true)

    const m6 = new DOMMatrix([1, 0, 0, 1, 0, 0])
    expect(m6.is2D).toBe(true)
  })

  test('is2D is false for 16-element init', () => {
    const m16 = new DOMMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
    expect(m16.is2D).toBe(false)
  })

  test('isIdentity is true for identity matrix', () => {
    const m = new DOMMatrix()
    expect(m.isIdentity).toBe(true)
  })

  test('isIdentity is false for non-identity matrix', () => {
    const m = new DOMMatrix([2, 0, 0, 1, 0, 0])
    expect(m.isIdentity).toBe(false)
  })

  test('toString outputs matrix(...) string', () => {
    const m = new DOMMatrix([1, 2, 3, 4, 5, 6])
    expect(m.toString()).toBe('matrix(1, 2, 3, 4, 5, 6)')
  })

  test('properties are writable', () => {
    const m = new DOMMatrix()
    m.a = 10
    m.e = 50
    expect(m.a).toBe(10)
    expect(m.e).toBe(50)
  })
})

describe('DOMMatrixReadOnly', () => {
  test('default constructor creates identity', () => {
    const m = new DOMMatrixReadOnly()
    expect(m.isIdentity).toBe(true)
    expect(m.a).toBe(1)
    expect(m.d).toBe(1)
  })

  test('toJSON returns a-f properties', () => {
    const m = new DOMMatrixReadOnly([1, 2, 3, 4, 5, 6])
    const json = m.toJSON()
    expect(json).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 })
  })
})

// =============================================================================
// NodeList
// =============================================================================

describe('NodeList', () => {
  test('length property', () => {
    const list = new NodeList(['a', 'b', 'c'])
    expect(list.length).toBe(3)
  })

  test('empty NodeList has length 0', () => {
    const list = new NodeList()
    expect(list.length).toBe(0)
  })

  test('item() returns correct element', () => {
    const list = new NodeList(['x', 'y', 'z'])
    expect(list.item(0)).toBe('x')
    expect(list.item(1)).toBe('y')
    expect(list.item(2)).toBe('z')
  })

  test('item() returns null for out-of-range index', () => {
    const list = new NodeList(['a'])
    expect(list.item(5)).toBeNull()
    expect(list.item(-1)).toBeNull()
  })

  test('forEach iterates over items', () => {
    const items: string[] = []
    const list = new NodeList(['a', 'b', 'c'])
    list.forEach((val) => { items.push(val) })
    expect(items).toEqual(['a', 'b', 'c'])
  })

  test('Symbol.iterator works with for...of', () => {
    const list = new NodeList([10, 20, 30])
    const collected: number[] = []
    for (const item of list) {
      collected.push(item)
    }
    expect(collected).toEqual([10, 20, 30])
  })

  test('indexed access works via [0], [1]', () => {
    const list = new NodeList(['first', 'second'])
    expect(list[0]).toBe('first')
    expect(list[1]).toBe('second')
  })

  test('indexed access returns undefined for missing index', () => {
    const list = new NodeList(['only'])
    expect(list[99]).toBeUndefined()
  })
})

// =============================================================================
// HTMLCollection
// =============================================================================

describe('HTMLCollection', () => {
  test('length and item()', () => {
    const items = [{ id: 'a' }, { id: 'b' }]
    const col = new HTMLCollection(items)
    expect(col.length).toBe(2)
    expect(col.item(0)).toBe(items[0])
    expect(col.item(1)).toBe(items[1])
  })

  test('item() returns null for out-of-range', () => {
    const col = new HTMLCollection([])
    expect(col.item(0)).toBeNull()
  })

  test('namedItem() finds by id', () => {
    const el = { id: 'myId', getAttribute: () => null }
    const col = new HTMLCollection([el])
    expect(col.namedItem('myId')).toBe(el)
  })

  test('namedItem() finds by name attribute', () => {
    const el = { id: '', getAttribute: (attr: string) => attr === 'name' ? 'myName' : null }
    const col = new HTMLCollection([el])
    expect(col.namedItem('myName')).toBe(el)
  })

  test('namedItem() returns null when not found', () => {
    const el = { id: 'a', getAttribute: () => null }
    const col = new HTMLCollection([el])
    expect(col.namedItem('nonexistent')).toBeNull()
  })

  test('Symbol.iterator works with for...of', () => {
    const items = [{ id: 'x' }, { id: 'y' }]
    const col = new HTMLCollection(items)
    const collected: any[] = []
    for (const item of col) {
      collected.push(item)
    }
    expect(collected).toEqual(items)
  })

  test('indexed access via [0]', () => {
    const items = [{ id: 'first' }]
    const col = new HTMLCollection(items)
    expect(col[0]).toBe(items[0])
  })
})

// =============================================================================
// Attr
// =============================================================================

describe('Attr', () => {
  test('name and value', () => {
    const attr = new Attr('class', 'my-class')
    expect(attr.name).toBe('class')
    expect(attr.value).toBe('my-class')
  })

  test('namespaceURI defaults to null', () => {
    const attr = new Attr('id', 'foo')
    expect(attr.namespaceURI).toBeNull()
  })

  test('namespaceURI can be set via constructor', () => {
    const attr = new Attr('xml:lang', 'en', 'http://www.w3.org/XML/1998/namespace')
    expect(attr.namespaceURI).toBe('http://www.w3.org/XML/1998/namespace')
  })

  test('prefix is parsed from qualified name', () => {
    const attr = new Attr('xml:lang', 'en')
    expect(attr.prefix).toBe('xml')
  })

  test('prefix is null for unqualified name', () => {
    const attr = new Attr('class', 'foo')
    expect(attr.prefix).toBeNull()
  })

  test('localName is parsed from qualified name', () => {
    const attr = new Attr('xml:lang', 'en')
    expect(attr.localName).toBe('lang')
  })

  test('localName equals name for unqualified name', () => {
    const attr = new Attr('id', 'bar')
    expect(attr.localName).toBe('id')
  })

  test('specified is always true', () => {
    const attr = new Attr('data-x', '1')
    expect(attr.specified).toBe(true)
  })
})

// =============================================================================
// NamedNodeMap
// =============================================================================

describe('NamedNodeMap', () => {
  test('setNamedItem and getNamedItem', () => {
    const map = new NamedNodeMap()
    const attr = new Attr('id', 'test')
    map.setNamedItem(attr)
    expect(map.getNamedItem('id')).toBe(attr)
  })

  test('setNamedItem replaces existing and returns old', () => {
    const map = new NamedNodeMap()
    const attr1 = new Attr('id', 'old')
    const attr2 = new Attr('id', 'new')
    map.setNamedItem(attr1)
    const old = map.setNamedItem(attr2)
    expect(old).toBe(attr1)
    expect(map.getNamedItem('id')).toBe(attr2)
  })

  test('setNamedItem returns null when no previous', () => {
    const map = new NamedNodeMap()
    const result = map.setNamedItem(new Attr('x', '1'))
    expect(result).toBeNull()
  })

  test('removeNamedItem removes and returns the attr', () => {
    const map = new NamedNodeMap()
    const attr = new Attr('class', 'foo')
    map.setNamedItem(attr)
    const removed = map.removeNamedItem('class')
    expect(removed).toBe(attr)
    expect(map.getNamedItem('class')).toBeNull()
  })

  test('removeNamedItem throws for missing attribute', () => {
    const map = new NamedNodeMap()
    expect(() => map.removeNamedItem('nonexistent')).toThrow('Attr not found: nonexistent')
  })

  test('length reflects number of attributes', () => {
    const map = new NamedNodeMap()
    expect(map.length).toBe(0)
    map.setNamedItem(new Attr('a', '1'))
    expect(map.length).toBe(1)
    map.setNamedItem(new Attr('b', '2'))
    expect(map.length).toBe(2)
    map.removeNamedItem('a')
    expect(map.length).toBe(1)
  })

  test('item() returns attr by index', () => {
    const map = new NamedNodeMap()
    const attr = new Attr('data-x', '42')
    map.setNamedItem(attr)
    expect(map.item(0)).toBe(attr)
  })

  test('item() returns null for out-of-range', () => {
    const map = new NamedNodeMap()
    expect(map.item(0)).toBeNull()
  })

  test('indexed access via [0]', () => {
    const map = new NamedNodeMap()
    map.setNamedItem(new Attr('id', 'test'))
    expect(map[0]).toBeInstanceOf(Attr)
    expect(map[0].name).toBe('id')
  })

  test('Symbol.iterator works', () => {
    const map = new NamedNodeMap()
    map.setNamedItem(new Attr('a', '1'))
    map.setNamedItem(new Attr('b', '2'))
    const names: string[] = []
    for (const attr of map) {
      names.push(attr.name)
    }
    expect(names).toEqual(['a', 'b'])
  })
})

// =============================================================================
// XMLSerializer
// =============================================================================

describe('XMLSerializer', () => {
  test('serializeToString with element uses outerHTML', () => {
    const serializer = new XMLSerializer()
    const node = { outerHTML: '<div>hello</div>' }
    expect(serializer.serializeToString(node)).toBe('<div>hello</div>')
  })

  test('serializeToString with text node', () => {
    const serializer = new XMLSerializer()
    const node = { nodeType: 3, nodeValue: 'hello world' }
    expect(serializer.serializeToString(node)).toBe('hello world')
  })

  test('serializeToString with comment node', () => {
    const serializer = new XMLSerializer()
    const node = { nodeType: 8, nodeValue: ' a comment ' }
    expect(serializer.serializeToString(node)).toBe('<!-- a comment -->')
  })

  test('serializeToString with document fragment', () => {
    const serializer = new XMLSerializer()
    const node = {
      nodeType: 11,
      childNodes: [
        { outerHTML: '<span>a</span>' },
        { nodeType: 3, nodeValue: 'b' },
      ],
    }
    expect(serializer.serializeToString(node)).toBe('<span>a</span>b')
  })

  test('serializeToString with document delegates to documentElement', () => {
    const serializer = new XMLSerializer()
    const node = {
      nodeType: 9,
      documentElement: { outerHTML: '<html></html>' },
    }
    expect(serializer.serializeToString(node)).toBe('<html></html>')
  })

  test('serializeToString with document without documentElement returns empty', () => {
    const serializer = new XMLSerializer()
    const node = { nodeType: 9, documentElement: null }
    expect(serializer.serializeToString(node)).toBe('')
  })

  test('serializeToString with null returns empty string', () => {
    const serializer = new XMLSerializer()
    expect(serializer.serializeToString(null)).toBe('')
  })
})

// =============================================================================
// ValidityState
// =============================================================================

describe('ValidityState', () => {
  test('all boolean properties default to false except valid', () => {
    const vs = new ValidityState()
    expect(vs.badInput).toBe(false)
    expect(vs.customError).toBe(false)
    expect(vs.patternMismatch).toBe(false)
    expect(vs.rangeOverflow).toBe(false)
    expect(vs.rangeUnderflow).toBe(false)
    expect(vs.stepMismatch).toBe(false)
    expect(vs.tooLong).toBe(false)
    expect(vs.tooShort).toBe(false)
    expect(vs.typeMismatch).toBe(false)
    expect(vs.valueMissing).toBe(false)
  })

  test('valid is true by default', () => {
    const vs = new ValidityState()
    expect(vs.valid).toBe(true)
  })
})

// =============================================================================
// Screen
// =============================================================================

describe('Screen', () => {
  test('default width and height', () => {
    const screen = new Screen()
    expect(screen.width).toBe(1024)
    expect(screen.height).toBe(768)
  })

  test('custom width and height', () => {
    const screen = new Screen(1920, 1080)
    expect(screen.width).toBe(1920)
    expect(screen.height).toBe(1080)
  })

  test('availWidth and availHeight match width and height', () => {
    const screen = new Screen(1920, 1080)
    expect(screen.availWidth).toBe(1920)
    expect(screen.availHeight).toBe(1080)
  })

  test('colorDepth is 24', () => {
    const screen = new Screen()
    expect(screen.colorDepth).toBe(24)
  })

  test('pixelDepth is 24', () => {
    const screen = new Screen()
    expect(screen.pixelDepth).toBe(24)
  })

  test('orientation is landscape-primary with angle 0', () => {
    const screen = new Screen()
    expect(screen.orientation.type).toBe('landscape-primary')
    expect(screen.orientation.angle).toBe(0)
  })
})

// =============================================================================
// MediaQueryList
// =============================================================================

describe('MediaQueryList', () => {
  test('matches and media properties', () => {
    const mql = new MediaQueryList('(min-width: 768px)', true)
    expect(mql.media).toBe('(min-width: 768px)')
    expect(mql.matches).toBe(true)
  })

  test('matches can be false', () => {
    const mql = new MediaQueryList('(max-width: 500px)', false)
    expect(mql.matches).toBe(false)
  })

  test('addListener and removeListener', () => {
    const mql = new MediaQueryList('screen', true)
    const cb = () => {}
    mql.addListener(cb)
    mql.removeListener(cb)
    // No error means it works
  })

  test('addEventListener and removeEventListener', () => {
    const mql = new MediaQueryList('screen', true)
    const cb = () => {}
    mql.addEventListener('change', cb)
    mql.removeEventListener('change', cb)
    // No error means it works
  })

  test('dispatchEvent returns true', () => {
    const mql = new MediaQueryList('screen', true)
    expect(mql.dispatchEvent()).toBe(true)
  })
})

// =============================================================================
// Document integration
// =============================================================================

describe('Document integration', () => {
  test('document.styleSheets returns array', () => {
    const doc = new VirtualDocument()
    expect(Array.isArray(doc.styleSheets)).toBe(true)
  })

  test('document.adoptedStyleSheets get/set', () => {
    const doc = new VirtualDocument()
    expect(doc.adoptedStyleSheets).toEqual([])

    const sheet = new CSSStyleSheet()
    doc.adoptedStyleSheets = [sheet]
    expect(doc.adoptedStyleSheets.length).toBe(1)
    expect(doc.adoptedStyleSheets[0]).toBe(sheet)
  })

  test('window.getComputedStyle returns object with getPropertyValue', () => {
    const win = new Window()
    const el = win.document.createElement('div')
    win.document.body!.appendChild(el)
    el.style.setProperty('color', 'red')
    const computed = win.getComputedStyle(el)
    expect(typeof computed.getPropertyValue).toBe('function')
    expect(computed.getPropertyValue('color')).toBe('red')
  })
})

// =============================================================================
// Window integration
// =============================================================================

describe('Window integration', () => {
  test('window.CSS exists with escape and supports', () => {
    const win = new Window()
    expect(win.CSS).toBeDefined()
    expect(typeof win.CSS.escape).toBe('function')
    expect(typeof win.CSS.supports).toBe('function')
  })

  test('window.CSSStyleSheet constructor works', () => {
    const win = new Window()
    const sheet = new win.CSSStyleSheet()
    expect(sheet).toBeInstanceOf(CSSStyleSheet)
  })

  test('window.DOMRect constructor works', () => {
    const win = new Window()
    const rect = new win.DOMRect(1, 2, 3, 4)
    expect(rect).toBeInstanceOf(DOMRect)
    expect(rect.x).toBe(1)
  })

  test('window.XMLSerializer constructor works', () => {
    const win = new Window()
    const serializer = new win.XMLSerializer()
    expect(serializer).toBeInstanceOf(XMLSerializer)
  })

  test('window.Screen constructor works', () => {
    const win = new Window()
    const screen = new win.Screen()
    expect(screen).toBeInstanceOf(Screen)
  })

  test('window.matchMedia returns MediaQueryList instance', () => {
    const win = new Window()
    const mql = win.matchMedia('(min-width: 768px)')
    expect(mql).toBeInstanceOf(MediaQueryList)
    expect(mql.media).toBe('(min-width: 768px)')
  })

  test('window.screen returns Screen instance', () => {
    const win = new Window()
    expect(win.screen).toBeInstanceOf(Screen)
    expect(win.screen.width).toBeGreaterThan(0)
  })

  test('window.HTMLDocument exists', () => {
    const win = new Window()
    expect(win.HTMLDocument).toBeDefined()
  })

  test('window.XMLDocument exists', () => {
    const win = new Window()
    expect(win.XMLDocument).toBeDefined()
  })
})
