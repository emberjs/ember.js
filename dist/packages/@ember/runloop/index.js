import { assert } from '@ember/debug';
import { onErrorTarget } from '@ember/-internals/error-handling';
import { flushAsyncObservers } from '@ember/-internals/metal';
import Backburner from 'backburner.js';
let currentRunLoop = null;
export function _getCurrentRunLoop() {
  return currentRunLoop;
}
function onBegin(current) {
  currentRunLoop = current;
}
function onEnd(_current, next) {
  currentRunLoop = next;
  flushAsyncObservers();
}
function flush(queueName, next) {
  if (queueName === 'render' || queueName === _rsvpErrorQueue) {
    flushAsyncObservers();
  }
  next();
}
export const _rsvpErrorQueue = `${Math.random()}${Date.now()}`.replace('.', '');
/**
  Array of named queues. This array determines the order in which queues
  are flushed at the end of the RunLoop. You can define your own queues by
  simply adding the queue name to this array. Normally you should not need
  to inspect or modify this property.

  @property queues
  @type Array
  @default ['actions', 'destroy']
  @private
*/
export const _queues = ['actions',
// used in router transitions to prevent unnecessary loading state entry
// if all context promises resolve on the 'actions' queue first
'routerTransitions', 'render', 'afterRender', 'destroy',
// used to re-throw unhandled RSVP rejection errors specifically in this
// position to avoid breaking anything rendered in the other sections
_rsvpErrorQueue];
/**
 * @internal
 * @private
 */
export const _backburner = new Backburner(_queues, {
  defaultQueue: 'actions',
  onBegin,
  onEnd,
  onErrorTarget,
  onErrorMethod: 'onerror',
  flush
});
export function run(...args) {
  // @ts-expect-error TS doesn't like our spread args
  return _backburner.run(...args);
}
export function join(methodOrTarget, methodOrArg, ...additionalArgs) {
  return _backburner.join(methodOrTarget, methodOrArg, ...additionalArgs);
}
export function bind(...curried) {
  assert('could not find a suitable method to bind', function (methodOrTarget, methodOrArg) {
    // Applies the same logic as backburner parseArgs for detecting if a method
    // is actually being passed.
    let length = arguments.length;
    if (length === 0) {
      return false;
    } else if (length === 1) {
      return typeof methodOrTarget === 'function';
    } else {
      return typeof methodOrArg === 'function' ||
      // second argument is a function
      methodOrTarget !== null && typeof methodOrArg === 'string' && methodOrArg in methodOrTarget ||
      // second argument is the name of a method in first argument
      typeof methodOrTarget === 'function' //first argument is a function
      ;
    }
    // @ts-expect-error TS doesn't like our spread args
  }(...curried));
  // @ts-expect-error TS doesn't like our spread args
  return (...args) => join(...curried.concat(args));
}
/**
  Begins a new RunLoop. Any deferred actions invoked after the begin will
  be buffered until you invoke a matching call to `end()`. This is
  a lower-level way to use a RunLoop instead of using `run()`.

  ```javascript
  import { begin, end } from '@ember/runloop';

  begin();
  // code to be executed within a RunLoop
  end();
  ```

  @method begin
  @static
  @for @ember/runloop
  @return {void}
  @public
*/
export function begin() {
  _backburner.begin();
}
/**
  Ends a RunLoop. This must be called sometime after you call
  `begin()` to flush any deferred actions. This is a lower-level way
  to use a RunLoop instead of using `run()`.

  ```javascript
  import { begin, end } from '@ember/runloop';

  begin();
  // code to be executed within a RunLoop
  end();
  ```

  @method end
  @static
  @for @ember/runloop
  @return {void}
  @public
*/
export function end() {
  _backburner.end();
}
export function schedule(...args) {
  // @ts-expect-error TS doesn't like the rest args here
  return _backburner.schedule(...args);
}
// Used by global test teardown
export function _hasScheduledTimers() {
  return _backburner.hasTimers();
}
// Used by global test teardown
export function _cancelTimers() {
  _backburner.cancelTimers();
}
export function later(...args) {
  return _backburner.later(...args);
}
export function once(...args) {
  // @ts-expect-error TS doesn't like the rest args here
  return _backburner.scheduleOnce('actions', ...args);
}
export function scheduleOnce(...args) {
  // @ts-expect-error TS doesn't like the rest args here
  return _backburner.scheduleOnce(...args);
}
export function next(...args) {
  return _backburner.later(...args, 1);
}
/**
  Cancels a scheduled item. Must be a value returned by `later()`,
  `once()`, `scheduleOnce()`, `next()`, `debounce()`, or
  `throttle()`.

  ```javascript
  import {
    next,
    cancel,
    later,
    scheduleOnce,
    once,
    throttle,
    debounce
  } from '@ember/runloop';

  let runNext = next(myContext, function() {
    // will not be executed
  });

  cancel(runNext);

  let runLater = later(myContext, function() {
    // will not be executed
  }, 500);

  cancel(runLater);

  let runScheduleOnce = scheduleOnce('afterRender', myContext, function() {
    // will not be executed
  });

  cancel(runScheduleOnce);

  let runOnce = once(myContext, function() {
    // will not be executed
  });

  cancel(runOnce);

  let throttle = throttle(myContext, function() {
    // will not be executed
  }, 1, false);

  cancel(throttle);

  let debounce = debounce(myContext, function() {
    // will not be executed
  }, 1);

  cancel(debounce);

  let debounceImmediate = debounce(myContext, function() {
    // will be executed since we passed in true (immediate)
  }, 100, true);

  // the 100ms delay until this method can be called again will be canceled
  cancel(debounceImmediate);
  ```

  @method cancel
  @static
  @for @ember/runloop
  @param {Object} [timer] Timer object to cancel
  @return {Boolean} true if canceled or false/undefined if it wasn't found
  @public
*/
export function cancel(timer) {
  return _backburner.cancel(timer);
}
export function debounce(...args) {
  // @ts-expect-error TS doesn't like the rest args here
  return _backburner.debounce(...args);
}
export function throttle(...args) {
  // @ts-expect-error TS doesn't like the rest args here
  return _backburner.throttle(...args);
}