/**
 * Checked and selected state, read the way an accessibility tree reads it.
 *
 * A native `<input type=checkbox>` cannot be styled far enough for most
 * component libraries, so a design system's checkbox is a `div`, `span` or
 * `button` carrying `role="checkbox"` and driving `aria-checked`. That attribute
 * *is* the contract — it is what makes the element a checkbox to a screen reader,
 * and what Playwright reads (#1616).
 *
 * Every reader of this state goes through here: `isChecked()` on a locator and on
 * a page, `getByRole`'s `checked` option, `check()`/`uncheck()`, and the
 * `toBeChecked` matcher. They used to each compare `element.checked === true`,
 * which is `false` for any custom control — so `not.toBeChecked()` passed
 * unconditionally, and `check()` on an already-ticked control clicked it off.
 */

import { computeRole } from './roles'

interface ElementLike {
  tagName?: string
  checked?: boolean
  selected?: boolean
  getAttribute?: (name: string) => string | null
}

/** `mixed` is a real third state, for a tri-state checkbox. */
export type CheckedState = boolean | 'mixed'

/** Roles for which being checked means anything. */
const CHECKABLE_ROLES = new Set([
  'checkbox',
  'radio',
  'switch',
  'menuitemcheckbox',
  'menuitemradio',
])

/** Roles for which being selected means anything. */
const SELECTABLE_ROLES = new Set([
  'option',
  'tab',
  'row',
  'gridcell',
  'columnheader',
  'rowheader',
  'treeitem',
])

/**
 * Whether the element has a live `checked` property of its own.
 *
 * Tested by tag and type rather than with `'checked' in element`, because that
 * property is defined on every element here — a `<div>` answers `false` to it,
 * so an `in` check would take the native branch for custom controls and defeat
 * the whole purpose.
 */
function isNativeCheckbox(element: ElementLike): boolean {
  if (element.tagName?.toUpperCase() !== 'INPUT')
    return false

  const type = (element.getAttribute?.('type') ?? 'text').toLowerCase()
  return type === 'checkbox' || type === 'radio'
}

/**
 * The element's checked state, or `undefined` when it is not checkable at all.
 *
 * The native property wins where there is one: it is the live state, and an
 * author who writes `aria-checked` on a real `<input type=checkbox>` is
 * duplicating something the browser already tracks.
 */
export function checkedState(element: ElementLike): CheckedState | undefined {
  if (isNativeCheckbox(element))
    return element.checked === true

  if (!CHECKABLE_ROLES.has(computeRole(element as any) ?? ''))
    return undefined

  switch (element.getAttribute?.('aria-checked')) {
    case 'true': return true
    case 'mixed': return 'mixed'
    case 'false': return false
    // A checkbox role with no aria-checked is unchecked, not unknown: the role
    // is the author saying this is a checkbox.
    default: return false
  }
}

/**
 * Checked as a plain boolean, which is what `isChecked()` reports.
 *
 * `mixed` is neither checked nor unchecked, and a boolean cannot say so, so it
 * answers `false` here. `toBeChecked({ checked: 'mixed' })` is where the third
 * state can be asked about without lying.
 */
export function isChecked(element: ElementLike): boolean {
  return checkedState(element) === true
}

/**
 * The element's selected state, or `undefined` when it is not selectable.
 *
 * `<option selected>` keeps a live property, the same as a native checkbox;
 * everything else goes through `aria-selected`.
 */
export function selectedState(element: ElementLike): boolean | undefined {
  if (element.tagName?.toUpperCase() === 'OPTION')
    return element.selected === true

  if (!SELECTABLE_ROLES.has(computeRole(element as any) ?? ''))
    return undefined

  return element.getAttribute?.('aria-selected') === 'true'
}

/** Selected as a plain boolean. */
export function isSelected(element: ElementLike): boolean {
  return selectedState(element) === true
}
