/**
 * Advance widths for the generic font families.
 *
 * Text used to be measured as `length x font-size x 0.5` — every character the
 * same width. That is wrong by as much as it can be: against Chrome at 16px,
 * `illiterate` came out 50% too wide and `WWWW` 47% too narrow, and anything
 * sized by its text inherited the error.
 *
 * These are real per-glyph advances, in thousandths of the em, measured out of
 * Chrome for `serif`, `sans-serif` and `monospace` at both weights. They turn
 * out to match the published Times New Roman, Arial and Courier metrics, which
 * is what makes them worth embedding rather than a quirk of one machine: those
 * are the fonts those keywords resolve to nearly everywhere.
 *
 * Kerning is included for the pairs that have it. Summing advances alone is
 * exact for ordinary lowercase text but a few percent wide on strings with
 * uppercase pairs — `AVATAR` was 12% over before these.
 *
 * What is still approximate: a font this does not have a table for is measured
 * with the table for its generic family, so a page in Inter or Roboto is
 * measured as Arial. Ligatures beyond `ff`, `fi` and `fl` are not modelled, and
 * neither is any script outside ASCII, which falls back to a per-family average.
 */

/** Which of the three tables a `font-family` resolves to. */
export type FontFamilyClass = 'serif' | 'sans' | 'mono'

/** ASCII 32..126, in thousandths of the em. */
const ADVANCES: Record<FontFamilyClass, Record<'regular' | 'bold', string>> = {
  serif: {
    regular: '250,333,408,500,500,833,778,180,333,333,500,564,250,333,250,278,500,500,500,500,500,500,500,500,500,500,278,278,564,564,564,444,921,722,667,667,722,611,556,722,722,333,389,722,611,889,722,722,556,722,667,556,611,722,722,944,722,722,611,333,278,333,469,500,333,444,500,444,500,444,333,500,500,278,278,500,278,778,500,500,500,500,333,389,278,500,500,722,500,500,444,480,200,480,541',
    bold: '250,333,555,500,500,1000,833,278,333,333,500,570,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,570,570,570,500,930,722,667,722,722,667,611,778,778,389,500,778,667,944,722,778,611,778,722,556,667,722,722,1000,722,722,667,333,278,333,581,500,333,500,556,444,556,444,333,500,556,278,333,556,278,833,556,500,556,556,444,389,333,556,500,722,500,500,444,394,220,394,520',
  },
  sans: {
    regular: '278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584',
    bold: '278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584',
  },
  // Every glyph the same width, which is what makes it monospace.
  mono: { regular: '', bold: '' },
}

/** The uniform advance of the monospace table. */
const MONO_ADVANCE = 602

/**
 * Kerning pairs, as `<two characters><adjustment>` runs separated by spaces.
 *
 * Monospace has none, by construction. `ff`, `fi` and `fl` appear here as
 * negative adjustments rather than as ligature glyphs, which comes to the same
 * width.
 */
const KERNS: Record<FontFamilyClass, Record<'regular' | 'bold', string>> = {
  serif: {
    regular: 'AT:-111 AV:-129 AW:-80 AY:-92 Av:-74 Aw:-92 Ay:-92 A :-55 FA:-74 F.:-80 F,:-80 LT:-92 LV:-92 LW:-74 LY:-100 Ly:-55 L :-37 PA:-92 P.:-111 P,:-111 P :-37 RT:-60 RV:-80 RW:-55 RY:-55 Ry:-40 TA:-80 TO:-18 Ta:-70 Tc:-70 Te:-70 Ti:-35 To:-70 Tr:-35 Ts:-70 Tu:-35 Tw:-70 Ty:-70 T.:-74 T,:-74 T-:-92 T :-18 VA:-129 Va:-111 Ve:-111 Vi:-60 Vo:-129 Vr:-60 Vu:-60 Vy:-111 V.:-129 V,:-129 V-:-92 V :-18 WA:-111 Wa:-80 We:-80 Wi:-40 Wo:-80 Wr:-40 Wu:-40 Wy:-60 W.:-92 W,:-92 W-:-55 W :-18 YA:-111 Ya:-100 Ye:-100 Yi:-55 Yo:-100 Yp:-92 Yq:-111 Yu:-111 Yv:-100 Y.:-129 Y,:-129 Y-:-111 Y :-37 ff:-18 fi:-55 fl:-55 rg:-18 r.:-55 r,:-40 r-:-20 v.:-65 v,:-65 w.:-65 w,:-65 y.:-65 y,:-65  A:-55  T:-18  V:-18  W:-18  Y:-37',
    bold: 'AT:-74 AV:-129 AW:-111 AY:-92 Av:-74 Aw:-74 Ay:-74 A :-55 FA:-74 F.:-92 F,:-92 F :-37 LT:-92 LV:-92 LW:-92 LY:-92 Ly:-55 L :-55 PA:-74 P.:-92 P,:-92 P :-55 RT:-35 RV:-35 RW:-35 RY:-35 Ry:-35 TA:-74 TO:-18 Ta:-92 Tc:-92 Te:-92 Ti:-18 To:-92 Tr:-74 Ts:-92 Tu:-92 Tw:-74 Ty:-74 T.:-74 T,:-74 T-:-92 T :-18 VA:-129 VO:-20 Va:-92 Ve:-92 Vi:-37 Vo:-92 Vr:-74 Vu:-92 Vy:-92 V.:-129 V,:-129 V-:-74 V :-18 WA:-111 Wa:-55 We:-55 Wi:-18 Wo:-55 Wr:-18 Wu:-18 Wy:-37 W.:-92 W,:-92 W-:-37 W :-18 YA:-92 Ya:-111 Ye:-111 Yi:-37 Yo:-111 Yp:-92 Yq:-111 Yu:-92 Yv:-111 Y.:-92 Y,:-92 Y-:-92 Y :-37 fi:-55 fl:-55 rc:-18 re:-18 ro:-18 rq:-18 r.:-92 r,:-92 r-:-37 r :-18 v.:-55 v,:-55 w.:-55 w,:-55 y.:-55 y,:-55  A:-55  T:-18  V:-18  W:-18  Y:-37',
  },
  sans: {
    regular: 'AT:-74 AV:-74 AW:-37 AY:-74 Av:-18 Aw:-18 Ay:-18 A :-55 FA:-55 F.:-111 F,:-111 LT:-74 LV:-74 LW:-74 LY:-74 Ly:-37 L :-37 PA:-74 P.:-129 P,:-129 P :-18 RT:-18 RV:-18 RW:-18 RY:-18 TA:-74 TO:-18 Ta:-111 Tc:-111 Te:-111 Ti:-37 To:-111 Tr:-37 Ts:-111 Tu:-37 Tw:-55 Ty:-55 T.:-111 T,:-111 T-:-55 T :-18 VA:-74 Va:-74 Ve:-55 Vi:-18 Vo:-55 Vr:-37 Vu:-37 Vy:-37 V.:-92 V,:-92 V-:-55 WA:-37 Wa:-37 We:-18 Wo:-18 Wr:-18 Wu:-18 Wy:-9 W.:-55 W,:-55 W-:-18 YA:-74 Ya:-74 Ye:-92 Yi:-37 Yo:-92 Yp:-74 Yq:-92 Yu:-55 Yv:-55 Y.:-129 Y,:-129 Y-:-92 Y :-18 ff:-18 r.:-55 r,:-55 v.:-74 v,:-74 w.:-55 w,:-55 y.:-74 y,:-74  A:-55  T:-18  Y:-18',
    bold: 'AT:-74 AV:-74 AW:-55 AY:-92 Av:-37 Aw:-18 Ay:-37 A :-37 FA:-55 F.:-111 F,:-111 LT:-74 LV:-74 LW:-55 LY:-92 Ly:-37 L :-18 PA:-74 P.:-129 P,:-129 P :-18 RV:-18 RW:-18 RY:-37 TA:-74 TO:-18 Ta:-74 Tc:-74 Te:-74 Ti:-18 To:-74 Tr:-55 Ts:-74 Tu:-74 Tw:-74 Ty:-74 T.:-111 T,:-111 T-:-55 VA:-74 Va:-55 Ve:-55 Vi:-18 Vo:-74 Vr:-55 Vu:-37 Vy:-37 V.:-92 V,:-92 V-:-55 WA:-55 Wa:-37 We:-18 Wi:-9 Wo:-18 Wr:-18 Wu:-18 Wy:-18 W.:-55 W,:-55 W-:-20 YA:-92 Ya:-55 Ye:-55 Yi:-37 Yo:-74 Yp:-55 Yq:-74 Yu:-55 Yv:-55 Y.:-111 Y,:-111 Y-:-55 Y :-18 r.:-55 r,:-55 v.:-74 v,:-74 w.:-37 w,:-37 y.:-74 y,:-74  A:-37  Y:-18',
  },
  mono: { regular: '', bold: '' },
}

/** Family names that map onto each table, beyond the generic keywords. */
const FAMILY_NAMES: Record<FontFamilyClass, readonly string[]> = {
  serif: ['serif', 'times', 'times new roman', 'georgia', 'garamond', 'palatino', 'book antiqua', 'cambria', 'constantia', 'baskerville', 'didot', 'ui-serif'],
  sans: ['sans-serif', 'arial', 'helvetica', 'helvetica neue', 'verdana', 'tahoma', 'segoe ui', 'roboto', 'open sans', 'inter', 'calibri', 'system-ui', '-apple-system', 'blinkmacsystemfont', 'ui-sans-serif', 'noto sans', 'liberation sans'],
  mono: ['monospace', 'courier', 'courier new', 'consolas', 'menlo', 'monaco', 'sf mono', 'roboto mono', 'source code pro', 'fira code', 'ui-monospace', 'liberation mono'],
}

const BY_NAME = new Map<string, FontFamilyClass>()
for (const family of ['serif', 'sans', 'mono'] as const) {
  for (const name of FAMILY_NAMES[family])
    BY_NAME.set(name, family)
}

const advanceTables = new Map<string, number[]>()

/**
 * Kerning, keyed by `(left << 7) | right` on the character codes.
 *
 * A numeric key rather than the two-character string, because building that
 * string allocated once per character of every run measured — which on a
 * 21,000-character document cost more than all the rest of the layout pass put
 * together.
 */
interface KernTable {
  /** Adjustments, by packed code pair. */
  pairs: Map<number, number>
  /** Which codes ever appear on the left, so most characters skip the lookup. */
  leftSides: Uint8Array
}

const kernTables = new Map<string, KernTable>()

function advancesFor(family: FontFamilyClass, bold: boolean): number[] {
  const key = `${family}:${bold}`
  let table = advanceTables.get(key)
  if (!table) {
    const text = ADVANCES[family][bold ? 'bold' : 'regular']
    table = text === '' ? [] : text.split(',').map(Number)
    advanceTables.set(key, table)
  }
  return table
}

const KERN_ENTRY = /(..):(-?\d+)/g

function kernsFor(family: FontFamilyClass, bold: boolean): KernTable {
  const key = `${family}:${bold}`
  let table = kernTables.get(key)
  if (!table) {
    const pairs = new Map<number, number>()
    const leftSides = new Uint8Array(128)

    // Matched rather than split, because a pair may itself contain the space
    // the entries are separated by — ` A` is one of them.
    for (const match of KERNS[family][bold ? 'bold' : 'regular'].matchAll(KERN_ENTRY)) {
      const left = match[1].charCodeAt(0)
      const right = match[1].charCodeAt(1)
      pairs.set((left << 7) | right, Number(match[2]))
      if (left < 128)
        leftSides[left] = 1
    }

    table = { pairs, leftSides }
    kernTables.set(key, table)
  }
  return table
}

/**
 * Which table a `font-family` list resolves to.
 *
 * The list is read in order and the first recognised name wins, which is how a
 * browser picks too — give or take that a browser knows which fonts are
 * actually installed and this does not. An unrecognised list falls back to
 * `serif`, matching the initial value.
 */
export function classifyFamily(fontFamily: string): FontFamilyClass {
  for (const part of fontFamily.split(',')) {
    const name = part.trim().replace(/^["']|["']$/g, '').toLowerCase()
    const found = BY_NAME.get(name)
    if (found)
      return found
  }
  return 'serif'
}

/** Is this weight bold enough to use the bold table? */
export function isBoldWeight(weight: string): boolean {
  const trimmed = weight.trim().toLowerCase()
  if (trimmed === 'bold' || trimmed === 'bolder')
    return true
  if (trimmed === 'normal' || trimmed === 'lighter')
    return false
  const numeric = Number.parseInt(trimmed, 10)
  return Number.isFinite(numeric) && numeric >= 600
}

/**
 * The width of `text` at `fontSize`, in pixels.
 *
 * Advances summed with the kerning of each adjacent pair. A character outside
 * ASCII 32..126 takes the family's average advance, which is the honest answer
 * for a table that does not cover it.
 */
export function measureText(text: string, fontSize: number, family: FontFamilyClass, bold: boolean): number {
  if (text === '' || fontSize <= 0)
    return 0

  if (family === 'mono')
    return (text.length * MONO_ADVANCE * fontSize) / 1000

  const advances = advancesFor(family, bold)
  const { pairs, leftSides } = kernsFor(family, bold)
  const fallback = family === 'serif' ? 500 : 556

  let total = 0
  let previous = -1

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    total += code >= 32 && code <= 126 ? advances[code - 32] : fallback

    // Most characters never kern on their left, so the common path is one
    // array read and no lookup at all.
    if (previous >= 0 && previous < 128 && leftSides[previous] === 1) {
      const kern = pairs.get((previous << 7) | code)
      if (kern !== undefined)
        total += kern
    }

    previous = code
  }

  return (total * fontSize) / 1000
}
