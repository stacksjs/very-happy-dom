/* eslint-disable no-console */
/**
 * Browser APIs implementation
 * Performance, Geolocation, Notifications, Console, etc.
 */

// Performance API
export class Performance {
  private _marks = new Map<string, number>()
  private _measures = new Map<string, { start: number, duration: number }>()
  private _startTime = Date.now()

  now(): number {
    return Date.now() - this._startTime
  }

  mark(name: string): void {
    this._marks.set(name, this.now())
  }

  measure(name: string, startMark?: string, endMark?: string): void {
    const end = endMark ? this._marks.get(endMark) : this.now()
    const start = startMark ? this._marks.get(startMark) : 0

    if (end !== undefined && start !== undefined) {
      this._measures.set(name, {
        start,
        duration: end - start,
      })
    }
  }

  clearMarks(name?: string): void {
    if (name) {
      this._marks.delete(name)
    }
    else {
      this._marks.clear()
    }
  }

  clearMeasures(name?: string): void {
    if (name) {
      this._measures.delete(name)
    }
    else {
      this._measures.clear()
    }
  }

  getEntriesByName(name: string): any[] {
    const entries = []
    if (this._marks.has(name)) {
      entries.push({ name, entryType: 'mark', startTime: this._marks.get(name) })
    }
    if (this._measures.has(name)) {
      const measure = this._measures.get(name)!
      entries.push({ name, entryType: 'measure', startTime: measure.start, duration: measure.duration })
    }
    return entries
  }
}

// Geolocation API
export class Geolocation {
  getCurrentPosition(
    success: (position: GeolocationPosition) => void,
    _error?: (error: GeolocationPositionError) => void,
    _options?: GeolocationOptions,
  ): void {
    // Mock position
    setTimeout(() => {
      success({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      })
    }, 0)
  }

  watchPosition(
    success: (position: GeolocationPosition) => void,
    _error?: (error: GeolocationPositionError) => void,
    _options?: GeolocationOptions,
  ): number {
    const id = setInterval(() => {
      success({
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      })
    }, 1000)
    return id as unknown as number
  }

  clearWatch(id: number): void {
    clearInterval(id)
  }
}

interface GeolocationPosition {
  coords: GeolocationCoordinates
  timestamp: number
}

interface GeolocationCoordinates {
  latitude: number
  longitude: number
  accuracy: number
  altitude: number | null
  altitudeAccuracy: number | null
  heading: number | null
  speed: number | null
}

interface GeolocationPositionError {
  code: number
  message: string
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

// Notification API
export class Notification {
  static permission: 'default' | 'granted' | 'denied' = 'default'

  public title: string
  public body?: string
  public icon?: string
  public tag?: string

  public onclick: ((event: Event) => void) | null = null
  public onclose: ((event: Event) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  public onshow: ((event: Event) => void) | null = null

  constructor(title: string, options?: NotificationOptions) {
    this.title = title
    this.body = options?.body
    this.icon = options?.icon
    this.tag = options?.tag

    // Simulate show event
    setTimeout(() => {
      if (this.onshow) {
        this.onshow({} as Event)
      }
    }, 0)
  }

  static requestPermission(): Promise<'default' | 'granted' | 'denied'> {
    return Promise.resolve('granted')
  }

  close(): void {
    if (this.onclose) {
      this.onclose({} as Event)
    }
  }
}

interface NotificationOptions {
  body?: string
  icon?: string
  tag?: string
  data?: any
}

// Enhanced Console API
export class EnhancedConsole {
  private _groups: string[] = []
  private _timers = new Map<string, number>()

  log(...args: any[]): void {
    console.log(...this._prefix(), ...args)
  }

  warn(...args: any[]): void {
    console.warn(...this._prefix(), ...args)
  }

  error(...args: any[]): void {
    console.error(...this._prefix(), ...args)
  }

  info(...args: any[]): void {
    console.info(...this._prefix(), ...args)
  }

  debug(...args: any[]): void {
    console.debug(...this._prefix(), ...args)
  }

  table(data: any): void {
    console.table(data)
  }

  group(label?: string): void {
    if (label) {
      this._groups.push(label)
      console.log(...this._prefix(), `▼ ${label}`)
    }
  }

  groupCollapsed(label?: string): void {
    this.group(label)
  }

  groupEnd(): void {
    this._groups.pop()
  }

  time(label: string): void {
    this._timers.set(label, Date.now())
  }

  timeEnd(label: string): void {
    const start = this._timers.get(label)
    if (start) {
      const duration = Date.now() - start
      console.log(...this._prefix(), `${label}: ${duration}ms`)
      this._timers.delete(label)
    }
  }

  timeLog(label: string, ...args: any[]): void {
    const start = this._timers.get(label)
    if (start) {
      const duration = Date.now() - start
      console.log(...this._prefix(), `${label}: ${duration}ms`, ...args)
    }
  }

  clear(): void {
    console.clear()
  }

  count(label = 'default'): void {
    // Simplified - just log
    console.log(...this._prefix(), label)
  }

  assert(condition: boolean, ...args: any[]): void {
    if (!condition) {
      console.error(...this._prefix(), 'Assertion failed:', ...args)
    }
  }

  trace(...args: any[]): void {
    console.trace(...this._prefix(), ...args)
  }

  private _prefix(): string[] {
    return this._groups.map(() => '  ')
  }
}

// DataTransfer for Drag & Drop
export class DataTransfer {
  private _data = new Map<string, string>()
  public dropEffect: 'none' | 'copy' | 'link' | 'move' = 'none'
  public effectAllowed: 'none' | 'copy' | 'copyLink' | 'copyMove' | 'link' | 'linkMove' | 'move' | 'all' | 'uninitialized' = 'uninitialized'
  public files: File[] = []
  public items: DataTransferItemList = [] as any
  public types: string[] = []

  setData(format: string, data: string): void {
    this._data.set(format, data)
    if (!this.types.includes(format)) {
      this.types.push(format)
    }
  }

  getData(format: string): string {
    return this._data.get(format) || ''
  }

  clearData(format?: string): void {
    if (format) {
      this._data.delete(format)
      const index = this.types.indexOf(format)
      if (index !== -1) {
        this.types.splice(index, 1)
      }
    }
    else {
      this._data.clear()
      this.types = []
    }
  }

  setDragImage(_image: Element, _x: number, _y: number): void {
    // No-op in virtual DOM
  }
}

type DataTransferItemList = any[]
