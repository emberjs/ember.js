import Ember from 'ember-metal/core';
import {
  GUID_KEY
} from 'ember-metal/utils';
import { indexOf } from 'ember-metal/array';
import {
  beginPropertyChanges,
  endPropertyChanges
} from 'ember-metal/property_events';
import Backburner from 'backburner';

function onBegin(current) {
  run.currentRunLoop = current;
}

function onEnd(current, next) {
  run.currentRunLoop = next;
}

// ES6TODO: should Backburner become es6?
var backburner = new Backburner(['sync', 'actions', 'destroy'], {
  GUID_KEY: GUID_KEY,
  sync: {
    before: beginPropertyChanges,
    after: endPropertyChanges
  },
  defaultQueue: 'actions',
  onBegin: onBegin,
  onEnd: onEnd,
  onErrorTarget: Ember,
  onErrorMethod: 'onerror'
});

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
  run(function() {
    // code to be executed within a RunLoop
  });
  ```

  @class run
  @namespace Ember
  @static
  @constructor
  @param {Object} [target] target of method to call
  @param {Function|String} method Method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Any additional arguments you wish to pass to the method.
  @return {Object} return value from invoking the passed function.
*/
export default run;
function run() {
  return backburner.run(...arguments);
}

/**
  If no run-loop is present, it creates a new one. If a run loop is
  present it will queue itself to run on the existing run-loops action
  queue.

  Please note: This is not for normal usage, and should be used sparingly.

  If invoked when not within a run loop:

  ```javascript
  run.join(function() {
    // creates a new run-loop
  });
  ```

  Alternatively, if called within an existing run loop:

  ```javascript
  run(function() {
    // creates a new run-loop
    run.join(function() {
      // joins with the existing run-loop, and queues for invocation on
      // the existing run-loops action queue.
    });
  });
  ```

  @method join
  @namespace Ember
  @param {Object} [target] target of method to call
  @param {Function|String} method Method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Any additional arguments you wish to pass to the method.
  @return {Object} Return value from invoking the passed function. Please note,
  when called within an existing loop, no return value is possible.
*/
run.join = function() {
  return backburner.join(...arguments);
};

/**
  Allows you to specify which context to call the specified function in while
  adding the execution of that function to the Ember run loop. This ability
  makes this method a great way to asynchronously integrate third-party libraries
  into your Ember application.

  `run.bind` takes two main arguments, the desired context and the function to
  invoke in that context. Any additional arguments will be supplied as arguments
  to the function that is passed in.

  Let's use the creation of a TinyMCE component as an example. Currently,
  TinyMCE provides a setup configuration option we can use to do some processing
  after the TinyMCE instance is initialized but before it is actually rendered.
  We can use that setup option to do some additional setup for our component.
  The component itself could look something like the following:

  ```javascript
  App.RichTextEditorComponent = Ember.Component.extend({
    initializeTinyMCE: function() {
      tinymce.init({
        selector: '#' + this.$().prop('id'),
        setup: Ember.run.bind(this, this.setupEditor)
      });
    }.on('didInsertElement'),

    setupEditor: function(editor) {
      this.set('editor', editor);

      editor.on('change', function() {
        console.log('content changed!');
      });
    }
  });
  ```

  In this example, we use Ember.run.bind to bind the setupEditor message to the
  context of the App.RichTextEditorComponent and to have the invocation of that
  method be safely handled and executed by the Ember run loop.

  @method bind
  @namespace Ember
  @param {Object} [target] target of method to call
  @param {Function|String} method Method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Any additional arguments you wish to pass to the method.
  @return {Function} returns a new function that will always have a particular context
  @since 1.4.0
*/
run.bind = function(...curried) {
  return function(...args) {
    return run.join(...curried.concat(args));
  };
};

run.backburner = backburner;
run.currentRunLoop = null;
run.queues = backburner.queueNames;

/**
  Begins a new RunLoop. Any deferred actions invoked after the begin will
  be buffered until you invoke a matching call to `run.end()`. This is
  a lower-level way to use a RunLoop instead of using `run()`.

  ```javascript
  run.begin();
  // code to be executed within a RunLoop
  run.end();
  ```

  @method begin
  @return {void}
*/
run.begin = function() {
  backburner.begin();
};

/**
  Ends a RunLoop. This must be called sometime after you call
  `run.begin()` to flush any deferred actions. This is a lower-level way
  to use a RunLoop instead of using `run()`.

  ```javascript
  run.begin();
  // code to be executed within a RunLoop
  run.end();
  ```

  @method end
  @return {void}
*/
run.end = function() {
  backburner.end();
};

/**
  Array of named queues. This array determines the order in which queues
  are flushed at the end of the RunLoop. You can define your own queues by
  simply adding the queue name to this array. Normally you should not need
  to inspect or modify this property.

  @property queues
  @type Array
  @default ['sync', 'actions', 'destroy']
*/

/**
  Adds the passed target/method and any optional arguments to the named
  queue to be executed at the end of the RunLoop. If you have not already
  started a RunLoop when calling this method one will be started for you
  automatically.

  At the end of a RunLoop, any methods scheduled in this way will be invoked.
  Methods will be invoked in an order matching the named queues defined in
  the `run.queues` property.

  ```javascript
  run.schedule('sync', this, function() {
    // this will be executed in the first RunLoop queue, when bindings are synced
    console.log('scheduled on sync queue');
  });

  run.schedule('actions', this, function() {
    // this will be executed in the 'actions' queue, after bindings have synced.
    console.log('scheduled on actions queue');
  });

  // Note the functions will be run in order based on the run queues order.
  // Output would be:
  //   scheduled on sync queue
  //   scheduled on actions queue
  ```

  @method schedule
  @param {String} queue The name of the queue to schedule against.
    Default queues are 'sync' and 'actions'
  @param {Object} [target] target object to use as the context when invoking a method.
  @param {String|Function} method The method to invoke. If you pass a string it
    will be resolved on the target object at the time the scheduled item is
    invoked allowing you to change the target function.
  @param {Object} [arguments*] Optional arguments to be passed to the queued method.
  @return {void}
*/
run.schedule = function(/* queue, target, method */) {
  checkAutoRun();
  backburner.schedule(...arguments);
};

// Used by global test teardown
run.hasScheduledTimers = function() {
  return backburner.hasTimers();
};

// Used by global test teardown
run.cancelTimers = function() {
  backburner.cancelTimers();
};

/**
  Immediately flushes any events scheduled in the 'sync' queue. Bindings
  use this queue so this method is a useful way to immediately force all
  bindings in the application to sync.

  You should call this method anytime you need any changed state to propagate
  throughout the app immediately without repainting the UI (which happens
  in the later 'render' queue added by the `ember-views` package).

  ```javascript
  run.sync();
  ```

  @method sync
  @return {void}
*/
run.sync = function() {
  if (backburner.currentInstance) {
    backburner.currentInstance.queues.sync.flush();
  }
};

/**
  Invokes the passed target/method and optional arguments after a specified
  period of time. The last parameter of this method must always be a number
  of milliseconds.

  You should use this method whenever you need to run some action after a
  period of time instead of using `setTimeout()`. This method will ensure that
  items that expire during the same script execution cycle all execute
  together, which is often more efficient than using a real setTimeout.

  ```javascript
  run.later(myContext, function() {
    // code here will execute within a RunLoop in about 500ms with this == myContext
  }, 500);
  ```

  @method later
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @param {Number} wait Number of milliseconds to wait.
  @return {*} Timer information for use in cancelling, see `run.cancel`.
*/
run.later = function(/*target, method*/) {
  return backburner.later(...arguments);
};

/**
  Schedule a function to run one time during the current RunLoop. This is equivalent
  to calling `scheduleOnce` with the "actions" queue.

  @method once
  @param {Object} [target] The target of the method to invoke.
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @return {Object} Timer information for use in cancelling, see `run.cancel`.
*/
run.once = function(...args) {
  checkAutoRun();
  args.unshift('actions');
  return backburner.scheduleOnce(...args);
};

/**
  Schedules a function to run one time in a given queue of the current RunLoop.
  Calling this method with the same queue/target/method combination will have
  no effect (past the initial call).

  Note that although you can pass optional arguments these will not be
  considered when looking for duplicates. New arguments will replace previous
  calls.

  ```javascript
  function sayHi() {
    console.log('hi');
  }

  run(function() {
    run.scheduleOnce('afterRender', myContext, sayHi);
    run.scheduleOnce('afterRender', myContext, sayHi);
    // sayHi will only be executed once, in the afterRender queue of the RunLoop
  });
  ```

  Also note that passing an anonymous function to `run.scheduleOnce` will
  not prevent additional calls with an identical anonymous function from
  scheduling the items multiple times, e.g.:

  ```javascript
  function scheduleIt() {
    run.scheduleOnce('actions', myContext, function() {
      console.log('Closure');
    });
  }

  scheduleIt();
  scheduleIt();

  // "Closure" will print twice, even though we're using `run.scheduleOnce`,
  // because the function we pass to it is anonymous and won't match the
  // previously scheduled operation.
  ```

  Available queues, and their order, can be found at `run.queues`

  @method scheduleOnce
  @param {String} [queue] The name of the queue to schedule against. Default queues are 'sync' and 'actions'.
  @param {Object} [target] The target of the method to invoke.
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @return {Object} Timer information for use in cancelling, see `run.cancel`.
*/
run.scheduleOnce = function(/*queue, target, method*/) {
  checkAutoRun();
  return backburner.scheduleOnce(...arguments);
};

/**
  Schedules an item to run from within a separate run loop, after
  control has been returned to the system. This is equivalent to calling
  `run.later` with a wait time of 1ms.

  ```javascript
  run.next(myContext, function() {
    // code to be executed in the next run loop,
    // which will be scheduled after the current one
  });
  ```

  Multiple operations scheduled with `run.next` will coalesce
  into the same later run loop, along with any other operations
  scheduled by `run.later` that expire right around the same
  time that `run.next` operations will fire.

  Note that there are often alternatives to using `run.next`.
  For instance, if you'd like to schedule an operation to happen
  after all DOM element operations have completed within the current
  run loop, you can make use of the `afterRender` run loop queue (added
  by the `ember-views` package, along with the preceding `render` queue
  where all the DOM element operations happen). Example:

  ```javascript
  App.MyCollectionView = Ember.CollectionView.extend({
    didInsertElement: function() {
      run.scheduleOnce('afterRender', this, 'processChildElements');
    },
    processChildElements: function() {
      // ... do something with collectionView's child view
      // elements after they've finished rendering, which
      // can't be done within the CollectionView's
      // `didInsertElement` hook because that gets run
      // before the child elements have been added to the DOM.
    }
  });
  ```

  One benefit of the above approach compared to using `run.next` is
  that you will be able to perform DOM/CSS operations before unprocessed
  elements are rendered to the screen, which may prevent flickering or
  other artifacts caused by delaying processing until after rendering.

  The other major benefit to the above approach is that `run.next`
  introduces an element of non-determinism, which can make things much
  harder to test, due to its reliance on `setTimeout`; it's much harder
  to guarantee the order of scheduled operations when they are scheduled
  outside of the current run loop, i.e. with `run.next`.

  @method next
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @return {Object} Timer information for use in cancelling, see `run.cancel`.
*/
run.next = function(...args) {
  args.push(1);
  return backburner.later(...args);
};

/**
  Cancels a scheduled item. Must be a value returned by `run.later()`,
  `run.once()`, `run.next()`, `run.debounce()`, or
  `run.throttle()`.

  ```javascript
  var runNext = run.next(myContext, function() {
    // will not be executed
  });

  run.cancel(runNext);

  var runLater = run.later(myContext, function() {
    // will not be executed
  }, 500);

  run.cancel(runLater);

  var runOnce = run.once(myContext, function() {
    // will not be executed
  });

  run.cancel(runOnce);

  var throttle = run.throttle(myContext, function() {
    // will not be executed
  }, 1, false);

  run.cancel(throttle);

  var debounce = run.debounce(myContext, function() {
    // will not be executed
  }, 1);

  run.cancel(debounce);

  var debounceImmediate = run.debounce(myContext, function() {
    // will be executed since we passed in true (immediate)
  }, 100, true);

  // the 100ms delay until this method can be called again will be cancelled
  run.cancel(debounceImmediate);
  ```

  @method cancel
  @param {Object} timer Timer object to cancel
  @return {Boolean} true if cancelled or false/undefined if it wasn't found
*/
run.cancel = function(timer) {
  return backburner.cancel(timer);
};

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
  function whoRan() {
    console.log(this.name + ' ran.');
  }

  var myContext = { name: 'debounce' };

  run.debounce(myContext, whoRan, 150);

  // less than 150ms passes
  run.debounce(myContext, whoRan, 150);

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
  function whoRan() {
    console.log(this.name + ' ran.');
  }

  var myContext = { name: 'debounce' };

  run.debounce(myContext, whoRan, 150, true);

  // console logs 'debounce ran.' one time immediately.
  // 100ms passes
  run.debounce(myContext, whoRan, 150, true);

  // 150ms passes and nothing else is logged to the console and
  // the debouncee is no longer being watched
  run.debounce(myContext, whoRan, 150, true);

  // console logs 'debounce ran.' one time immediately.
  // 150ms passes and nothing else is logged to the console and
  // the debouncee is no longer being watched

  ```

  @method debounce
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @param {Number} wait Number of milliseconds to wait.
  @param {Boolean} immediate Trigger the function on the leading instead
    of the trailing edge of the wait interval. Defaults to false.
  @return {Array} Timer information for use in cancelling, see `run.cancel`.
*/
run.debounce = function() {
  return backburner.debounce(...arguments);
};

/**
  Ensure that the target method is never called more frequently than
  the specified spacing period. The target method is called immediately.

  ```javascript
  function whoRan() {
    console.log(this.name + ' ran.');
  }

  var myContext = { name: 'throttle' };

  run.throttle(myContext, whoRan, 150);
  // whoRan is invoked with context myContext
  // console logs 'throttle ran.'

  // 50ms passes
  run.throttle(myContext, whoRan, 150);

  // 50ms passes
  run.throttle(myContext, whoRan, 150);

  // 150ms passes
  run.throttle(myContext, whoRan, 150);
  // whoRan is invoked with context myContext
  // console logs 'throttle ran.'
  ```

  @method throttle
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @param {Number} spacing Number of milliseconds to space out requests.
  @param {Boolean} immediate Trigger the function on the leading instead
    of the trailing edge of the wait interval. Defaults to true.
  @return {Array} Timer information for use in cancelling, see `run.cancel`.
*/
run.throttle = function() {
  return backburner.throttle(...arguments);
};

// Make sure it's not an autorun during testing
function checkAutoRun() {
  if (!run.currentRunLoop) {
    Ember.assert(`You have turned on testing mode, which disabled the run-loop's autorun.
                  You will need to wrap any code with asynchronous side-effects in a run`, !Ember.testing);
  }
}

/**
  Add a new named queue after the specified queue.

  The queue to add will only be added once.

  @method _addQueue
  @param {String} name the name of the queue to add.
  @param {String} after the name of the queue to add after.
  @private
*/
run._addQueue = function(name, after) {
  if (indexOf.call(run.queues, name) === -1) {
    run.queues.splice(indexOf.call(run.queues, after)+1, 0, name);
  }
};
