import { VirtualEvent, type VirtualEventInit } from './VirtualEvent'

// ─── UIEvent ─────────────────────────────────────────────────────────

export interface UIEventInit extends VirtualEventInit {
  detail?: number
  view?: any
  which?: number
}

export class UIEvent extends VirtualEvent {
  readonly detail: number
  readonly view: any
  readonly which: number

  constructor(type: string, init: UIEventInit = {}) {
    super(type, init)
    this.detail = init.detail ?? 0
    this.view = init.view ?? null
    this.which = init.which ?? 0
  }
}

// ─── MouseEvent ──────────────────────────────────────────────────────

export interface MouseEventInit extends UIEventInit {
  clientX?: number
  clientY?: number
  screenX?: number
  screenY?: number
  pageX?: number
  pageY?: number
  offsetX?: number
  offsetY?: number
  movementX?: number
  movementY?: number
  button?: number
  buttons?: number
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  relatedTarget?: any
}

export class MouseEvent extends UIEvent {
  readonly clientX: number
  readonly clientY: number
  readonly screenX: number
  readonly screenY: number
  readonly pageX: number
  readonly pageY: number
  readonly offsetX: number
  readonly offsetY: number
  readonly movementX: number
  readonly movementY: number
  readonly button: number
  readonly buttons: number
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
  readonly relatedTarget: any

  constructor(type: string, init: MouseEventInit = {}) {
    super(type, init)
    this.clientX = init.clientX ?? 0
    this.clientY = init.clientY ?? 0
    this.screenX = init.screenX ?? 0
    this.screenY = init.screenY ?? 0
    this.pageX = init.pageX ?? 0
    this.pageY = init.pageY ?? 0
    this.offsetX = init.offsetX ?? 0
    this.offsetY = init.offsetY ?? 0
    this.movementX = init.movementX ?? 0
    this.movementY = init.movementY ?? 0
    this.button = init.button ?? 0
    this.buttons = init.buttons ?? 0
    this.ctrlKey = init.ctrlKey ?? false
    this.shiftKey = init.shiftKey ?? false
    this.altKey = init.altKey ?? false
    this.metaKey = init.metaKey ?? false
    this.relatedTarget = init.relatedTarget ?? null
  }
}

// ─── KeyboardEvent ───────────────────────────────────────────────────

export interface KeyboardEventInit extends UIEventInit {
  key?: string
  code?: string
  location?: number
  repeat?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  isComposing?: boolean
  /** @deprecated */
  charCode?: number
  /** @deprecated */
  keyCode?: number
}

export class KeyboardEvent extends UIEvent {
  readonly key: string
  readonly code: string
  readonly location: number
  readonly repeat: boolean
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
  readonly isComposing: boolean
  /** @deprecated */
  readonly charCode: number
  /** @deprecated */
  readonly keyCode: number

  constructor(type: string, init: KeyboardEventInit = {}) {
    super(type, init)
    this.key = init.key ?? ''
    this.code = init.code ?? ''
    this.location = init.location ?? 0
    this.repeat = init.repeat ?? false
    this.ctrlKey = init.ctrlKey ?? false
    this.shiftKey = init.shiftKey ?? false
    this.altKey = init.altKey ?? false
    this.metaKey = init.metaKey ?? false
    this.isComposing = init.isComposing ?? false
    this.charCode = init.charCode ?? 0
    this.keyCode = init.keyCode ?? 0
  }
}

// ─── FocusEvent ──────────────────────────────────────────────────────

export interface FocusEventInit extends UIEventInit {
  relatedTarget?: any
}

export class FocusEvent extends UIEvent {
  readonly relatedTarget: any

  constructor(type: string, init: FocusEventInit = {}) {
    super(type, init)
    this.relatedTarget = init.relatedTarget ?? null
  }
}

// ─── InputEvent ──────────────────────────────────────────────────────

export interface InputEventInit extends UIEventInit {
  data?: string | null
  inputType?: string
  isComposing?: boolean
  dataTransfer?: any
}

export class InputEvent extends UIEvent {
  readonly data: string | null
  readonly inputType: string
  readonly isComposing: boolean
  readonly dataTransfer: any

  constructor(type: string, init: InputEventInit = {}) {
    super(type, init)
    this.data = init.data ?? null
    this.inputType = init.inputType ?? ''
    this.isComposing = init.isComposing ?? false
    this.dataTransfer = init.dataTransfer ?? null
  }
}

// ─── WheelEvent ──────────────────────────────────────────────────────

export interface WheelEventInit extends MouseEventInit {
  deltaX?: number
  deltaY?: number
  deltaZ?: number
  deltaMode?: number
}

export class WheelEvent extends MouseEvent {
  static readonly DOM_DELTA_PIXEL = 0
  static readonly DOM_DELTA_LINE = 1
  static readonly DOM_DELTA_PAGE = 2

  readonly deltaX: number
  readonly deltaY: number
  readonly deltaZ: number
  readonly deltaMode: number

  constructor(type: string, init: WheelEventInit = {}) {
    super(type, init)
    this.deltaX = init.deltaX ?? 0
    this.deltaY = init.deltaY ?? 0
    this.deltaZ = init.deltaZ ?? 0
    this.deltaMode = init.deltaMode ?? 0
  }
}

// ─── PointerEvent ────────────────────────────────────────────────────

export interface PointerEventInit extends MouseEventInit {
  pointerId?: number
  width?: number
  height?: number
  pressure?: number
  tangentialPressure?: number
  tiltX?: number
  tiltY?: number
  twist?: number
  pointerType?: string
  isPrimary?: boolean
}

export class PointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly width: number
  readonly height: number
  readonly pressure: number
  readonly tangentialPressure: number
  readonly tiltX: number
  readonly tiltY: number
  readonly twist: number
  readonly pointerType: string
  readonly isPrimary: boolean

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 0
    this.width = init.width ?? 1
    this.height = init.height ?? 1
    this.pressure = init.pressure ?? 0
    this.tangentialPressure = init.tangentialPressure ?? 0
    this.tiltX = init.tiltX ?? 0
    this.tiltY = init.tiltY ?? 0
    this.twist = init.twist ?? 0
    this.pointerType = init.pointerType ?? ''
    this.isPrimary = init.isPrimary ?? false
  }
}

// ─── TouchEvent ──────────────────────────────────────────────────────

export interface TouchEventInit extends UIEventInit {
  touches?: any[]
  targetTouches?: any[]
  changedTouches?: any[]
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}

export class TouchEvent extends UIEvent {
  readonly touches: any[]
  readonly targetTouches: any[]
  readonly changedTouches: any[]
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean

  constructor(type: string, init: TouchEventInit = {}) {
    super(type, init)
    this.touches = init.touches ?? []
    this.targetTouches = init.targetTouches ?? []
    this.changedTouches = init.changedTouches ?? []
    this.ctrlKey = init.ctrlKey ?? false
    this.shiftKey = init.shiftKey ?? false
    this.altKey = init.altKey ?? false
    this.metaKey = init.metaKey ?? false
  }
}

// ─── AnimationEvent ──────────────────────────────────────────────────

export interface AnimationEventInit extends VirtualEventInit {
  animationName?: string
  elapsedTime?: number
  pseudoElement?: string
}

export class AnimationEvent extends VirtualEvent {
  readonly animationName: string
  readonly elapsedTime: number
  readonly pseudoElement: string

  constructor(type: string, init: AnimationEventInit = {}) {
    super(type, init)
    this.animationName = init.animationName ?? ''
    this.elapsedTime = init.elapsedTime ?? 0
    this.pseudoElement = init.pseudoElement ?? ''
  }
}

// ─── TransitionEvent ─────────────────────────────────────────────────

export interface TransitionEventInit extends VirtualEventInit {
  propertyName?: string
  elapsedTime?: number
  pseudoElement?: string
}

export class TransitionEvent extends VirtualEvent {
  readonly propertyName: string
  readonly elapsedTime: number
  readonly pseudoElement: string

  constructor(type: string, init: TransitionEventInit = {}) {
    super(type, init)
    this.propertyName = init.propertyName ?? ''
    this.elapsedTime = init.elapsedTime ?? 0
    this.pseudoElement = init.pseudoElement ?? ''
  }
}

// ─── ClipboardEvent ──────────────────────────────────────────────────

export interface ClipboardEventInit extends VirtualEventInit {
  clipboardData?: any
}

export class ClipboardEvent extends VirtualEvent {
  readonly clipboardData: any

  constructor(type: string, init: ClipboardEventInit = {}) {
    super(type, init)
    this.clipboardData = init.clipboardData ?? null
  }
}

// ─── DragEvent ───────────────────────────────────────────────────────

export interface DragEventInit extends MouseEventInit {
  dataTransfer?: any
}

export class DragEvent extends MouseEvent {
  readonly dataTransfer: any

  constructor(type: string, init: DragEventInit = {}) {
    super(type, init)
    this.dataTransfer = init.dataTransfer ?? null
  }
}

// ─── ErrorEvent ──────────────────────────────────────────────────────

export interface ErrorEventInit extends VirtualEventInit {
  message?: string
  filename?: string
  lineno?: number
  colno?: number
  error?: any
}

export class ErrorEvent extends VirtualEvent {
  readonly message: string
  readonly filename: string
  readonly lineno: number
  readonly colno: number
  readonly error: any

  constructor(type: string, init: ErrorEventInit = {}) {
    super(type, init)
    this.message = init.message ?? ''
    this.filename = init.filename ?? ''
    this.lineno = init.lineno ?? 0
    this.colno = init.colno ?? 0
    this.error = init.error ?? null
  }
}

// ─── HashChangeEvent ─────────────────────────────────────────────────

export interface HashChangeEventInit extends VirtualEventInit {
  oldURL?: string
  newURL?: string
}

export class HashChangeEvent extends VirtualEvent {
  readonly oldURL: string
  readonly newURL: string

  constructor(type: string, init: HashChangeEventInit = {}) {
    super(type, init)
    this.oldURL = init.oldURL ?? ''
    this.newURL = init.newURL ?? ''
  }
}

// ─── PopStateEvent ───────────────────────────────────────────────────

export interface PopStateEventInit extends VirtualEventInit {
  state?: any
}

export class PopStateEvent extends VirtualEvent {
  readonly state: any

  constructor(type: string, init: PopStateEventInit = {}) {
    super(type, init)
    this.state = init.state ?? null
  }
}

// ─── ProgressEvent ───────────────────────────────────────────────────

export interface ProgressEventInit extends VirtualEventInit {
  lengthComputable?: boolean
  loaded?: number
  total?: number
}

export class ProgressEvent extends VirtualEvent {
  readonly lengthComputable: boolean
  readonly loaded: number
  readonly total: number

  constructor(type: string, init: ProgressEventInit = {}) {
    super(type, init)
    this.lengthComputable = init.lengthComputable ?? false
    this.loaded = init.loaded ?? 0
    this.total = init.total ?? 0
  }
}

// ─── MessageEvent ────────────────────────────────────────────────────

export interface MessageEventInit extends VirtualEventInit {
  data?: any
  origin?: string
  lastEventId?: string
  source?: any
  ports?: any[]
}

export class MessageEvent extends VirtualEvent {
  readonly data: any
  readonly origin: string
  readonly lastEventId: string
  readonly source: any
  readonly ports: any[]

  constructor(type: string, init: MessageEventInit = {}) {
    super(type, init)
    this.data = init.data ?? null
    this.origin = init.origin ?? ''
    this.lastEventId = init.lastEventId ?? ''
    this.source = init.source ?? null
    this.ports = init.ports ?? []
  }
}

// ─── CloseEvent ──────────────────────────────────────────────────────

export interface CloseEventInit extends VirtualEventInit {
  code?: number
  reason?: string
  wasClean?: boolean
}

export class CloseEvent extends VirtualEvent {
  readonly code: number
  readonly reason: string
  readonly wasClean: boolean

  constructor(type: string, init: CloseEventInit = {}) {
    super(type, init)
    this.code = init.code ?? 0
    this.reason = init.reason ?? ''
    this.wasClean = init.wasClean ?? false
  }
}

// ─── StorageEvent ────────────────────────────────────────────────────

export interface StorageEventInit extends VirtualEventInit {
  key?: string | null
  oldValue?: string | null
  newValue?: string | null
  url?: string
  storageArea?: any
}

export class StorageEvent extends VirtualEvent {
  readonly key: string | null
  readonly oldValue: string | null
  readonly newValue: string | null
  readonly url: string
  readonly storageArea: any

  constructor(type: string, init: StorageEventInit = {}) {
    super(type, init)
    this.key = init.key ?? null
    this.oldValue = init.oldValue ?? null
    this.newValue = init.newValue ?? null
    this.url = init.url ?? ''
    this.storageArea = init.storageArea ?? null
  }
}

// ─── SubmitEvent ─────────────────────────────────────────────────────

export interface SubmitEventInit extends VirtualEventInit {
  submitter?: any
}

export class SubmitEvent extends VirtualEvent {
  readonly submitter: any

  constructor(type: string, init: SubmitEventInit = {}) {
    super(type, init)
    this.submitter = init.submitter ?? null
  }
}

// ─── MediaQueryListEvent ─────────────────────────────────────────────

export interface MediaQueryListEventInit extends VirtualEventInit {
  matches?: boolean
  media?: string
}

export class MediaQueryListEvent extends VirtualEvent {
  readonly matches: boolean
  readonly media: string

  constructor(type: string, init: MediaQueryListEventInit = {}) {
    super(type, init)
    this.matches = init.matches ?? false
    this.media = init.media ?? ''
  }
}

// ─── CompositionEvent ────────────────────────────────────────────────

export interface CompositionEventInit extends UIEventInit {
  data?: string
}

export class CompositionEvent extends UIEvent {
  readonly data: string

  constructor(type: string, init: CompositionEventInit = {}) {
    super(type, init)
    this.data = init.data ?? ''
  }
}

// ─── Touch (standalone class, not an event) ──────────────────────────

export interface TouchInit {
  identifier: number
  target: any
  clientX?: number
  clientY?: number
  screenX?: number
  screenY?: number
  pageX?: number
  pageY?: number
  radiusX?: number
  radiusY?: number
  rotationAngle?: number
  force?: number
}

export class Touch {
  readonly identifier: number
  readonly target: any
  readonly clientX: number
  readonly clientY: number
  readonly screenX: number
  readonly screenY: number
  readonly pageX: number
  readonly pageY: number
  readonly radiusX: number
  readonly radiusY: number
  readonly rotationAngle: number
  readonly force: number

  constructor(init: TouchInit) {
    this.identifier = init.identifier
    this.target = init.target
    this.clientX = init.clientX ?? 0
    this.clientY = init.clientY ?? 0
    this.screenX = init.screenX ?? 0
    this.screenY = init.screenY ?? 0
    this.pageX = init.pageX ?? 0
    this.pageY = init.pageY ?? 0
    this.radiusX = init.radiusX ?? 0
    this.radiusY = init.radiusY ?? 0
    this.rotationAngle = init.rotationAngle ?? 0
    this.force = init.force ?? 0
  }
}
