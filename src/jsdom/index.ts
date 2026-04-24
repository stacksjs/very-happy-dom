/**
 * jsdom-compatible entry point for very-happy-dom. Matches the surface
 * of `jsdom` for drop-in migration of existing test suites.
 */

export { CookieJar } from './CookieJar'
export type {
  CookieJarGetCookiesOptions,
  CookieJarSetCookieOptions,
} from './CookieJar'
export { JSDOM } from './JSDOM'
export type {
  JSDOMConstructorOptions,
  JSDOMReconfigureSettings,
  JSDOMResources,
  JSDOMRunScripts,
} from './JSDOM'
export { ResourceLoader } from './ResourceLoader'
export type {
  FetchOptions as ResourceLoaderFetchOptions,
  ResourceLoaderConstructorOptions,
} from './ResourceLoader'
export { VirtualConsole } from './VirtualConsole'
export type {
  VirtualConsoleListener,
  VirtualConsoleSendToOptions,
} from './VirtualConsole'
