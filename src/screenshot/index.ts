/**
 * Screenshot Module
 * Renders HTML to actual PNG/JPEG images using a pure JavaScript rendering pipeline
 * Zero external dependencies - everything is homegrown
 */

// Core renderer
export { createRenderer, HtmlRenderer, type RenderOptions, type RenderResult } from './renderer'

// Screenshot capture
export { captureHtml, captureUrl, ScreenshotCapture, type ScreenshotOptions } from './capture'

// Image comparison
export { compareImages, ImageDiff, type DiffOptions, type DiffResult } from './diff'

// Compression utilities
export { adler32, crc32, deflate, deflateRaw, deflateStore, inflate, inflateRaw } from './deflate'

// CSS utilities
export { blendColors, parseBoxValues, parseColor, parseInlineStyles, parseSize, type RGBA } from './css-utils'

// Layout engine
export { computeLayout, parseCSS, parseHTML, type Box, type ComputedStyles, type CSSRule, type LayoutNode, type ParsedElement } from './layout'

// Pixel rendering
export { PixelBuffer, renderHtmlToPixels, renderLayoutTree } from './pixel-renderer'

// WebP support
export { decodeWebP, encodeWebP, isWebP, type WebPOptions } from './webp'
