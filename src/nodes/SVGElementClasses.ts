import { VirtualSVGElement } from './VirtualSVGElement'

// SVG Element subclasses - lightweight aliases for drop-in compatibility with happy-dom/jsdom.
// very-happy-dom uses a single VirtualSVGElement class internally, but user code may rely on
// `instanceof window.SVGSVGElement` or similar, so we expose these.

// Core SVG elements
export class SVGSVGElement extends VirtualSVGElement {
  constructor() { super('svg') }
}
export class SVGGraphicsElement extends VirtualSVGElement {
  constructor() { super('g') }
}
export class SVGGeometryElement extends VirtualSVGElement {
  constructor() { super('path') }
}
export class SVGAnimationElement extends VirtualSVGElement {
  constructor() { super('animate') }
}

// Concrete SVG elements
export class SVGCircleElement extends VirtualSVGElement {
  constructor() { super('circle') }
}
export class SVGClipPathElement extends VirtualSVGElement {
  constructor() { super('clipPath') }
}
export class SVGDefsElement extends VirtualSVGElement {
  constructor() { super('defs') }
}
export class SVGDescElement extends VirtualSVGElement {
  constructor() { super('desc') }
}
export class SVGEllipseElement extends VirtualSVGElement {
  constructor() { super('ellipse') }
}
export class SVGFilterElement extends VirtualSVGElement {
  constructor() { super('filter') }
}
export class SVGForeignObjectElement extends VirtualSVGElement {
  constructor() { super('foreignObject') }
}
export class SVGGElement extends VirtualSVGElement {
  constructor() { super('g') }
}
export class SVGImageElement extends VirtualSVGElement {
  constructor() { super('image') }
}
export class SVGLineElement extends VirtualSVGElement {
  constructor() { super('line') }
}
export class SVGLinearGradientElement extends VirtualSVGElement {
  constructor() { super('linearGradient') }
}
export class SVGMarkerElement extends VirtualSVGElement {
  constructor() { super('marker') }
}
export class SVGMaskElement extends VirtualSVGElement {
  constructor() { super('mask') }
}
export class SVGMetadataElement extends VirtualSVGElement {
  constructor() { super('metadata') }
}
export class SVGPathElement extends VirtualSVGElement {
  constructor() { super('path') }
}
export class SVGPatternElement extends VirtualSVGElement {
  constructor() { super('pattern') }
}
export class SVGPolygonElement extends VirtualSVGElement {
  constructor() { super('polygon') }
}
export class SVGPolylineElement extends VirtualSVGElement {
  constructor() { super('polyline') }
}
export class SVGRadialGradientElement extends VirtualSVGElement {
  constructor() { super('radialGradient') }
}
export class SVGRectElement extends VirtualSVGElement {
  constructor() { super('rect') }
}
export class SVGScriptElement extends VirtualSVGElement {
  constructor() { super('script') }
}
export class SVGStopElement extends VirtualSVGElement {
  constructor() { super('stop') }
}
export class SVGStyleElement extends VirtualSVGElement {
  constructor() { super('style') }
}
export class SVGSwitchElement extends VirtualSVGElement {
  constructor() { super('switch') }
}
export class SVGSymbolElement extends VirtualSVGElement {
  constructor() { super('symbol') }
}
export class SVGTextElement extends VirtualSVGElement {
  constructor() { super('text') }
}
export class SVGTextPathElement extends VirtualSVGElement {
  constructor() { super('textPath') }
}
export class SVGTitleElement extends VirtualSVGElement {
  constructor() { super('title') }
}
export class SVGTSpanElement extends VirtualSVGElement {
  constructor() { super('tspan') }
}
export class SVGUseElement extends VirtualSVGElement {
  constructor() { super('use') }
}
export class SVGViewElement extends VirtualSVGElement {
  constructor() { super('view') }
}

// SVG Filter Effect elements
export class SVGFEBlendElement extends VirtualSVGElement {
  constructor() { super('feBlend') }
}
export class SVGFEColorMatrixElement extends VirtualSVGElement {
  constructor() { super('feColorMatrix') }
}
export class SVGFEComponentTransferElement extends VirtualSVGElement {
  constructor() { super('feComponentTransfer') }
}
export class SVGFECompositeElement extends VirtualSVGElement {
  constructor() { super('feComposite') }
}
export class SVGFEConvolveMatrixElement extends VirtualSVGElement {
  constructor() { super('feConvolveMatrix') }
}
export class SVGFEDiffuseLightingElement extends VirtualSVGElement {
  constructor() { super('feDiffuseLighting') }
}
export class SVGFEDisplacementMapElement extends VirtualSVGElement {
  constructor() { super('feDisplacementMap') }
}
export class SVGFEDistantLightElement extends VirtualSVGElement {
  constructor() { super('feDistantLight') }
}
export class SVGFEFloodElement extends VirtualSVGElement {
  constructor() { super('feFlood') }
}
export class SVGFEGaussianBlurElement extends VirtualSVGElement {
  constructor() { super('feGaussianBlur') }
}
export class SVGFEImageElement extends VirtualSVGElement {
  constructor() { super('feImage') }
}
export class SVGFEMergeElement extends VirtualSVGElement {
  constructor() { super('feMerge') }
}
export class SVGFEMergeNodeElement extends VirtualSVGElement {
  constructor() { super('feMergeNode') }
}
export class SVGFEMorphologyElement extends VirtualSVGElement {
  constructor() { super('feMorphology') }
}
export class SVGFEOffsetElement extends VirtualSVGElement {
  constructor() { super('feOffset') }
}
export class SVGFEPointLightElement extends VirtualSVGElement {
  constructor() { super('fePointLight') }
}
export class SVGFESpecularLightingElement extends VirtualSVGElement {
  constructor() { super('feSpecularLighting') }
}
export class SVGFESpotLightElement extends VirtualSVGElement {
  constructor() { super('feSpotLight') }
}
export class SVGFETileElement extends VirtualSVGElement {
  constructor() { super('feTile') }
}
export class SVGFETurbulenceElement extends VirtualSVGElement {
  constructor() { super('feTurbulence') }
}

// SVG Data classes - lightweight stubs for browser API compatibility

export class SVGAngle {
  static readonly SVG_ANGLETYPE_UNKNOWN = 0
  static readonly SVG_ANGLETYPE_UNSPECIFIED = 1
  static readonly SVG_ANGLETYPE_DEG = 2
  static readonly SVG_ANGLETYPE_RAD = 3
  static readonly SVG_ANGLETYPE_GRAD = 4
  unitType: number = 0
  value: number = 0
  valueInSpecifiedUnits: number = 0
  valueAsString: string = '0'
}

export class SVGLength {
  static readonly SVG_LENGTHTYPE_UNKNOWN = 0
  static readonly SVG_LENGTHTYPE_NUMBER = 1
  static readonly SVG_LENGTHTYPE_PERCENTAGE = 2
  static readonly SVG_LENGTHTYPE_PX = 5
  unitType: number = 0
  value: number = 0
  valueInSpecifiedUnits: number = 0
  valueAsString: string = '0'
}

export class SVGNumber {
  value: number = 0
}

export class SVGPoint {
  x: number = 0
  y: number = 0
}

export class SVGRect {
  x: number = 0
  y: number = 0
  width: number = 0
  height: number = 0
}

export class SVGMatrix {
  a: number = 1
  b: number = 0
  c: number = 0
  d: number = 1
  e: number = 0
  f: number = 0
}

export class SVGTransform {
  static readonly SVG_TRANSFORM_UNKNOWN = 0
  static readonly SVG_TRANSFORM_MATRIX = 1
  static readonly SVG_TRANSFORM_TRANSLATE = 2
  static readonly SVG_TRANSFORM_SCALE = 3
  static readonly SVG_TRANSFORM_ROTATE = 4
  static readonly SVG_TRANSFORM_SKEWX = 5
  static readonly SVG_TRANSFORM_SKEWY = 6
  type: number = 0
  matrix: SVGMatrix = new SVGMatrix()
  angle: number = 0
}
