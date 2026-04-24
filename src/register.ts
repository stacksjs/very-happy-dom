/**
 * Drop-in registration entry point.
 *
 * Usage:
 *   // bunfig.toml
 *   [test]
 *   preload = ["very-happy-dom/register"]
 *
 *   // or inline
 *   import 'very-happy-dom/register'
 *
 * Installs window/document and the full Window surface onto globalThis the
 * same way `@happy-dom/global-registrator/register` does.
 */

import { GlobalRegistrator } from './window/GlobalRegistrator'

const alreadyRegistered
  = typeof (globalThis as { window?: unknown }).window !== 'undefined'
  && typeof (globalThis as { document?: unknown }).document !== 'undefined'

if (!alreadyRegistered) {
  GlobalRegistrator.register({
    url: process.env.VERY_HAPPY_DOM_URL
      || process.env.HAPPY_DOM_URL
      || 'http://localhost/',
  })
}
