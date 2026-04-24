/**
 * FormData wrapper that accepts an HTMLFormElement in its constructor and
 * populates the instance from the form's named fields. Matches the browser
 * spec that happy-dom / jsdom expose.
 */

/**
 * Create a FormData instance, optionally pre-populated from a form element.
 * Falls back to the native FormData for empty / undefined construction.
 */
export function createFormData(form?: unknown, submitter?: unknown): FormData {
  const fd = new globalThis.FormData()
  if (!form || typeof form !== 'object')
    return fd

  const formEl = form as {
    tagName?: string
    elements?: Iterable<unknown>
    querySelectorAll?: (selector: string) => unknown[]
  }

  if (formEl.tagName !== 'FORM')
    return fd

  const fields = formEl.elements
    ? Array.from(formEl.elements)
    : formEl.querySelectorAll
      ? Array.from(formEl.querySelectorAll('input,select,textarea,button'))
      : []

  for (const raw of fields) {
    const field = raw as {
      tagName?: string
      type?: string
      name?: string
      value?: string
      checked?: boolean
      disabled?: boolean
      files?: FileList | File[] | null
      selectedOptions?: Iterable<{ value: string }>
      multiple?: boolean
      options?: Array<{ value: string, selected: boolean }>
    }
    const name = field.name
    if (!name || field.disabled)
      continue

    const tag = (field.tagName ?? '').toUpperCase()
    const type = (field.type ?? '').toLowerCase()

    if (tag === 'BUTTON' || type === 'button' || type === 'reset') {
      if (field !== submitter)
        continue
    }
    if (type === 'submit' && field !== submitter)
      continue
    if ((type === 'checkbox' || type === 'radio') && !field.checked)
      continue

    if (type === 'file') {
      const files = field.files
      if (!files || (files as File[]).length === 0) {
        fd.append(name, new File([], '', { type: 'application/octet-stream' }))
      }
      else {
        for (const file of files as unknown as File[])
          fd.append(name, file)
      }
      continue
    }

    if (tag === 'SELECT') {
      const selected = field.multiple && field.options
        ? field.options.filter(opt => opt.selected).map(opt => opt.value)
        : [field.value ?? '']
      for (const v of selected)
        fd.append(name, v)
      continue
    }

    fd.append(name, field.value ?? '')
  }

  return fd
}

/**
 * FormData subclass that accepts a form element in the constructor.
 * Returns a freshly-populated FormData instance — `instanceof FormData`
 * remains true.
 */
export const VeryHappyFormData = new Proxy(globalThis.FormData, {
  construct(_target, args): FormData {
    const [form, submitter] = args
    if (form === undefined)
      return new globalThis.FormData()
    return createFormData(form, submitter)
  },
}) as typeof globalThis.FormData
