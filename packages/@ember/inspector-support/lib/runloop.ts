import { _backburner, join, debounce, cancel } from '@ember/runloop';

export const runloop = {
  /**
   * Get the Backburner instance used by Ember's run loop.
   * Useful for subscribing to run loop events (e.g. 'begin', 'end').
   */
  getBackburner(): unknown {
    return _backburner;
  },

  /**
   * Join the current run loop, or start a new one if none is active.
   * Used to schedule inspector updates at appropriate times.
   *
   * @param callback - The function to run inside the run loop
   */
  join(callback: () => void): void {
    join(callback);
  },

  /**
   * Debounce a function call within the run loop.
   *
   * @param target - The context object (or null)
   * @param method - The method name or function to call
   * @param wait - Milliseconds to wait before calling
   * @param args - Additional arguments to pass
   * @returns A timer that can be passed to cancel()
   */
  debounce(
    target: object | null,
    method: string | Function,
    wait: number,
    ...args: unknown[]
  ): unknown {
    return debounce(target as any, method as any, ...args, wait);
  },

  /**
   * Cancel a previously scheduled debounce or other run loop timer.
   *
   * @param timer - The timer returned by debounce or other scheduling functions
   */
  cancel(timer: unknown): void {
    cancel(timer as any);
  },
};
