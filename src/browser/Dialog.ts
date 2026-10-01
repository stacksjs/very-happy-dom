/**
 * A dialog the page opened, and the decision a handler makes about it (#1612).
 *
 * `confirm()` returned a hardcoded `false`, so a confirm-gated action could only
 * ever be cancelled:
 *
 *     deleteButton.addEventListener('click', () => {
 *       if (!confirm('Delete this trail?')) return
 *       removeTrail()                                 // unreachable, always
 *     })
 *
 * The test clicked the button, nothing happened, and the assertion failed with no
 * hint that a dialog was involved. The "delete" half of every destructive flow
 * was untestable, and destructive flows are the ones most worth a test.
 *
 * `alert()` was the benign one — a no-op is close enough to auto-dismissing —
 * except that there was no way to assert an alert had happened at all.
 */

/** `beforeunload` is deliberately absent: nothing here fires it. */
export type DialogType = 'alert' | 'confirm' | 'prompt'

/** What a dialog was answered with. */
export interface DialogOutcome {
  accepted: boolean
  /** The text entered at a prompt, or null. */
  text: string | null
}

export class Dialog {
  private _settled = false
  private _accepted = false
  private _text: string | null = null

  /**
   * @internal
   *
   * `defaultValue` is the `prompt()` default, or an empty string.
   *
   * Documented here rather than on the parameter itself. A doc comment inside a
   * parameter list breaks the declaration emitter: it splices the comment's own
   * text into the class body as though it were a member, and drops the parameter
   * from the emitted constructor signature. That shipped in 0.3.0 and made the
   * package fail to typecheck for every consumer, so the comment stays out here.
   */
  constructor(
    readonly type: DialogType,
    readonly message: string,
    readonly defaultValue: string = '',
  ) {}

  /**
   * Accept the dialog, optionally answering a prompt.
   *
   * Returns a promise for parity with Playwright, but the decision is recorded
   * *synchronously*, before that promise resolves. It has to be: `confirm()` is a
   * synchronous DOM API, so a decision that arrives on a later tick arrives after
   * the page already acted on the default.
   */
  async accept(promptText?: string): Promise<void> {
    this._decide(true, promptText ?? this.defaultValue)
  }

  /** Dismiss the dialog — `false` from a confirm, `null` from a prompt. */
  async dismiss(): Promise<void> {
    this._decide(false, null)
  }

  private _decide(accepted: boolean, text: string | null): void {
    // First decision wins. Two handlers disagreeing is the caller's problem, and
    // letting the last one silently override the first would hide it.
    if (this._settled)
      return

    this._settled = true
    this._accepted = accepted
    this._text = text
  }

  /** @internal Whether a handler decided while it still mattered. */
  get _wasSettled(): boolean {
    return this._settled
  }

  /** @internal The answer, defaulting to dismissed. */
  _outcome(): DialogOutcome {
    return { accepted: this._accepted, text: this._text }
  }
}
