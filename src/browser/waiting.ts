/**
 * One definition of "wait until this holds", and one error for when it does not.
 *
 * `waitForSelector` and `waitForFunction` each grew their own loop and then
 * disagreed about what a timeout is: one returns `null`, the other throws
 * (#1605). A third copy for locators would have made three copies and three
 * opinions, so this is the one locators use and the one those two should move
 * onto.
 */

/**
 * Thrown when a wait gives up.
 *
 * A distinct type so a caller can catch a timeout without matching on the
 * message, which is the only thing available today.
 */
export class TimeoutError extends Error {
  override readonly name = 'TimeoutError'
}

/**
 * How often a wait re-checks.
 *
 * There is no rendering loop here, so what a wait is really waiting for is the
 * task queue to turn over: a timer firing, a `fetch` settling, a microtask
 * draining, a custom element upgrading. 20ms is short enough that a passing
 * test does not feel it, and long enough that a failing one does not re-walk
 * the DOM thousands of times on its way to the timeout.
 */
const POLL_INTERVAL_MS = 20

/** Satisfied, carrying the value the caller wanted. */
interface Settled<T> {
  done: true
  value: T
}

/** Not satisfied yet, carrying what was actually seen. */
interface Pending {
  done: false
  reason: string
}

/**
 * Poll `check` until it is satisfied, then return its value; throw once
 * `timeout` has elapsed.
 *
 * `reason` is the last thing actually observed, and it goes into the timeout
 * message because "it was never there" and "it was there but hidden" are
 * different bugs that a bare "timed out" cannot tell apart.
 *
 * The first check runs before any sleep, so the ordinary case — the condition
 * already holds — costs nothing. A `timeout` of 0 therefore means exactly one
 * check.
 *
 * A `check` that throws is not retried. Some failures are not states the DOM
 * will grow out of, and retrying them would turn a clear error into a timeout.
 */
export async function waitUntil<T>(
  check: () => Settled<T> | Pending,
  options: { timeout: number, describe: (reason: string) => string },
): Promise<T> {
  const deadline = Date.now() + options.timeout
  let reason = 'nothing was observed'

  for (;;) {
    const result = check()
    if (result.done)
      return result.value

    reason = result.reason

    const left = deadline - Date.now()
    if (left <= 0)
      break

    await new Promise(resolve => setTimeout(resolve, Math.min(POLL_INTERVAL_MS, left)))
  }

  throw new TimeoutError(options.describe(reason))
}
