import { VirtualEvent } from './VirtualEvent'

export interface CustomEventInit {
  bubbles?: boolean
  cancelable?: boolean
  detail?: any
}

/**
 * CustomEvent implementation
 * Compatible with DOM CustomEvent API
 */
export class CustomEvent extends VirtualEvent {
  public detail: any

  constructor(type: string, eventInitDict: CustomEventInit = {}) {
    super(type, eventInitDict)
    this.detail = eventInitDict.detail
  }
}
