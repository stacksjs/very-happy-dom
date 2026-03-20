import { describe, expect, test } from 'bun:test'
import {
  AnimationEvent,
  ClipboardEvent,
  CloseEvent,
  CompositionEvent,
  DragEvent,
  ErrorEvent,
  FocusEvent,
  HashChangeEvent,
  InputEvent,
  KeyboardEvent,
  MediaQueryListEvent,
  MessageEvent,
  MouseEvent,
  PointerEvent,
  PopStateEvent,
  ProgressEvent,
  StorageEvent,
  SubmitEvent,
  Touch,
  TouchEvent,
  TransitionEvent,
  UIEvent,
  VirtualDocument,
  VirtualEvent,
  WheelEvent,
  Window,
} from '../src'

// =============================================================================
// UIEvent
// =============================================================================
describe('UIEvent', () => {
  test('constructor sets type', () => {
    const event = new UIEvent('resize')
    expect(event.type).toBe('resize')
  })

  test('detail from init', () => {
    const event = new UIEvent('resize', { detail: 5 })
    expect(event.detail).toBe(5)
  })

  test('view from init', () => {
    const fakeView = { name: 'window' }
    const event = new UIEvent('resize', { view: fakeView })
    expect(event.view).toBe(fakeView)
  })

  test('which from init', () => {
    const event = new UIEvent('keypress', { which: 13 })
    expect(event.which).toBe(13)
  })

  test('default detail is 0', () => {
    const event = new UIEvent('resize')
    expect(event.detail).toBe(0)
  })

  test('default view is null', () => {
    const event = new UIEvent('resize')
    expect(event.view).toBeNull()
  })

  test('default which is 0', () => {
    const event = new UIEvent('resize')
    expect(event.which).toBe(0)
  })

  test('inherits VirtualEvent base properties', () => {
    const event = new UIEvent('resize', { bubbles: true, cancelable: true })
    expect(event.bubbles).toBe(true)
    expect(event.cancelable).toBe(true)
  })

  test('extends VirtualEvent', () => {
    const event = new UIEvent('resize')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// MouseEvent
// =============================================================================
describe('MouseEvent', () => {
  test('constructor sets type', () => {
    const event = new MouseEvent('click')
    expect(event.type).toBe('click')
  })

  test('clientX and clientY from init', () => {
    const event = new MouseEvent('click', { clientX: 100, clientY: 200 })
    expect(event.clientX).toBe(100)
    expect(event.clientY).toBe(200)
  })

  test('screenX and screenY from init', () => {
    const event = new MouseEvent('click', { screenX: 300, screenY: 400 })
    expect(event.screenX).toBe(300)
    expect(event.screenY).toBe(400)
  })

  test('pageX and pageY from init', () => {
    const event = new MouseEvent('click', { pageX: 50, pageY: 60 })
    expect(event.pageX).toBe(50)
    expect(event.pageY).toBe(60)
  })

  test('offsetX and offsetY from init', () => {
    const event = new MouseEvent('click', { offsetX: 10, offsetY: 20 })
    expect(event.offsetX).toBe(10)
    expect(event.offsetY).toBe(20)
  })

  test('movementX and movementY from init', () => {
    const event = new MouseEvent('mousemove', { movementX: 5, movementY: -3 })
    expect(event.movementX).toBe(5)
    expect(event.movementY).toBe(-3)
  })

  test('button from init', () => {
    const event = new MouseEvent('click', { button: 2 })
    expect(event.button).toBe(2)
  })

  test('buttons from init', () => {
    const event = new MouseEvent('click', { buttons: 3 })
    expect(event.buttons).toBe(3)
  })

  test('ctrlKey from init', () => {
    const event = new MouseEvent('click', { ctrlKey: true })
    expect(event.ctrlKey).toBe(true)
  })

  test('shiftKey from init', () => {
    const event = new MouseEvent('click', { shiftKey: true })
    expect(event.shiftKey).toBe(true)
  })

  test('altKey from init', () => {
    const event = new MouseEvent('click', { altKey: true })
    expect(event.altKey).toBe(true)
  })

  test('metaKey from init', () => {
    const event = new MouseEvent('click', { metaKey: true })
    expect(event.metaKey).toBe(true)
  })

  test('relatedTarget from init', () => {
    const target = { id: 'other' }
    const event = new MouseEvent('mouseenter', { relatedTarget: target })
    expect(event.relatedTarget).toBe(target)
  })

  test('default values are 0, false, or null', () => {
    const event = new MouseEvent('click')
    expect(event.clientX).toBe(0)
    expect(event.clientY).toBe(0)
    expect(event.screenX).toBe(0)
    expect(event.screenY).toBe(0)
    expect(event.pageX).toBe(0)
    expect(event.pageY).toBe(0)
    expect(event.offsetX).toBe(0)
    expect(event.offsetY).toBe(0)
    expect(event.movementX).toBe(0)
    expect(event.movementY).toBe(0)
    expect(event.button).toBe(0)
    expect(event.buttons).toBe(0)
    expect(event.ctrlKey).toBe(false)
    expect(event.shiftKey).toBe(false)
    expect(event.altKey).toBe(false)
    expect(event.metaKey).toBe(false)
    expect(event.relatedTarget).toBeNull()
  })

  test('inherits detail and view from UIEvent', () => {
    const event = new MouseEvent('click', { detail: 2, view: { name: 'win' } })
    expect(event.detail).toBe(2)
    expect(event.view).toEqual({ name: 'win' })
  })

  test('extends UIEvent', () => {
    const event = new MouseEvent('click')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('extends VirtualEvent', () => {
    const event = new MouseEvent('click')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// KeyboardEvent
// =============================================================================
describe('KeyboardEvent', () => {
  test('constructor sets type', () => {
    const event = new KeyboardEvent('keydown')
    expect(event.type).toBe('keydown')
  })

  test('key from init', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    expect(event.key).toBe('Enter')
  })

  test('code from init', () => {
    const event = new KeyboardEvent('keydown', { code: 'KeyA' })
    expect(event.code).toBe('KeyA')
  })

  test('location from init', () => {
    const event = new KeyboardEvent('keydown', { location: 1 })
    expect(event.location).toBe(1)
  })

  test('repeat from init', () => {
    const event = new KeyboardEvent('keydown', { repeat: true })
    expect(event.repeat).toBe(true)
  })

  test('ctrlKey from init', () => {
    const event = new KeyboardEvent('keydown', { ctrlKey: true })
    expect(event.ctrlKey).toBe(true)
  })

  test('shiftKey from init', () => {
    const event = new KeyboardEvent('keydown', { shiftKey: true })
    expect(event.shiftKey).toBe(true)
  })

  test('altKey from init', () => {
    const event = new KeyboardEvent('keydown', { altKey: true })
    expect(event.altKey).toBe(true)
  })

  test('metaKey from init', () => {
    const event = new KeyboardEvent('keydown', { metaKey: true })
    expect(event.metaKey).toBe(true)
  })

  test('isComposing from init', () => {
    const event = new KeyboardEvent('keydown', { isComposing: true })
    expect(event.isComposing).toBe(true)
  })

  test('deprecated charCode from init', () => {
    const event = new KeyboardEvent('keypress', { charCode: 65 })
    expect(event.charCode).toBe(65)
  })

  test('deprecated keyCode from init', () => {
    const event = new KeyboardEvent('keydown', { keyCode: 13 })
    expect(event.keyCode).toBe(13)
  })

  test('default values', () => {
    const event = new KeyboardEvent('keydown')
    expect(event.key).toBe('')
    expect(event.code).toBe('')
    expect(event.location).toBe(0)
    expect(event.repeat).toBe(false)
    expect(event.ctrlKey).toBe(false)
    expect(event.shiftKey).toBe(false)
    expect(event.altKey).toBe(false)
    expect(event.metaKey).toBe(false)
    expect(event.isComposing).toBe(false)
    expect(event.charCode).toBe(0)
    expect(event.keyCode).toBe(0)
  })

  test('extends UIEvent', () => {
    const event = new KeyboardEvent('keydown')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('inherits detail from UIEvent', () => {
    const event = new KeyboardEvent('keydown', { detail: 1 })
    expect(event.detail).toBe(1)
  })
})

// =============================================================================
// FocusEvent
// =============================================================================
describe('FocusEvent', () => {
  test('constructor sets type', () => {
    const event = new FocusEvent('focus')
    expect(event.type).toBe('focus')
  })

  test('relatedTarget from init', () => {
    const target = { id: 'prev' }
    const event = new FocusEvent('focus', { relatedTarget: target })
    expect(event.relatedTarget).toBe(target)
  })

  test('default relatedTarget is null', () => {
    const event = new FocusEvent('focus')
    expect(event.relatedTarget).toBeNull()
  })

  test('extends UIEvent', () => {
    const event = new FocusEvent('focus')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('extends VirtualEvent', () => {
    const event = new FocusEvent('blur')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// InputEvent
// =============================================================================
describe('InputEvent', () => {
  test('constructor sets type', () => {
    const event = new InputEvent('input')
    expect(event.type).toBe('input')
  })

  test('data from init', () => {
    const event = new InputEvent('input', { data: 'a' })
    expect(event.data).toBe('a')
  })

  test('inputType from init', () => {
    const event = new InputEvent('input', { inputType: 'insertText' })
    expect(event.inputType).toBe('insertText')
  })

  test('isComposing from init', () => {
    const event = new InputEvent('input', { isComposing: true })
    expect(event.isComposing).toBe(true)
  })

  test('dataTransfer from init', () => {
    const dt = { files: [] }
    const event = new InputEvent('input', { dataTransfer: dt })
    expect(event.dataTransfer).toBe(dt)
  })

  test('default values', () => {
    const event = new InputEvent('input')
    expect(event.data).toBeNull()
    expect(event.inputType).toBe('')
    expect(event.isComposing).toBe(false)
    expect(event.dataTransfer).toBeNull()
  })

  test('extends UIEvent', () => {
    const event = new InputEvent('input')
    expect(event).toBeInstanceOf(UIEvent)
  })
})

// =============================================================================
// WheelEvent
// =============================================================================
describe('WheelEvent', () => {
  test('constructor sets type', () => {
    const event = new WheelEvent('wheel')
    expect(event.type).toBe('wheel')
  })

  test('deltaX from init', () => {
    const event = new WheelEvent('wheel', { deltaX: 10 })
    expect(event.deltaX).toBe(10)
  })

  test('deltaY from init', () => {
    const event = new WheelEvent('wheel', { deltaY: -120 })
    expect(event.deltaY).toBe(-120)
  })

  test('deltaZ from init', () => {
    const event = new WheelEvent('wheel', { deltaZ: 5 })
    expect(event.deltaZ).toBe(5)
  })

  test('deltaMode from init', () => {
    const event = new WheelEvent('wheel', { deltaMode: 1 })
    expect(event.deltaMode).toBe(1)
  })

  test('default values', () => {
    const event = new WheelEvent('wheel')
    expect(event.deltaX).toBe(0)
    expect(event.deltaY).toBe(0)
    expect(event.deltaZ).toBe(0)
    expect(event.deltaMode).toBe(0)
  })

  test('static DOM_DELTA constants', () => {
    expect(WheelEvent.DOM_DELTA_PIXEL).toBe(0)
    expect(WheelEvent.DOM_DELTA_LINE).toBe(1)
    expect(WheelEvent.DOM_DELTA_PAGE).toBe(2)
  })

  test('inherits clientX from MouseEvent', () => {
    const event = new WheelEvent('wheel', { clientX: 50, clientY: 75, deltaY: -100 })
    expect(event.clientX).toBe(50)
    expect(event.clientY).toBe(75)
    expect(event.deltaY).toBe(-100)
  })

  test('extends MouseEvent', () => {
    const event = new WheelEvent('wheel')
    expect(event).toBeInstanceOf(MouseEvent)
  })

  test('extends UIEvent', () => {
    const event = new WheelEvent('wheel')
    expect(event).toBeInstanceOf(UIEvent)
  })
})

// =============================================================================
// PointerEvent
// =============================================================================
describe('PointerEvent', () => {
  test('constructor sets type', () => {
    const event = new PointerEvent('pointerdown')
    expect(event.type).toBe('pointerdown')
  })

  test('pointerId from init', () => {
    const event = new PointerEvent('pointerdown', { pointerId: 42 })
    expect(event.pointerId).toBe(42)
  })

  test('width and height from init', () => {
    const event = new PointerEvent('pointerdown', { width: 25, height: 30 })
    expect(event.width).toBe(25)
    expect(event.height).toBe(30)
  })

  test('default width and height is 1', () => {
    const event = new PointerEvent('pointerdown')
    expect(event.width).toBe(1)
    expect(event.height).toBe(1)
  })

  test('pressure from init', () => {
    const event = new PointerEvent('pointerdown', { pressure: 0.5 })
    expect(event.pressure).toBe(0.5)
  })

  test('tangentialPressure from init', () => {
    const event = new PointerEvent('pointerdown', { tangentialPressure: 0.3 })
    expect(event.tangentialPressure).toBe(0.3)
  })

  test('tiltX and tiltY from init', () => {
    const event = new PointerEvent('pointerdown', { tiltX: 15, tiltY: -10 })
    expect(event.tiltX).toBe(15)
    expect(event.tiltY).toBe(-10)
  })

  test('twist from init', () => {
    const event = new PointerEvent('pointerdown', { twist: 90 })
    expect(event.twist).toBe(90)
  })

  test('pointerType from init', () => {
    const event = new PointerEvent('pointerdown', { pointerType: 'pen' })
    expect(event.pointerType).toBe('pen')
  })

  test('isPrimary from init', () => {
    const event = new PointerEvent('pointerdown', { isPrimary: true })
    expect(event.isPrimary).toBe(true)
  })

  test('default values', () => {
    const event = new PointerEvent('pointerdown')
    expect(event.pointerId).toBe(0)
    expect(event.pressure).toBe(0)
    expect(event.tangentialPressure).toBe(0)
    expect(event.tiltX).toBe(0)
    expect(event.tiltY).toBe(0)
    expect(event.twist).toBe(0)
    expect(event.pointerType).toBe('')
    expect(event.isPrimary).toBe(false)
  })

  test('extends MouseEvent', () => {
    const event = new PointerEvent('pointerdown')
    expect(event).toBeInstanceOf(MouseEvent)
  })

  test('inherits clientX from MouseEvent', () => {
    const event = new PointerEvent('pointerdown', { clientX: 100, pointerId: 1 })
    expect(event.clientX).toBe(100)
    expect(event.pointerId).toBe(1)
  })
})

// =============================================================================
// TouchEvent
// =============================================================================
describe('TouchEvent', () => {
  test('constructor sets type', () => {
    const event = new TouchEvent('touchstart')
    expect(event.type).toBe('touchstart')
  })

  test('touches array from init', () => {
    const touchList = [{ identifier: 0, clientX: 10 }]
    const event = new TouchEvent('touchstart', { touches: touchList })
    expect(event.touches).toEqual(touchList)
  })

  test('targetTouches array from init', () => {
    const touchList = [{ identifier: 1, clientX: 20 }]
    const event = new TouchEvent('touchstart', { targetTouches: touchList })
    expect(event.targetTouches).toEqual(touchList)
  })

  test('changedTouches array from init', () => {
    const touchList = [{ identifier: 2, clientX: 30 }]
    const event = new TouchEvent('touchstart', { changedTouches: touchList })
    expect(event.changedTouches).toEqual(touchList)
  })

  test('ctrlKey from init', () => {
    const event = new TouchEvent('touchstart', { ctrlKey: true })
    expect(event.ctrlKey).toBe(true)
  })

  test('shiftKey from init', () => {
    const event = new TouchEvent('touchstart', { shiftKey: true })
    expect(event.shiftKey).toBe(true)
  })

  test('altKey from init', () => {
    const event = new TouchEvent('touchstart', { altKey: true })
    expect(event.altKey).toBe(true)
  })

  test('metaKey from init', () => {
    const event = new TouchEvent('touchstart', { metaKey: true })
    expect(event.metaKey).toBe(true)
  })

  test('default values', () => {
    const event = new TouchEvent('touchstart')
    expect(event.touches).toEqual([])
    expect(event.targetTouches).toEqual([])
    expect(event.changedTouches).toEqual([])
    expect(event.ctrlKey).toBe(false)
    expect(event.shiftKey).toBe(false)
    expect(event.altKey).toBe(false)
    expect(event.metaKey).toBe(false)
  })

  test('extends UIEvent', () => {
    const event = new TouchEvent('touchstart')
    expect(event).toBeInstanceOf(UIEvent)
  })
})

// =============================================================================
// AnimationEvent
// =============================================================================
describe('AnimationEvent', () => {
  test('constructor sets type', () => {
    const event = new AnimationEvent('animationstart')
    expect(event.type).toBe('animationstart')
  })

  test('animationName from init', () => {
    const event = new AnimationEvent('animationstart', { animationName: 'fadeIn' })
    expect(event.animationName).toBe('fadeIn')
  })

  test('elapsedTime from init', () => {
    const event = new AnimationEvent('animationend', { elapsedTime: 1.5 })
    expect(event.elapsedTime).toBe(1.5)
  })

  test('pseudoElement from init', () => {
    const event = new AnimationEvent('animationstart', { pseudoElement: '::before' })
    expect(event.pseudoElement).toBe('::before')
  })

  test('default values', () => {
    const event = new AnimationEvent('animationstart')
    expect(event.animationName).toBe('')
    expect(event.elapsedTime).toBe(0)
    expect(event.pseudoElement).toBe('')
  })

  test('extends VirtualEvent (not UIEvent)', () => {
    const event = new AnimationEvent('animationstart')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// TransitionEvent
// =============================================================================
describe('TransitionEvent', () => {
  test('constructor sets type', () => {
    const event = new TransitionEvent('transitionend')
    expect(event.type).toBe('transitionend')
  })

  test('propertyName from init', () => {
    const event = new TransitionEvent('transitionend', { propertyName: 'opacity' })
    expect(event.propertyName).toBe('opacity')
  })

  test('elapsedTime from init', () => {
    const event = new TransitionEvent('transitionend', { elapsedTime: 0.3 })
    expect(event.elapsedTime).toBe(0.3)
  })

  test('pseudoElement from init', () => {
    const event = new TransitionEvent('transitionend', { pseudoElement: '::after' })
    expect(event.pseudoElement).toBe('::after')
  })

  test('default values', () => {
    const event = new TransitionEvent('transitionend')
    expect(event.propertyName).toBe('')
    expect(event.elapsedTime).toBe(0)
    expect(event.pseudoElement).toBe('')
  })

  test('extends VirtualEvent', () => {
    const event = new TransitionEvent('transitionend')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// ClipboardEvent
// =============================================================================
describe('ClipboardEvent', () => {
  test('constructor sets type', () => {
    const event = new ClipboardEvent('copy')
    expect(event.type).toBe('copy')
  })

  test('clipboardData from init', () => {
    const data = { getData: () => 'text' }
    const event = new ClipboardEvent('paste', { clipboardData: data })
    expect(event.clipboardData).toBe(data)
  })

  test('default clipboardData is null', () => {
    const event = new ClipboardEvent('copy')
    expect(event.clipboardData).toBeNull()
  })

  test('extends VirtualEvent', () => {
    const event = new ClipboardEvent('copy')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// DragEvent
// =============================================================================
describe('DragEvent', () => {
  test('constructor sets type', () => {
    const event = new DragEvent('dragstart')
    expect(event.type).toBe('dragstart')
  })

  test('dataTransfer from init', () => {
    const dt = { files: [], items: [] }
    const event = new DragEvent('drop', { dataTransfer: dt })
    expect(event.dataTransfer).toBe(dt)
  })

  test('default dataTransfer is null', () => {
    const event = new DragEvent('dragstart')
    expect(event.dataTransfer).toBeNull()
  })

  test('extends MouseEvent', () => {
    const event = new DragEvent('dragstart')
    expect(event).toBeInstanceOf(MouseEvent)
  })

  test('inherits clientX from MouseEvent', () => {
    const event = new DragEvent('drag', { clientX: 50, clientY: 75 })
    expect(event.clientX).toBe(50)
    expect(event.clientY).toBe(75)
  })

  test('extends UIEvent', () => {
    const event = new DragEvent('dragstart')
    expect(event).toBeInstanceOf(UIEvent)
  })
})

// =============================================================================
// ErrorEvent
// =============================================================================
describe('ErrorEvent', () => {
  test('constructor sets type', () => {
    const event = new ErrorEvent('error')
    expect(event.type).toBe('error')
  })

  test('message from init', () => {
    const event = new ErrorEvent('error', { message: 'Something went wrong' })
    expect(event.message).toBe('Something went wrong')
  })

  test('filename from init', () => {
    const event = new ErrorEvent('error', { filename: 'app.js' })
    expect(event.filename).toBe('app.js')
  })

  test('lineno from init', () => {
    const event = new ErrorEvent('error', { lineno: 42 })
    expect(event.lineno).toBe(42)
  })

  test('colno from init', () => {
    const event = new ErrorEvent('error', { colno: 10 })
    expect(event.colno).toBe(10)
  })

  test('error from init', () => {
    const err = new TypeError('bad type')
    const event = new ErrorEvent('error', { error: err })
    expect(event.error).toBe(err)
  })

  test('default values', () => {
    const event = new ErrorEvent('error')
    expect(event.message).toBe('')
    expect(event.filename).toBe('')
    expect(event.lineno).toBe(0)
    expect(event.colno).toBe(0)
    expect(event.error).toBeNull()
  })

  test('extends VirtualEvent', () => {
    const event = new ErrorEvent('error')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// HashChangeEvent
// =============================================================================
describe('HashChangeEvent', () => {
  test('constructor sets type', () => {
    const event = new HashChangeEvent('hashchange')
    expect(event.type).toBe('hashchange')
  })

  test('oldURL from init', () => {
    const event = new HashChangeEvent('hashchange', { oldURL: 'http://example.com/#old' })
    expect(event.oldURL).toBe('http://example.com/#old')
  })

  test('newURL from init', () => {
    const event = new HashChangeEvent('hashchange', { newURL: 'http://example.com/#new' })
    expect(event.newURL).toBe('http://example.com/#new')
  })

  test('default values', () => {
    const event = new HashChangeEvent('hashchange')
    expect(event.oldURL).toBe('')
    expect(event.newURL).toBe('')
  })

  test('extends VirtualEvent', () => {
    const event = new HashChangeEvent('hashchange')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// PopStateEvent
// =============================================================================
describe('PopStateEvent', () => {
  test('constructor sets type', () => {
    const event = new PopStateEvent('popstate')
    expect(event.type).toBe('popstate')
  })

  test('state from init', () => {
    const state = { page: 2, section: 'about' }
    const event = new PopStateEvent('popstate', { state })
    expect(event.state).toBe(state)
  })

  test('default state is null', () => {
    const event = new PopStateEvent('popstate')
    expect(event.state).toBeNull()
  })

  test('extends VirtualEvent', () => {
    const event = new PopStateEvent('popstate')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// ProgressEvent
// =============================================================================
describe('ProgressEvent', () => {
  test('constructor sets type', () => {
    const event = new ProgressEvent('progress')
    expect(event.type).toBe('progress')
  })

  test('lengthComputable from init', () => {
    const event = new ProgressEvent('progress', { lengthComputable: true })
    expect(event.lengthComputable).toBe(true)
  })

  test('loaded from init', () => {
    const event = new ProgressEvent('progress', { loaded: 500 })
    expect(event.loaded).toBe(500)
  })

  test('total from init', () => {
    const event = new ProgressEvent('progress', { total: 1000 })
    expect(event.total).toBe(1000)
  })

  test('default values', () => {
    const event = new ProgressEvent('progress')
    expect(event.lengthComputable).toBe(false)
    expect(event.loaded).toBe(0)
    expect(event.total).toBe(0)
  })

  test('extends VirtualEvent', () => {
    const event = new ProgressEvent('progress')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// MessageEvent
// =============================================================================
describe('MessageEvent', () => {
  test('constructor sets type', () => {
    const event = new MessageEvent('message')
    expect(event.type).toBe('message')
  })

  test('data from init', () => {
    const event = new MessageEvent('message', { data: { hello: 'world' } })
    expect(event.data).toEqual({ hello: 'world' })
  })

  test('origin from init', () => {
    const event = new MessageEvent('message', { origin: 'http://example.com' })
    expect(event.origin).toBe('http://example.com')
  })

  test('lastEventId from init', () => {
    const event = new MessageEvent('message', { lastEventId: 'evt-123' })
    expect(event.lastEventId).toBe('evt-123')
  })

  test('source from init', () => {
    const src = { postMessage: () => {} }
    const event = new MessageEvent('message', { source: src })
    expect(event.source).toBe(src)
  })

  test('ports from init', () => {
    const ports = [{ postMessage: () => {} }]
    const event = new MessageEvent('message', { ports })
    expect(event.ports).toBe(ports)
  })

  test('default values', () => {
    const event = new MessageEvent('message')
    expect(event.data).toBeNull()
    expect(event.origin).toBe('')
    expect(event.lastEventId).toBe('')
    expect(event.source).toBeNull()
    expect(event.ports).toEqual([])
  })

  test('extends VirtualEvent', () => {
    const event = new MessageEvent('message')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// CloseEvent
// =============================================================================
describe('CloseEvent', () => {
  test('constructor sets type', () => {
    const event = new CloseEvent('close')
    expect(event.type).toBe('close')
  })

  test('code from init', () => {
    const event = new CloseEvent('close', { code: 1000 })
    expect(event.code).toBe(1000)
  })

  test('reason from init', () => {
    const event = new CloseEvent('close', { reason: 'Normal closure' })
    expect(event.reason).toBe('Normal closure')
  })

  test('wasClean from init', () => {
    const event = new CloseEvent('close', { wasClean: true })
    expect(event.wasClean).toBe(true)
  })

  test('default values', () => {
    const event = new CloseEvent('close')
    expect(event.code).toBe(0)
    expect(event.reason).toBe('')
    expect(event.wasClean).toBe(false)
  })

  test('extends VirtualEvent', () => {
    const event = new CloseEvent('close')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// StorageEvent
// =============================================================================
describe('StorageEvent', () => {
  test('constructor sets type', () => {
    const event = new StorageEvent('storage')
    expect(event.type).toBe('storage')
  })

  test('key from init', () => {
    const event = new StorageEvent('storage', { key: 'myKey' })
    expect(event.key).toBe('myKey')
  })

  test('oldValue from init', () => {
    const event = new StorageEvent('storage', { oldValue: 'old' })
    expect(event.oldValue).toBe('old')
  })

  test('newValue from init', () => {
    const event = new StorageEvent('storage', { newValue: 'new' })
    expect(event.newValue).toBe('new')
  })

  test('url from init', () => {
    const event = new StorageEvent('storage', { url: 'http://example.com' })
    expect(event.url).toBe('http://example.com')
  })

  test('storageArea from init', () => {
    const storage = { getItem: () => null }
    const event = new StorageEvent('storage', { storageArea: storage })
    expect(event.storageArea).toBe(storage)
  })

  test('default values', () => {
    const event = new StorageEvent('storage')
    expect(event.key).toBeNull()
    expect(event.oldValue).toBeNull()
    expect(event.newValue).toBeNull()
    expect(event.url).toBe('')
    expect(event.storageArea).toBeNull()
  })

  test('extends VirtualEvent', () => {
    const event = new StorageEvent('storage')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// SubmitEvent
// =============================================================================
describe('SubmitEvent', () => {
  test('constructor sets type', () => {
    const event = new SubmitEvent('submit')
    expect(event.type).toBe('submit')
  })

  test('submitter from init', () => {
    const button = { tagName: 'BUTTON' }
    const event = new SubmitEvent('submit', { submitter: button })
    expect(event.submitter).toBe(button)
  })

  test('default submitter is null', () => {
    const event = new SubmitEvent('submit')
    expect(event.submitter).toBeNull()
  })

  test('extends VirtualEvent', () => {
    const event = new SubmitEvent('submit')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// MediaQueryListEvent
// =============================================================================
describe('MediaQueryListEvent', () => {
  test('constructor sets type', () => {
    const event = new MediaQueryListEvent('change')
    expect(event.type).toBe('change')
  })

  test('matches from init', () => {
    const event = new MediaQueryListEvent('change', { matches: true })
    expect(event.matches).toBe(true)
  })

  test('media from init', () => {
    const event = new MediaQueryListEvent('change', { media: '(max-width: 600px)' })
    expect(event.media).toBe('(max-width: 600px)')
  })

  test('default values', () => {
    const event = new MediaQueryListEvent('change')
    expect(event.matches).toBe(false)
    expect(event.media).toBe('')
  })

  test('extends VirtualEvent', () => {
    const event = new MediaQueryListEvent('change')
    expect(event).toBeInstanceOf(VirtualEvent)
  })
})

// =============================================================================
// CompositionEvent
// =============================================================================
describe('CompositionEvent', () => {
  test('constructor sets type', () => {
    const event = new CompositionEvent('compositionstart')
    expect(event.type).toBe('compositionstart')
  })

  test('data from init', () => {
    const event = new CompositionEvent('compositionupdate', { data: 'abc' })
    expect(event.data).toBe('abc')
  })

  test('default data is empty string', () => {
    const event = new CompositionEvent('compositionstart')
    expect(event.data).toBe('')
  })

  test('extends UIEvent', () => {
    const event = new CompositionEvent('compositionstart')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('inherits detail from UIEvent', () => {
    const event = new CompositionEvent('compositionend', { detail: 3 })
    expect(event.detail).toBe(3)
  })
})

// =============================================================================
// Touch class
// =============================================================================
describe('Touch', () => {
  test('identifier from init', () => {
    const touch = new Touch({ identifier: 1, target: null })
    expect(touch.identifier).toBe(1)
  })

  test('target from init', () => {
    const target = { tagName: 'DIV' }
    const touch = new Touch({ identifier: 0, target })
    expect(touch.target).toBe(target)
  })

  test('clientX and clientY from init', () => {
    const touch = new Touch({ identifier: 0, target: null, clientX: 100, clientY: 200 })
    expect(touch.clientX).toBe(100)
    expect(touch.clientY).toBe(200)
  })

  test('screenX and screenY from init', () => {
    const touch = new Touch({ identifier: 0, target: null, screenX: 300, screenY: 400 })
    expect(touch.screenX).toBe(300)
    expect(touch.screenY).toBe(400)
  })

  test('pageX and pageY from init', () => {
    const touch = new Touch({ identifier: 0, target: null, pageX: 50, pageY: 60 })
    expect(touch.pageX).toBe(50)
    expect(touch.pageY).toBe(60)
  })

  test('radiusX and radiusY from init', () => {
    const touch = new Touch({ identifier: 0, target: null, radiusX: 11, radiusY: 22 })
    expect(touch.radiusX).toBe(11)
    expect(touch.radiusY).toBe(22)
  })

  test('rotationAngle from init', () => {
    const touch = new Touch({ identifier: 0, target: null, rotationAngle: 45 })
    expect(touch.rotationAngle).toBe(45)
  })

  test('force from init', () => {
    const touch = new Touch({ identifier: 0, target: null, force: 0.8 })
    expect(touch.force).toBe(0.8)
  })

  test('default optional values are 0', () => {
    const touch = new Touch({ identifier: 0, target: null })
    expect(touch.clientX).toBe(0)
    expect(touch.clientY).toBe(0)
    expect(touch.screenX).toBe(0)
    expect(touch.screenY).toBe(0)
    expect(touch.pageX).toBe(0)
    expect(touch.pageY).toBe(0)
    expect(touch.radiusX).toBe(0)
    expect(touch.radiusY).toBe(0)
    expect(touch.rotationAngle).toBe(0)
    expect(touch.force).toBe(0)
  })
})

// =============================================================================
// Integration with Window
// =============================================================================
describe('Integration with Window', () => {
  test('new window.MouseEvent creates a MouseEvent', () => {
    const window = new Window()
    const event = new window.MouseEvent('click', { clientX: 10 })
    expect(event.type).toBe('click')
    expect(event.clientX).toBe(10)
    expect(event).toBeInstanceOf(MouseEvent)
  })

  test('new window.KeyboardEvent creates a KeyboardEvent', () => {
    const window = new Window()
    const event = new window.KeyboardEvent('keydown', { key: 'Enter' })
    expect(event.type).toBe('keydown')
    expect(event.key).toBe('Enter')
    expect(event).toBeInstanceOf(KeyboardEvent)
  })

  test('new window.PointerEvent creates a PointerEvent', () => {
    const window = new Window()
    const event = new window.PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch' })
    expect(event.pointerId).toBe(1)
    expect(event.pointerType).toBe('touch')
    expect(event).toBeInstanceOf(PointerEvent)
  })

  test('new window.Touch creates a Touch', () => {
    const window = new Window()
    const touch = new window.Touch({ identifier: 0, target: null, clientX: 55 })
    expect(touch.identifier).toBe(0)
    expect(touch.clientX).toBe(55)
  })

  test('events can be dispatched on elements', () => {
    const window = new Window()
    const doc = window.document
    const div = doc.createElement('div')
    let received = false
    div.addEventListener('click', () => {
      received = true
    })
    const event = new window.MouseEvent('click', { bubbles: true })
    div.dispatchEvent(event)
    expect(received).toBe(true)
  })

  test('document.createEvent MouseEvents returns MouseEvent instance', () => {
    const doc = new VirtualDocument()
    const event = doc.createEvent('MouseEvents')
    expect(event).toBeInstanceOf(MouseEvent)
  })

  test('document.createEvent MouseEvent returns MouseEvent instance', () => {
    const doc = new VirtualDocument()
    const event = doc.createEvent('MouseEvent')
    expect(event).toBeInstanceOf(MouseEvent)
  })

  test('document.createEvent KeyboardEvent returns KeyboardEvent instance', () => {
    const doc = new VirtualDocument()
    const event = doc.createEvent('KeyboardEvent')
    expect(event).toBeInstanceOf(KeyboardEvent)
  })

  test('document.createEvent UIEvent returns UIEvent instance', () => {
    const doc = new VirtualDocument()
    const event = doc.createEvent('UIEvent')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('document.createEvent UIEvents returns UIEvent instance', () => {
    const doc = new VirtualDocument()
    const event = doc.createEvent('UIEvents')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('document.createEvent FocusEvent returns FocusEvent instance', () => {
    const doc = new VirtualDocument()
    const event = doc.createEvent('FocusEvent')
    expect(event).toBeInstanceOf(FocusEvent)
  })
})

// =============================================================================
// Inheritance chain
// =============================================================================
describe('Inheritance chain', () => {
  test('MouseEvent is instanceof UIEvent', () => {
    const event = new MouseEvent('click')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('MouseEvent is instanceof VirtualEvent', () => {
    const event = new MouseEvent('click')
    expect(event).toBeInstanceOf(VirtualEvent)
  })

  test('WheelEvent is instanceof MouseEvent', () => {
    const event = new WheelEvent('wheel')
    expect(event).toBeInstanceOf(MouseEvent)
  })

  test('WheelEvent is instanceof UIEvent', () => {
    const event = new WheelEvent('wheel')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('PointerEvent is instanceof MouseEvent', () => {
    const event = new PointerEvent('pointerdown')
    expect(event).toBeInstanceOf(MouseEvent)
  })

  test('PointerEvent is instanceof UIEvent', () => {
    const event = new PointerEvent('pointerdown')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('DragEvent is instanceof MouseEvent', () => {
    const event = new DragEvent('dragstart')
    expect(event).toBeInstanceOf(MouseEvent)
  })

  test('DragEvent is instanceof UIEvent', () => {
    const event = new DragEvent('dragstart')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('FocusEvent is instanceof UIEvent', () => {
    const event = new FocusEvent('focus')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('InputEvent is instanceof UIEvent', () => {
    const event = new InputEvent('input')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('TouchEvent is instanceof UIEvent', () => {
    const event = new TouchEvent('touchstart')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('CompositionEvent is instanceof UIEvent', () => {
    const event = new CompositionEvent('compositionstart')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('KeyboardEvent is instanceof UIEvent', () => {
    const event = new KeyboardEvent('keydown')
    expect(event).toBeInstanceOf(UIEvent)
  })

  test('all event classes extend VirtualEvent', () => {
    expect(new AnimationEvent('x')).toBeInstanceOf(VirtualEvent)
    expect(new TransitionEvent('x')).toBeInstanceOf(VirtualEvent)
    expect(new ClipboardEvent('x')).toBeInstanceOf(VirtualEvent)
    expect(new ErrorEvent('x')).toBeInstanceOf(VirtualEvent)
    expect(new HashChangeEvent('x')).toBeInstanceOf(VirtualEvent)
    expect(new PopStateEvent('x')).toBeInstanceOf(VirtualEvent)
    expect(new ProgressEvent('x')).toBeInstanceOf(VirtualEvent)
    expect(new MessageEvent('x')).toBeInstanceOf(VirtualEvent)
    expect(new CloseEvent('x')).toBeInstanceOf(VirtualEvent)
    expect(new StorageEvent('x')).toBeInstanceOf(VirtualEvent)
    expect(new SubmitEvent('x')).toBeInstanceOf(VirtualEvent)
    expect(new MediaQueryListEvent('x')).toBeInstanceOf(VirtualEvent)
  })
})
