/**
 * Clipboard API implementation
 * Provides in-memory clipboard for testing
 */

import { Geolocation } from './BrowserAPIs'

export class ClipboardItem {
  readonly types: string[]
  private _data: Map<string, Blob | string | Promise<Blob | string>>

  constructor(data: Record<string, Blob | string | Promise<Blob | string>>) {
    this._data = new Map(Object.entries(data))
    this.types = Array.from(this._data.keys())
  }

  async getType(type: string): Promise<Blob> {
    const v = this._data.get(type)
    if (v === undefined)
      throw new DOMException(`Type "${type}" not available on ClipboardItem`, 'NotFoundError')
    const resolved = await v
    if (resolved instanceof Blob)
      return resolved
    return new Blob([resolved], { type })
  }

  static supports(type: string): boolean {
    return typeof type === 'string' && type.length > 0
  }
}

export class Clipboard {
  private _text = ''

  async writeText(text: string): Promise<void> {
    this._text = text
  }

  async readText(): Promise<string> {
    return this._text
  }

  async write(data: ClipboardItems): Promise<void> {
    // Simplified implementation
    for (const item of data) {
      for (const type of item.types) {
        const blob = await item.getType(type)
        if (type === 'text/plain') {
          this._text = await blob.text()
        }
      }
    }
  }

  async read(): Promise<ClipboardItems> {
    const blob = new Blob([this._text], { type: 'text/plain' })
    const item = new ClipboardItem({
      'text/plain': blob,
    })
    return [item]
  }
}

function detectPlatform(): string {
  if (typeof process !== 'undefined' && process.platform) {
    switch (process.platform) {
      case 'darwin': return 'MacIntel'
      case 'win32': return 'Win32'
      case 'linux': return 'Linux x86_64'
      default: return process.platform
    }
  }
  return 'Linux x86_64'
}

export class Permissions {
  query(descriptor: { name: string }): Promise<PermissionStatus> {
    return Promise.resolve(new PermissionStatus(descriptor.name, 'granted'))
  }
}

export class StorageManager {
  async estimate(): Promise<{ usage: number, quota: number }> {
    return { usage: 0, quota: 1024 * 1024 * 1024 }
  }

  async persist(): Promise<boolean> {
    return true
  }

  async persisted(): Promise<boolean> {
    return true
  }

  async getDirectory(): Promise<never> {
    throw new DOMException('OPFS not supported', 'NotSupportedError')
  }
}

export class PermissionStatus {
  readonly name: string
  state: PermissionState
  // eslint-disable-next-line pickier/no-unused-vars
  onchange: ((event: Event) => void) | null = null

  constructor(name: string, state: PermissionState) {
    this.name = name
    this.state = state
  }
}

type PermissionState = 'granted' | 'denied' | 'prompt'

export class Navigator {
  public clipboard: Clipboard = new Clipboard()
  public geolocation: Geolocation = new Geolocation()
  public permissions: Permissions = new Permissions()
  public storage: StorageManager = new StorageManager()
  public userAgent: string = 'Mozilla/5.0 (X11; Linux x64) AppleWebKit/537.36 (KHTML, like Gecko) VeryHappyDOM/1.0.0'
  public language: string = typeof process !== 'undefined' && process.env?.LANG ? process.env.LANG.split('.')[0].replace('_', '-') : 'en-US'
  public languages: readonly string[] = ['en-US', 'en'] as const
  public platform: string = detectPlatform()
  public cookieEnabled: boolean = true
  public onLine: boolean = true
  public hardwareConcurrency: number = typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator
    ? (navigator as { hardwareConcurrency: number }).hardwareConcurrency
    : 4
  public maxTouchPoints: number = 0
  public vendor: string = ''
  public doNotTrack: string | null = null

  sendBeacon(url: string | URL, data?: BodyInit | null): boolean {
    try {
      globalThis.fetch(url, {
        method: 'POST',
        body: data ?? undefined,
        keepalive: true,
      }).catch(() => {})
      return true
    }
    catch {
      return false
    }
  }
}

type ClipboardItems = ClipboardItem[]
