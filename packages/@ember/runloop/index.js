import { assert } from '@ember/debug';
import { onErrorTarget } from '@ember/-internals/error-handling';
import { flushAsyncObservers } from '@ember/-internals/metal';
import Backburner from 'backburner';

let currentRunLoop = null;
export function getCurrentRunLoop() {
  return currentRunLoop;
}

function onBegin(current) {
  currentRunLoop = current;
}

function onEnd(current, next) {
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
export const queues = [
  'actions',

  // used in router transitions to prevent unnecessary loading state entry
  // if all context promises resolve on the 'actions' queue first
  'routerTransitions',

  'render',
  'afterRender',
  'destroy',

  // used to re-throw unhandled RSVP rejection errors specifically in this
  // position to avoid breaking anything rendered in the other sections
  _rsvpErrorQueue,
];

export const backburner = new Backburner(queues, {
  defaultQueue: 'actions',
  onBegin,
  onEnd,
  onErrorTarget,
  onErrorMethod: 'onerror',
  flush,
});

/**
 @module @ember/runloop
*/
// ..........................................................
// run - this is ideally the only public API the dev sees
//

/**
  Runs the passed target and method inside of a RunLoop, ensuring any
  deferred actions including bindings and views updates are flushed at the
  end.

  Normally you should not need to invoke this method yourself. However if
  you are implementing raw event handlers when interfacing with other
  libraries or plugins, you should probably wrap all of your code inside this
  call.

  ```javascript
  import { run } from '@ember/runloop';

  run(function() {
    // code to be executed within a RunLoop
  });
  ```
  @method run
  @for @ember/runloop
  @static
  @param {Object} [target] target of method to call
  @param {Function|String} method Method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Any additional arguments you wish to pass to the method.
  @return {Object} return value from invoking the passed function.
  @public
*/
export function run() {
  return backburner.run(...arguments);
}

// used for the Ember.run global only
export const _globalsRun = run.bind(null);

/**
  If no run-loop is present, it creates a new one. If a run loop is
  present it will queue itself to run on the existing run-loops action
  queue.

  Please note: This is not for normal usage, and should be used sparingly.

  If invoked when not within a run loop:

  ```javascript
  import { join } from '@ember/runloop';

  join(function() {
    // creates a new run-loop
  });
  ```

  Alternatively, if called within an existing run loop:

  ```javascript
  import { run, join } from '@ember/runloop';

  run(function() {
    // creates a new run-loop

    join(function() {
      // joins with the existing run-loop, and queues for invocation on
      // the existing run-loops action queue.
    });
  });
  ```

  @method join
  @static
  @for @ember/runloop
  @param {Object} [target] target of method to call
  @param {Function|String} method Method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Any additional arguments you wish to pass to the method.
  @return {Object} Return value from invoking the passed function. Please note,
  when called within an existing loop, no return value is possible.
  @public
*/
export function join() {
  return backburner.join(...arguments);
}

/**
  Allows you to specify which context to call the specified function in while
  adding the execution of that function to the Ember run loop. This ability
  makes this method a great way to asynchronously integrate third-party libraries
  into your Ember application.

  `bind` takes two main arguments, the desired context and the function to
  invoke in that context. Any additional arguments will be supplied as arguments
  to the function that is passed in.

  Let's use the creation of a TinyMCE component as an example. Currently,
  TinyMCE provides a setup configuration option we can use to do some processing
  after the TinyMCE instance is initialized but before it is actually rendered.
  We can use that setup option to do some additional setup for our component.
  The component itself could look something like the following:

  ```app/components/rich-text-editor.js
  import Component from '@ember/component';
  import { on } from '@ember/object/evented';
  import { bind } from '@ember/runloop';

  export default Component.extend({
    initializeTinyMCE: on('didInsertElement', function() {
      tinymce.init({
        selector: '#' + this.$().prop('id'),
        setup: bind(this, this.setupEditor)
      });
    }),

    didInsertElement() {
      tinymce.init({
        selector: '#' + this.$().prop('id'),
        setup: bind(this, this.setupEditor)
      });
    }

    setupEditor(editor) {
      this.set('editor', editor);

      editor.on('change', function() {
        console.log('content changed!');
      });
    }
  });
  ```

  In this example, we use `bind` to bind the setupEditor method to the
  context of the RichTextEditor component and to have the invocation of that
  method be safely handled and executed by the Ember run loop.

  @method bind
  @static
  @for @ember/runloop
  @param {Object} [target] target of method to call
  @param {Function|String} method Method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Any additional arguments you wish to pass to the method.
  @return {Function} returns a new function that will always have a particular context
  @since 1.4.0
  @public
*/
export const bind = (...curried) => {
  assert(
    'could not find a suitable method to bind',
    (function(methodOrTarget, methodOrArg) {
      // Applies the same logic as backburner parseArgs for detecting if a method
      // is actually being passed.
      let length = arguments.length;

      if (length === 0) {
        return false;
      } else if (length === 1) {
        return typeof methodOrTarget === 'function';
      } else {
        let type = typeof methodOrArg;
        return (
          type === 'function' || // second argument is a function
          (methodOrTarget !== null && type === 'string' && methodOrArg in methodOrTarget) || // second argument is the name of a method in first argument
          typeof methodOrTarget === 'function' //first argument is a function
        );
      }
    })(...curried)
  );
  return (...args) => join(...curried.concat(args));
};

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
  backburner.begin();
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
  backburner.end();
}

/**
  Adds the passed target/method and any optional arguments to the named
  queue to be executed at the end of the RunLoop. If you have not already
  started a RunLoop when calling this method one will be started for you
  automatically.

  At the end of a RunLoop, any methods scheduled in this way will be invoked.
  Methods will be invoked in an order matching the named queues defined in
  the `queues` property.

  ```javascript
  import { schedule } from '@ember/runloop';

  schedule('afterRender', this, function() {
    // this will be executed in the 'afterRender' queue
    console.log('scheduled on afterRender queue');
  });

  schedule('actions', this, function() {
    // this will be executed in the 'actions' queue
    console.log('scheduled on actions queue');
  });

  // Note the functions will be run in order based on the run queues order.
  // Output would be:
  //   scheduled on actions queue
  //   scheduled on afterRender queue
  ```

  @method schedule
  @static
  @for @ember/runloop
  @param {String} queue The name of the queue to schedule against. Default queues is 'actions'
  @param {Object} [target] target object to use as the context when invoking a method.
  @param {String|Function} method The method to invoke. If you pass a string it
    will be resolved on the target object at the time the scheduled item is
    invoked allowing you to change the target function.
  @param {Object} [arguments*] Optional arguments to be passed to the queued method.
  @return {*} Timer information for use in canceling, see `cancel`.
  @public
*/
export function schedule(/* queue, target, method */) {
  return backburner.schedule(...arguments);
}

// Used by global test teardown
export function hasScheduledTimers() {
  return backburner.hasTimers();
}

// Used by global test teardown
export function cancelTimers() {
  backburner.cancelTimers();
}

/**
  Invokes the passed target/method and optional arguments after a specified
  period of time. The last parameter of this method must always be a number
  of milliseconds.

  You should use this method whenever you need to run some action after a
  period of time instead of using `setTimeout()`. This method will ensure that
  items that expire during the same script execution cycle all execute
  together, which is often more efficient than using a real setTimeout.

  ```javascript
  import { later } from '@ember/runloop';

  later(myContext, function() {
    // code here will execute within a RunLoop in about 500ms with this == myContext
  }, 500);
  ```

  @method later
  @static
  @for @ember/runloop
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @param {Number} wait Number of milliseconds to wait.
  @return {*} Timer information for use in canceling, see `cancel`.
  @public
*/
export function later(/*target, method*/) {
  return backburner.later(...arguments);
}

/**
 Schedule a function to run one time during the current RunLoop. This is equivalent
  to calling `scheduleOnce` with the "actions" queue.

  @method once
  @static
  @for @ember/runloop
  @param {Object} [target] The target of the method to invoke.
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @return {Object} Timer information for use in canceling, see `cancel`.
  @public
*/
export function once(...args) {
  args.unshift('actions');
  return backburner.scheduleOnce(...args);
}

/**
  Schedules a function to run one time in a given queue of the current RunLoop.
  Calling this method with the same queue/target/method combination will have
  no effect (past the initial call).

  Note that although you can pass optional arguments these will not be
  considered when looking for duplicates. New arguments will replace previous
  calls.

  ```javascript
  import { run, scheduleOnce } from '@ember/runloop';

  function sayHi() {
    console.log('hi');
  }

  run(function() {
    scheduleOnce('afterRender', myContext, sayHi);
    scheduleOnce('afterRender', myContext, sayHi);
    // sayHi will only be executed once, in the afterRender queue of the RunLoop
  });
  ```

  Also note that for `scheduleOnce` to prevent additional calls, you need to
  pass the same function instance. The following case works as expected:

  ```javascript
  function log() {
    console.log('Logging only once');
  }

  function scheduleIt() {
    scheduleOnce('actions', myContext, log);
  }

  scheduleIt();
  scheduleIt();
  ```

  But this other case will schedule the function multiple times:

  ```javascript
  import { scheduleOnce } from '@ember/runloop';

  function scheduleIt() {
    scheduleOnce('actions', myContext, function() {
      console.log('Closure');
    });
  }

  scheduleIt();
  scheduleIt();

  // "Closure" will print twice, even though we're using `scheduleOnce`,
  // because the function we pass to it won't match the
  // previously scheduled operation.
  ```

  Available queues, and their order, can be found at `queues`

  @method scheduleOnce
  @static
  @for @ember/runloop
  @param {String} [queue] The name of the queue to schedule against. Default queues is 'actions'.
  @param {Object} [target] The target of the method to invoke.
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @return {Object} Timer information for use in canceling, see `cancel`.
  @public
*/
export function scheduleOnce(/* queue, target, method*/) {
  return backburner.scheduleOnce(...arguments);
}

/**
  Schedules an item to run from within a separate run loop, after
  control has been returned to the system. This is equivalent to calling
  `later` with a wait time of 1ms.

  ```javascript
  import { next } from '@ember/runloop';

  next(myContext, function() {
    // code to be executed in the next run loop,
    // which will be scheduled after the current one
  });
  ```

  Multiple operations scheduled with `next` will coalesce
  into the same later run loop, along with any other operations
  scheduled by `later` that expire right around the same
  time that `next` operations will fire.

  Note that there are often alternatives to using `next`.
  For instance, if you'd like to schedule an operation to happen
  after all DOM element operations have completed within the current
  run loop, you can make use of the `afterRender` run loop queue (added
  by the `ember-views` package, along with the preceding `render` queue
  where all the DOM element operations happen).

  Example:

  ```app/components/my-component.js
  import Component from '@ember/component';
  import { scheduleOnce } from '@ember/runloop';

  export Component.extend({
    didInsertElement() {
      this._super(...arguments);
      scheduleOnce('afterRender', this, 'processChildElements');
    },

    processChildElements() {
      // ... do something with component's child component
      // elements after they've finished rendering, which
      // can't be done within this component's
      // `didInsertElement` hook because that gets run
      // before the child elements have been added to the DOM.
    }
  });
  ```

  One benefit of the above approach compared to using `next` is
  that you will be able to perform DOM/CSS operations before unprocessed
  elements are rendered to the screen, which may prevent flickering or
  other artifacts caused by delaying processing until after rendering.

  The other major benefit to the above approach is that `next`
  introduces an element of non-determinism, which can make things much
  harder to test, due to its reliance on `setTimeout`; it's much harder
  to guarantee the order of scheduled operations when they are scheduled
  outside of the current run loop, i.e. with `next`.

  @method next
  @static
  @for @ember/runloop
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @return {Object} Timer information for use in canceling, see `cancel`.
  @public
*/
export function next(...args) {
  args.push(1);
  return backburner.later(...args);
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
  @param {Object} timer Timer object to cancel
  @return {Boolean} true if canceled or false/undefined if it wasn't found
  @public
*/
export function cancel(timer) {
  return backburner.cancel(timer);
}

/**
  Delay calling the target method until the debounce period has elapsed
  with no additional debounce calls. If `debounce` is called again before
  the specified time has elapsed, the timer is reset and the entire period
  must pass again before the target method is called.

  This method should be used when an event may be called multiple times
  but the action should only be called once when the event is done firing.
  A common example is for scroll events where you only want updates to
  happen once scrolling has ceased.

  ```javascript
  import { debounce } from '@ember/runloop';

  function whoRan() {
    console.log(this.name + ' ran.');
  }

  let myContext = { name: 'debounce' };

  debounce(myContext, whoRan, 150);

  // less than 150ms passes
  debounce(myContext, whoRan, 150);

  // 150ms passes
  // whoRan is invoked with context myContext
  // console logs 'debounce ran.' one time.
  ```

  Immediate allows you to run the function immediately, but debounce
  other calls for this function until the wait time has elapsed. If
  `debounce` is called again before the specified time has elapsed,
  the timer is reset and the entire period must pass again before
  the method can be called again.

  ```javascript
  import { debounce } from '@ember/runloop';

  function whoRan() {
    console.log(this.name + ' ran.');
  }

  let myContext = { name: 'debounce' };

  debounce(myContext, whoRan, 150, true);

  // console logs 'debounce ran.' one time immediately.
  // 100ms passes
  debounce(myContext, whoRan, 150, true);

  // 150ms passes and nothing else is logged to the console and
  // the debouncee is no longer being watched
  debounce(myContext, whoRan, 150, true);

  // console logs 'debounce ran.' one time immediately.
  // 150ms passes and nothing else is logged to the console and
  // the debouncee is no longer being watched
  ```

  @method debounce
  @static
  @for @ember/runloop
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @param {Number} wait Number of milliseconds to wait.
  @param {Boolean} immediate Trigger the function on the leading instead
    of the trailing edge of the wait interval. Defaults to false.
  @return {Array} Timer information for use in canceling, see `cancel`.
  @public
*/
export function debounce() {
  return backburner.debounce(...arguments);
}

/**
  Ensure that the target method is never called more frequently than
  the specified spacing period. The target method is called immediately.

  ```javascript
  import { throttle } from '@ember/runloop';

  function whoRan() {
    console.log(this.name + ' ran.');
  }

  let myContext = { name: 'throttle' };

  throttle(myContext, whoRan, 150);
  // whoRan is invoked with context myContext
  // console logs 'throttle ran.'

  // 50ms passes
  throttle(myContext, whoRan, 150);

  // 50ms passes
  throttle(myContext, whoRan, 150);

  // 150ms passes
  throttle(myContext, whoRan, 150);
  // whoRan is invoked with context myContext
  // console logs 'throttle ran.'
  ```

  @method throttle
  @static
  @for @ember/runloop
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @param {Number} spacing Number of milliseconds to space out requests.
  @param {Boolean} immediate Trigger the function on the leading instead
    of the trailing edge of the wait interval. Defaults to true.
  @return {Array} Timer information for use in canceling, see `cancel`.
  @public
*/
export function throttle() {
  return backburner.throttle(...arguments);
}
