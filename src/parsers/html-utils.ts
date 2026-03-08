const namedEntities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\'',
  nbsp: '\u00A0',
}

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity: string) => {
    const normalized = entity.toLowerCase()
    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16)
      return Number.isNaN(codePoint) ? `&${entity};` : String.fromCodePoint(codePoint)
    }
    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10)
      return Number.isNaN(codePoint) ? `&${entity};` : String.fromCodePoint(codePoint)
    }
    return namedEntities[normalized] ?? `&${entity};`
  })
}

export function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function escapeHtmlAttribute(value: string): string {
  return escapeHtmlText(value)
    .replace(/"/g, '&quot;')
}
