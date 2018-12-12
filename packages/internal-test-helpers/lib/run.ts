import {
  getCurrentRunLoop,
  // @ts-ignore
  hasScheduledTimers,
  // @ts-ignore
  next,
  run,
} from '@ember/runloop';

import { Promise } from 'rsvp';

export function runAppend(view: any) {
  run(view, 'appendTo', document.getElementById('qunit-fixture'));
}

export function runDestroy(toDestroy: any) {
  if (toDestroy) {
    run(toDestroy, 'destroy');
  }
}

export function runTaskNext(): Promise<void> {
  return new Promise(resolve => {
    return next(resolve);
  });
}

// TODO: Find a better name 😎
export function runLoopSettled(event?: any): Promise<void> {
  return new Promise(function(resolve) {
    // Every 5ms, poll for the async thing to have finished
    let watcher = setInterval(() => {
      // If there are scheduled timers or we are inside of a run loop, keep polling
      if (hasScheduledTimers() || getCurrentRunLoop()) {
        return;
      }

      // Stop polling
      clearInterval(watcher);

      // Synchronously resolve the promise
      resolve(event);
    }, 5);
  });
}
