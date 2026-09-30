/**
 * Key combinations, parsed once (#1615).
 *
 * `press('Control+a')` used to dispatch a `keydown` whose `key` was the literal
 * string `'Control+a'` with every modifier flag false. No real `KeyboardEvent`
 * can carry that value, so a handler checking `key === 'a' && ctrlKey` simply did
 * not match — and nothing reported a problem. `press()` resolved, an event fired,
 * and the test asserted that nothing happened, which was true.
 *
 * The shortcuts affected are the ones applications actually bind: `Meta+K` for a
 * command palette, `Control+Enter` to submit, `Shift+Tab` to move focus back,
 * `Control+A` before typing to replace a field.
 */

/** Which `KeyboardEvent` flag a modifier name sets. */
export type ModifierFlag = 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'

/**
 * Modifier spellings and the flag each sets.
 *
 * `ControlOrMeta` is Playwright's platform-dependent alias. There is no platform
 * here, so it resolves to Control rather than guessing — a test that needs the
 * distinction should name the one it means.
 */
const MODIFIERS = new Map<string, { flag: ModifierFlag, key: string }>([
  ['control', { flag: 'ctrlKey', key: 'Control' }],
  ['ctrl', { flag: 'ctrlKey', key: 'Control' }],
  ['controlormeta', { flag: 'ctrlKey', key: 'Control' }],
  ['shift', { flag: 'shiftKey', key: 'Shift' }],
  ['alt', { flag: 'altKey', key: 'Alt' }],
  ['option', { flag: 'altKey', key: 'Alt' }],
  ['meta', { flag: 'metaKey', key: 'Meta' }],
  ['cmd', { flag: 'metaKey', key: 'Meta' }],
  ['command', { flag: 'metaKey', key: 'Meta' }],
])

/** `code` for the keys that are not a bare character. */
const NAMED_CODES = new Map<string, string>([
  ['enter', 'Enter'],
  ['tab', 'Tab'],
  ['escape', 'Escape'],
  ['esc', 'Escape'],
  ['backspace', 'Backspace'],
  ['delete', 'Delete'],
  ['insert', 'Insert'],
  ['arrowup', 'ArrowUp'],
  ['arrowdown', 'ArrowDown'],
  ['arrowleft', 'ArrowLeft'],
  ['arrowright', 'ArrowRight'],
  ['home', 'Home'],
  ['end', 'End'],
  ['pageup', 'PageUp'],
  ['pagedown', 'PageDown'],
  ['capslock', 'CapsLock'],
  ['contextmenu', 'ContextMenu'],
  // A modifier's own code names the physical side; left is the convention.
  ['shift', 'ShiftLeft'],
  ['control', 'ControlLeft'],
  ['alt', 'AltLeft'],
  ['meta', 'MetaLeft'],
])

/** `code` for punctuation, which is named after the US-layout physical key. */
const PUNCTUATION_CODES = new Map<string, string>([
  [' ', 'Space'],
  ['-', 'Minus'],
  ['=', 'Equal'],
  ['[', 'BracketLeft'],
  [']', 'BracketRight'],
  [';', 'Semicolon'],
  ['\'', 'Quote'],
  ['`', 'Backquote'],
  ['\\', 'Backslash'],
  [',', 'Comma'],
  ['.', 'Period'],
  ['/', 'Slash'],
])

/**
 * The `code` a key would report.
 *
 * `code` is what you read when you want the physical key regardless of layout,
 * so a handler comparing `code === 'KeyA'` needs it populated — it was always
 * `''`. Unknown keys stay `''` rather than getting a guessed value.
 */
export function codeFor(key: string): string {
  const named = NAMED_CODES.get(key.toLowerCase())
  if (named)
    return named

  const fkey = /^f([1-9]|1[0-9]|2[0-4])$/i.exec(key)
  if (fkey)
    return `F${fkey[1]}`

  if (key.length === 1) {
    if (/[a-z]/i.test(key))
      return `Key${key.toUpperCase()}`
    if (/\d/.test(key))
      return `Digit${key}`
    const punctuation = PUNCTUATION_CODES.get(key)
    if (punctuation)
      return punctuation
  }

  return ''
}

/** Whether this key is a modifier rather than something it modifies. */
export function modifierFlagFor(key: string): ModifierFlag | null {
  return MODIFIERS.get(key.toLowerCase())?.flag ?? null
}

/** The canonical `key` for a modifier spelling — `Ctrl` and `Cmd` are aliases. */
export function canonicalModifier(key: string): string | null {
  return MODIFIERS.get(key.toLowerCase())?.key ?? null
}

export interface ParsedCombination {
  /** The modifiers to hold, in the order given, canonically named. */
  held: string[]
  /** The key being pressed while they are held. */
  key: string
}

/**
 * Split `Modifier+Key` into the modifiers to hold and the key to press.
 *
 * Modifiers are consumed from the front only while each segment is a known
 * modifier name, so anything unrecognised leaves the whole string as a literal
 * key. That is what keeps `press('Enter')` — and a nonsense `press('a+b')` —
 * behaving exactly as before rather than being silently reinterpreted.
 */
export function parseCombination(combination: string): ParsedCombination {
  // A bare plus is a key, not an empty combination.
  if (combination === '+')
    return { held: [], key: '+' }

  const segments = combination.split('+')
  const held: string[] = []

  let index = 0
  while (index < segments.length - 1) {
    const modifier = canonicalModifier(segments[index])
    if (!modifier)
      break
    held.push(modifier)
    index++
  }

  const rest = segments.slice(index).join('+')

  return { held, key: rest === '' ? '+' : rest }
}

/**
 * The key as it arrives with modifiers held.
 *
 * Shift turns a letter into its capital, which is what a browser reports and
 * what gets inserted. Shifted punctuation is a layout-specific table and is
 * deliberately not attempted — `press('!')` is the way to ask for that.
 */
export function shiftKeyValue(key: string, shiftHeld: boolean): string {
  if (!shiftHeld || key.length !== 1 || !/[a-z]/.test(key))
    return key

  return key.toUpperCase()
}
