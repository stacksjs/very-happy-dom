/**
 * File API implementation
 * Provides File, FileReader, and FileList for testing file uploads
 */

/**
 * File implementation
 */
export class VeryHappyFile extends Blob {
  public name: string
  public lastModified: number

  constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
    super(bits, options)
    this.name = name
    this.lastModified = options?.lastModified || Date.now()
  }
}

interface FilePropertyBag extends BlobPropertyBag {
  lastModified?: number
}

/**
 * FileReader implementation
 */
export class VeryHappyFileReader {
  static readonly EMPTY = 0
  static readonly LOADING = 1
  static readonly DONE = 2

  public readyState: number = VeryHappyFileReader.EMPTY
  public result: string | ArrayBuffer | null = null
  public error: Error | null = null

  public onload: ((event: ProgressEvent) => void) | null = null
  public onerror: ((event: ProgressEvent) => void) | null = null
  public onloadstart: ((event: ProgressEvent) => void) | null = null
  public onloadend: ((event: ProgressEvent) => void) | null = null
  public onprogress: ((event: ProgressEvent) => void) | null = null
  public onabort: ((event: ProgressEvent) => void) | null = null

  private _eventListeners = new Map<string, Set<EventListener>>()

  readAsText(blob: Blob, _encoding = 'UTF-8'): void {
    this.readyState = VeryHappyFileReader.LOADING
    this._trigger('loadstart')

    blob.text().then((text) => {
      this.result = text
      this.readyState = VeryHappyFileReader.DONE
      this._trigger('load')
      this._trigger('loadend')
    }).catch((error) => {
      this.error = error
      this.readyState = VeryHappyFileReader.DONE
      this._trigger('error')
      this._trigger('loadend')
    })
  }

  readAsDataURL(blob: Blob): void {
    this.readyState = VeryHappyFileReader.LOADING
    this._trigger('loadstart')

    blob.arrayBuffer().then((buffer) => {
      // eslint-disable-next-line node/prefer-global/buffer
      const base64 = Buffer.from(buffer).toString('base64')
      this.result = `data:${blob.type};base64,${base64}`
      this.readyState = VeryHappyFileReader.DONE
      this._trigger('load')
      this._trigger('loadend')
    }).catch((error) => {
      this.error = error
      this.readyState = VeryHappyFileReader.DONE
      this._trigger('error')
      this._trigger('loadend')
    })
  }

  readAsArrayBuffer(blob: Blob): void {
    this.readyState = VeryHappyFileReader.LOADING
    this._trigger('loadstart')

    blob.arrayBuffer().then((buffer) => {
      this.result = buffer
      this.readyState = VeryHappyFileReader.DONE
      this._trigger('load')
      this._trigger('loadend')
    }).catch((error) => {
      this.error = error
      this.readyState = VeryHappyFileReader.DONE
      this._trigger('error')
      this._trigger('loadend')
    })
  }

  readAsBinaryString(blob: Blob): void {
    this.readyState = VeryHappyFileReader.LOADING
    this._trigger('loadstart')

    blob.arrayBuffer().then((buffer) => {
      this.result = String.fromCharCode(...new Uint8Array(buffer))
      this.readyState = VeryHappyFileReader.DONE
      this._trigger('load')
      this._trigger('loadend')
    }).catch((error) => {
      this.error = error
      this.readyState = VeryHappyFileReader.DONE
      this._trigger('error')
      this._trigger('loadend')
    })
  }

  abort(): void {
    this.readyState = VeryHappyFileReader.DONE
    this._trigger('abort')
    this._trigger('loadend')
  }

  addEventListener(type: string, listener: EventListener): void {
    if (!this._eventListeners.has(type)) {
      this._eventListeners.set(type, new Set())
    }
    this._eventListeners.get(type)!.add(listener)
  }

  removeEventListener(type: string, listener: EventListener): void {
    const listeners = this._eventListeners.get(type)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  private _trigger(type: string): void {
    const event: ProgressEvent = {
      type,
      lengthComputable: false,
      loaded: 0,
      total: 0,
    } as any

    const listeners = this._eventListeners.get(type)
    if (listeners) {
      for (const listener of listeners) {
        listener(event as any)
      }
    }

    const handler = (this as any)[`on${type}`]
    if (handler) {
      handler.call(this, event)
    }
  }
}

/**
 * FileList implementation
 */
export class VeryHappyFileList {
  private _files: File[] = []

  constructor(files: File[] = []) {
    this._files = files
  }

  get length(): number {
    return this._files.length
  }

  item(index: number): File | null {
    return this._files[index] || null
  }

  [Symbol.iterator](): Iterator<File> {
    return this._files[Symbol.iterator]()
  }

  // Array-like access
  [index: number]: File
}

type EventListener = (event: Event) => void

interface ProgressEvent extends Event {
  lengthComputable: boolean
  loaded: number
  total: number
}
