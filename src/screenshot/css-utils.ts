/**
 * CSS Utilities
 * Provides CSS parsing utilities for the screenshot renderer
 */

/**
 * RGBA color representation
 */
export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

/**
 * Named CSS colors (subset of most common colors)
 */
const NAMED_COLORS: Record<string, RGBA> = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  black: { r: 0, g: 0, b: 0, a: 255 },
  white: { r: 255, g: 255, b: 255, a: 255 },
  red: { r: 255, g: 0, b: 0, a: 255 },
  green: { r: 0, g: 128, b: 0, a: 255 },
  blue: { r: 0, g: 0, b: 255, a: 255 },
  yellow: { r: 255, g: 255, b: 0, a: 255 },
  cyan: { r: 0, g: 255, b: 255, a: 255 },
  magenta: { r: 255, g: 0, b: 255, a: 255 },
  gray: { r: 128, g: 128, b: 128, a: 255 },
  grey: { r: 128, g: 128, b: 128, a: 255 },
  silver: { r: 192, g: 192, b: 192, a: 255 },
  maroon: { r: 128, g: 0, b: 0, a: 255 },
  olive: { r: 128, g: 128, b: 0, a: 255 },
  lime: { r: 0, g: 255, b: 0, a: 255 },
  aqua: { r: 0, g: 255, b: 255, a: 255 },
  teal: { r: 0, g: 128, b: 128, a: 255 },
  navy: { r: 0, g: 0, b: 128, a: 255 },
  fuchsia: { r: 255, g: 0, b: 255, a: 255 },
  purple: { r: 128, g: 0, b: 128, a: 255 },
  orange: { r: 255, g: 165, b: 0, a: 255 },
  pink: { r: 255, g: 192, b: 203, a: 255 },
  brown: { r: 165, g: 42, b: 42, a: 255 },
  gold: { r: 255, g: 215, b: 0, a: 255 },
  indigo: { r: 75, g: 0, b: 130, a: 255 },
  violet: { r: 238, g: 130, b: 238, a: 255 },
  coral: { r: 255, g: 127, b: 80, a: 255 },
  salmon: { r: 250, g: 128, b: 114, a: 255 },
  khaki: { r: 240, g: 230, b: 140, a: 255 },
  plum: { r: 221, g: 160, b: 221, a: 255 },
  orchid: { r: 218, g: 112, b: 214, a: 255 },
  turquoise: { r: 64, g: 224, b: 208, a: 255 },
  tan: { r: 210, g: 180, b: 140, a: 255 },
  chocolate: { r: 210, g: 105, b: 30, a: 255 },
  tomato: { r: 255, g: 99, b: 71, a: 255 },
  crimson: { r: 220, g: 20, b: 60, a: 255 },
  darkblue: { r: 0, g: 0, b: 139, a: 255 },
  darkgreen: { r: 0, g: 100, b: 0, a: 255 },
  darkred: { r: 139, g: 0, b: 0, a: 255 },
  darkorange: { r: 255, g: 140, b: 0, a: 255 },
  lightblue: { r: 173, g: 216, b: 230, a: 255 },
  lightgreen: { r: 144, g: 238, b: 144, a: 255 },
  lightgray: { r: 211, g: 211, b: 211, a: 255 },
  lightgrey: { r: 211, g: 211, b: 211, a: 255 },
  lightpink: { r: 255, g: 182, b: 193, a: 255 },
  lightyellow: { r: 255, g: 255, b: 224, a: 255 },
  darkgray: { r: 169, g: 169, b: 169, a: 255 },
  darkgrey: { r: 169, g: 169, b: 169, a: 255 },
  slategray: { r: 112, g: 128, b: 144, a: 255 },
  slategrey: { r: 112, g: 128, b: 144, a: 255 },
  dimgray: { r: 105, g: 105, b: 105, a: 255 },
  dimgrey: { r: 105, g: 105, b: 105, a: 255 },
  whitesmoke: { r: 245, g: 245, b: 245, a: 255 },
  snow: { r: 255, g: 250, b: 250, a: 255 },
  ivory: { r: 255, g: 255, b: 240, a: 255 },
  beige: { r: 245, g: 245, b: 220, a: 255 },
  linen: { r: 250, g: 240, b: 230, a: 255 },
  aliceblue: { r: 240, g: 248, b: 255, a: 255 },
  antiquewhite: { r: 250, g: 235, b: 215, a: 255 },
  azure: { r: 240, g: 255, b: 255, a: 255 },
  bisque: { r: 255, g: 228, b: 196, a: 255 },
  blanchedalmond: { r: 255, g: 235, b: 205, a: 255 },
  burlywood: { r: 222, g: 184, b: 135, a: 255 },
  cadetblue: { r: 95, g: 158, b: 160, a: 255 },
  chartreuse: { r: 127, g: 255, b: 0, a: 255 },
  cornflowerblue: { r: 100, g: 149, b: 237, a: 255 },
  cornsilk: { r: 255, g: 248, b: 220, a: 255 },
  cyan: { r: 0, g: 255, b: 255, a: 255 },
  deeppink: { r: 255, g: 20, b: 147, a: 255 },
  deepskyblue: { r: 0, g: 191, b: 255, a: 255 },
  dodgerblue: { r: 30, g: 144, b: 255, a: 255 },
  firebrick: { r: 178, g: 34, b: 34, a: 255 },
  floralwhite: { r: 255, g: 250, b: 240, a: 255 },
  forestgreen: { r: 34, g: 139, b: 34, a: 255 },
  gainsboro: { r: 220, g: 220, b: 220, a: 255 },
  ghostwhite: { r: 248, g: 248, b: 255, a: 255 },
  greenyellow: { r: 173, g: 255, b: 47, a: 255 },
  honeydew: { r: 240, g: 255, b: 240, a: 255 },
  hotpink: { r: 255, g: 105, b: 180, a: 255 },
  indianred: { r: 205, g: 92, b: 92, a: 255 },
  lavender: { r: 230, g: 230, b: 250, a: 255 },
  lavenderblush: { r: 255, g: 240, b: 245, a: 255 },
  lawngreen: { r: 124, g: 252, b: 0, a: 255 },
  lemonchiffon: { r: 255, g: 250, b: 205, a: 255 },
  lightcoral: { r: 240, g: 128, b: 128, a: 255 },
  lightcyan: { r: 224, g: 255, b: 255, a: 255 },
  lightgoldenrodyellow: { r: 250, g: 250, b: 210, a: 255 },
  lightsalmon: { r: 255, g: 160, b: 122, a: 255 },
  lightseagreen: { r: 32, g: 178, b: 170, a: 255 },
  lightskyblue: { r: 135, g: 206, b: 250, a: 255 },
  lightslategray: { r: 119, g: 136, b: 153, a: 255 },
  lightslategrey: { r: 119, g: 136, b: 153, a: 255 },
  lightsteelblue: { r: 176, g: 196, b: 222, a: 255 },
  limegreen: { r: 50, g: 205, b: 50, a: 255 },
  mediumaquamarine: { r: 102, g: 205, b: 170, a: 255 },
  mediumblue: { r: 0, g: 0, b: 205, a: 255 },
  mediumorchid: { r: 186, g: 85, b: 211, a: 255 },
  mediumpurple: { r: 147, g: 112, b: 219, a: 255 },
  mediumseagreen: { r: 60, g: 179, b: 113, a: 255 },
  mediumslateblue: { r: 123, g: 104, b: 238, a: 255 },
  mediumspringgreen: { r: 0, g: 250, b: 154, a: 255 },
  mediumturquoise: { r: 72, g: 209, b: 204, a: 255 },
  mediumvioletred: { r: 199, g: 21, b: 133, a: 255 },
  midnightblue: { r: 25, g: 25, b: 112, a: 255 },
  mintcream: { r: 245, g: 255, b: 250, a: 255 },
  mistyrose: { r: 255, g: 228, b: 225, a: 255 },
  moccasin: { r: 255, g: 228, b: 181, a: 255 },
  navajowhite: { r: 255, g: 222, b: 173, a: 255 },
  oldlace: { r: 253, g: 245, b: 230, a: 255 },
  olivedrab: { r: 107, g: 142, b: 35, a: 255 },
  orangered: { r: 255, g: 69, b: 0, a: 255 },
  palegoldenrod: { r: 238, g: 232, b: 170, a: 255 },
  palegreen: { r: 152, g: 251, b: 152, a: 255 },
  paleturquoise: { r: 175, g: 238, b: 238, a: 255 },
  palevioletred: { r: 219, g: 112, b: 147, a: 255 },
  papayawhip: { r: 255, g: 239, b: 213, a: 255 },
  peachpuff: { r: 255, g: 218, b: 185, a: 255 },
  peru: { r: 205, g: 133, b: 63, a: 255 },
  powderblue: { r: 176, g: 224, b: 230, a: 255 },
  rosybrown: { r: 188, g: 143, b: 143, a: 255 },
  royalblue: { r: 65, g: 105, b: 225, a: 255 },
  saddlebrown: { r: 139, g: 69, b: 19, a: 255 },
  sandybrown: { r: 244, g: 164, b: 96, a: 255 },
  seagreen: { r: 46, g: 139, b: 87, a: 255 },
  seashell: { r: 255, g: 245, b: 238, a: 255 },
  sienna: { r: 160, g: 82, b: 45, a: 255 },
  skyblue: { r: 135, g: 206, b: 235, a: 255 },
  slateblue: { r: 106, g: 90, b: 205, a: 255 },
  springgreen: { r: 0, g: 255, b: 127, a: 255 },
  steelblue: { r: 70, g: 130, b: 180, a: 255 },
  thistle: { r: 216, g: 191, b: 216, a: 255 },
  wheat: { r: 245, g: 222, b: 179, a: 255 },
  yellowgreen: { r: 154, g: 205, b: 50, a: 255 },
}

/**
 * Parse a CSS color string to RGBA
 */
export function parseColor(color: string | undefined): RGBA {
  if (!color) {
    return { r: 0, g: 0, b: 0, a: 0 }
  }

  color = color.trim().toLowerCase()

  // Named color
  if (NAMED_COLORS[color]) {
    return { ...NAMED_COLORS[color] }
  }

  // Hex color
  if (color.startsWith('#')) {
    return parseHexColor(color)
  }

  // RGB/RGBA
  if (color.startsWith('rgb')) {
    return parseRgbColor(color)
  }

  // HSL/HSLA
  if (color.startsWith('hsl')) {
    return parseHslColor(color)
  }

  // Default to transparent
  return { r: 0, g: 0, b: 0, a: 0 }
}

/**
 * Parse hex color (#RGB, #RGBA, #RRGGBB, #RRGGBBAA)
 */
function parseHexColor(hex: string): RGBA {
  hex = hex.slice(1) // Remove #

  let r: number, g: number, b: number, a: number = 255

  if (hex.length === 3) {
    // #RGB
    r = Number.parseInt(hex[0] + hex[0], 16)
    g = Number.parseInt(hex[1] + hex[1], 16)
    b = Number.parseInt(hex[2] + hex[2], 16)
  }
  else if (hex.length === 4) {
    // #RGBA
    r = Number.parseInt(hex[0] + hex[0], 16)
    g = Number.parseInt(hex[1] + hex[1], 16)
    b = Number.parseInt(hex[2] + hex[2], 16)
    a = Number.parseInt(hex[3] + hex[3], 16)
  }
  else if (hex.length === 6) {
    // #RRGGBB
    r = Number.parseInt(hex.slice(0, 2), 16)
    g = Number.parseInt(hex.slice(2, 4), 16)
    b = Number.parseInt(hex.slice(4, 6), 16)
  }
  else if (hex.length === 8) {
    // #RRGGBBAA
    r = Number.parseInt(hex.slice(0, 2), 16)
    g = Number.parseInt(hex.slice(2, 4), 16)
    b = Number.parseInt(hex.slice(4, 6), 16)
    a = Number.parseInt(hex.slice(6, 8), 16)
  }
  else {
    return { r: 0, g: 0, b: 0, a: 0 }
  }

  return { r, g, b, a }
}

/**
 * Parse rgb/rgba color
 */
function parseRgbColor(color: string): RGBA {
  const match = color.match(/rgba?\s*\(\s*([^)]+)\s*\)/)
  if (!match)
    return { r: 0, g: 0, b: 0, a: 0 }

  const parts = match[1].split(/[\s,/]+/).map(s => s.trim()).filter(Boolean)

  let r = parseColorValue(parts[0], 255)
  let g = parseColorValue(parts[1], 255)
  let b = parseColorValue(parts[2], 255)
  let a = parts[3] !== undefined ? parseColorValue(parts[3], 1) * 255 : 255

  return {
    r: Math.round(Math.min(255, Math.max(0, r))),
    g: Math.round(Math.min(255, Math.max(0, g))),
    b: Math.round(Math.min(255, Math.max(0, b))),
    a: Math.round(Math.min(255, Math.max(0, a))),
  }
}

/**
 * Parse hsl/hsla color
 */
function parseHslColor(color: string): RGBA {
  const match = color.match(/hsla?\s*\(\s*([^)]+)\s*\)/)
  if (!match)
    return { r: 0, g: 0, b: 0, a: 0 }

  const parts = match[1].split(/[\s,/]+/).map(s => s.trim()).filter(Boolean)

  let h = parseAngleValue(parts[0])
  let s = parseColorValue(parts[1], 100) / 100
  let l = parseColorValue(parts[2], 100) / 100
  let a = parts[3] !== undefined ? parseColorValue(parts[3], 1) : 1

  // HSL to RGB conversion
  const { r, g, b } = hslToRgb(h, s, l)

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    a: Math.round(a * 255),
  }
}

/**
 * Parse a color value (number or percentage)
 */
function parseColorValue(value: string | undefined, maxValue: number): number {
  if (!value)
    return 0
  if (value.endsWith('%')) {
    return (Number.parseFloat(value) / 100) * maxValue
  }
  return Number.parseFloat(value)
}

/**
 * Parse an angle value (deg, rad, grad, turn)
 */
function parseAngleValue(value: string | undefined): number {
  if (!value)
    return 0
  value = value.toLowerCase()

  if (value.endsWith('deg')) {
    return Number.parseFloat(value) / 360
  }
  if (value.endsWith('rad')) {
    return Number.parseFloat(value) / (2 * Math.PI)
  }
  if (value.endsWith('grad')) {
    return Number.parseFloat(value) / 400
  }
  if (value.endsWith('turn')) {
    return Number.parseFloat(value)
  }
  // Default: assume degrees
  return Number.parseFloat(value) / 360
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number, g: number, b: number } {
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l * 255
  }
  else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0)
        t += 1
      if (t > 1)
        t -= 1
      if (t < 1 / 6)
        return p + (q - p) * 6 * t
      if (t < 1 / 2)
        return q
      if (t < 2 / 3)
        return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3) * 255
    g = hue2rgb(p, q, h) * 255
    b = hue2rgb(p, q, h - 1 / 3) * 255
  }

  return { r, g, b }
}

/**
 * Parse a CSS size value to pixels
 */
export function parseSize(value: string | undefined, defaultValue: number = 0, containerSize: number = 0): number {
  if (!value)
    return defaultValue

  value = value.trim().toLowerCase()

  if (value === 'auto')
    return defaultValue

  if (value.endsWith('px')) {
    return Number.parseFloat(value)
  }

  if (value.endsWith('%')) {
    return (Number.parseFloat(value) / 100) * containerSize
  }

  if (value.endsWith('em')) {
    return Number.parseFloat(value) * 16 // Assume 16px base font size
  }

  if (value.endsWith('rem')) {
    return Number.parseFloat(value) * 16 // Assume 16px root font size
  }

  if (value.endsWith('vw')) {
    return (Number.parseFloat(value) / 100) * containerSize
  }

  if (value.endsWith('vh')) {
    return (Number.parseFloat(value) / 100) * containerSize
  }

  // Try parsing as plain number (interpreted as pixels)
  const num = Number.parseFloat(value)
  return Number.isNaN(num) ? defaultValue : num
}

/**
 * Parse CSS box values (margin, padding, border-width)
 * Returns [top, right, bottom, left]
 */
export function parseBoxValues(value: string | undefined): [number, number, number, number] {
  if (!value)
    return [0, 0, 0, 0]

  const parts = value.trim().split(/\s+/)
  const values = parts.map(p => parseSize(p, 0))

  switch (values.length) {
    case 1:
      return [values[0], values[0], values[0], values[0]]
    case 2:
      return [values[0], values[1], values[0], values[1]]
    case 3:
      return [values[0], values[1], values[2], values[1]]
    case 4:
      return [values[0], values[1], values[2], values[3]]
    default:
      return [0, 0, 0, 0]
  }
}

/**
 * Extract inline styles from a style attribute
 */
export function parseInlineStyles(styleAttr: string | undefined): Record<string, string> {
  const styles: Record<string, string> = {}
  if (!styleAttr)
    return styles

  const rules = styleAttr.split(';')
  for (const rule of rules) {
    const [prop, ...valueParts] = rule.split(':')
    if (prop && valueParts.length > 0) {
      const propName = prop.trim().toLowerCase()
      const value = valueParts.join(':').trim()
      styles[propName] = value
    }
  }

  return styles
}

/**
 * Blend two colors with alpha compositing
 */
export function blendColors(fg: RGBA, bg: RGBA): RGBA {
  const fgA = fg.a / 255
  const bgA = bg.a / 255
  const outA = fgA + bgA * (1 - fgA)

  if (outA === 0) {
    return { r: 0, g: 0, b: 0, a: 0 }
  }

  return {
    r: Math.round((fg.r * fgA + bg.r * bgA * (1 - fgA)) / outA),
    g: Math.round((fg.g * fgA + bg.g * bgA * (1 - fgA)) / outA),
    b: Math.round((fg.b * fgA + bg.b * bgA * (1 - fgA)) / outA),
    a: Math.round(outA * 255),
  }
}
