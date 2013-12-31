require('ember-metal/vendor/backburner');

var onBegin = function(current) {
  Ember.run.currentRunLoop = current;
};

var onEnd = function(current, next) {
  Ember.run.currentRunLoop = next;
};

var Backburner = requireModule('backburner').Backburner,
    backburner = new Backburner(['sync', 'actions', 'destroy'], {
      sync: {
        before: Ember.beginPropertyChanges,
        after: Ember.endPropertyChanges
      },
      defaultQueue: 'actions',
      onBegin: onBegin,
      onEnd: onEnd
    }),
    slice = [].slice,
    concat = [].concat;

// ..........................................................
// Ember.run - this is ideally the only public API the dev sees
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
  Ember.run(function() {
    // code to be execute within a RunLoop
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
Ember.run = function(target, method) {
  var ret;

  if (Ember.onerror) {
    try {
      ret = backburner.run.apply(backburner, arguments);
    } catch (e) {
      Ember.onerror(e);
    }
  } else {
    ret = backburner.run.apply(backburner, arguments);
  }

  return ret;
};

/**
  If no run-loop is present, it creates a new one. If a run loop is
  present it will queue itself to run on the existing run-loops action
  queue.

  Please note: This is not for normal usage, and should be used sparingly.

  If invoked when not within a run loop:

  ```javascript
  Ember.run.join(function() {
    // creates a new run-loop
  });
  ```

  Alternatively, if called within an existing run loop:

  ```javascript
  Ember.run(function() {
    // creates a new run-loop
    Ember.run.join(function() {
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
Ember.run.join = function(target, method /* args */) {
  if (!Ember.run.currentRunLoop) {
    return Ember.run.apply(Ember.run, arguments);
  }

  var args = slice.call(arguments);
  args.unshift('actions');
  Ember.run.schedule.apply(Ember.run, args);
};

if (Ember.FEATURES.isEnabled('ember-metal-run-proxy')) {
/**
  Provides a useful utility for when integrating with non-Ember libraries
  that provide asynchronous callbacks.

  Ember utilizes a run-loop to batch and coalesce changes. This works by
  marking the start and end of Ember-related Javascript execution.

  When using events such as a View's click handler, Ember wraps the event
  handler in a run-loop, but when integrating with non-Ember libraries this
  can be tedious.

  For example, the following is rather verbose but is the correct way to combine
  third-party events and Ember code.

  ```javascript
  var that = this;
  jQuery(window).on('resize', function(){
    Ember.run(function(){
      that.handleResize();
    });
  });
  ```

  To reduce the boilerplate, the following can be used to construct a
  run-loop-wrapped callback handler.

  ```javascript
  jQuery(window).on('resize', Ember.run.proxy(this, this.triggerResize));
  ```

  @method proxy
  @namespace Ember.run
  @param {Object} [target] target of method to call
  @param {Function|String} method Method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Any additional arguments you wish to pass to the method.
  @return {Object} return value from invoking the passed function. Please note,
  when called within an existing loop, no return value is possible.
*/
  Ember.run.proxy = function(target, method /* args*/) {
    var args = arguments;
    return function() {
      return Ember.run.join.apply(Ember.run, args);
    };
  };
}

if (Ember.FEATURES.isEnabled('ember-metal-run-method')) {
/**
  Provides a useful utility for use when integrating with non-Ember libraries
  that provide asynchronous callbacks.

  Ember utilizes a run-loop to batch and coalesce changes. This works by
  marking the start and end of Ember-related Javascript execution.

  When using events such as a View's click handler, Ember wraps the event
  handler in a run-loop, but when integrating with non-Ember libraries this
  can be tedious.

  For example, the following is rather verbose but the correct way to combine
  third-party events and Ember code.

  ```javascript
  var object = Ember.Object.create({
    handleResize: function(dimensions){
      this.set('somethingThatNeedsTheRunLoop', dimensions);
    };
  });

  jQuery(window).on('resize', function(){
    var dimensions = extractDimensions();
    Ember.run(function(){
      object.handleResize(dimensions);
    ));
  });
  ```

  To reduce the boilerplate, the following can be used to construct a
  run-loop-wrapped callback handler.

  ```javascript
  var object = Ember.Object.create({
    handleResize: Ember.run.method(function(dimensions){
      this.set('somethingThatNeedsTheRunLoop', dimensions);
    })
  });

  jQuery(window).on('scroll', function(){
    var dimensions = interpolateDimensions();
    object.handleResize(dimensions);
  });

  jQuery(window).on('resize', function(){
    var dimensions = extractDimensions();
    object.handleResize(dimensions);
  });
  ```

  @method method
  @namespace Ember.run
  @param {Function} method a method to wrap
  @return {Object} A method guarenteed to be run-loop-wrapped.
*/
  Ember.run.method = function() {
    var args = slice.call(arguments);

    return function() {
      args.unshift(this); // ensure the context is the class the method was defined on.
      return Ember.run.join.apply(Ember.run, concat.call(args, slice.call(arguments)));
    };
  };
}

Ember.run.backburner = backburner;

var run = Ember.run;

Ember.run.currentRunLoop = null;

Ember.run.queues = backburner.queueNames;

/**
  Begins a new RunLoop. Any deferred actions invoked after the begin will
  be buffered until you invoke a matching call to `Ember.run.end()`. This is
  a lower-level way to use a RunLoop instead of using `Ember.run()`.

  ```javascript
  Ember.run.begin();
  // code to be execute within a RunLoop
  Ember.run.end();
  ```

  @method begin
  @return {void}
*/
Ember.run.begin = function() {
  backburner.begin();
};

/**
  Ends a RunLoop. This must be called sometime after you call
  `Ember.run.begin()` to flush any deferred actions. This is a lower-level way
  to use a RunLoop instead of using `Ember.run()`.

  ```javascript
  Ember.run.begin();
  // code to be execute within a RunLoop
  Ember.run.end();
  ```

  @method end
  @return {void}
*/
Ember.run.end = function() {
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
  the `Ember.run.queues` property.

  ```javascript
  Ember.run.schedule('sync', this, function() {
    // this will be executed in the first RunLoop queue, when bindings are synced
    console.log("scheduled on sync queue");
  });

  Ember.run.schedule('actions', this, function() {
    // this will be executed in the 'actions' queue, after bindings have synced.
    console.log("scheduled on actions queue");
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
Ember.run.schedule = function(queue, target, method) {
  checkAutoRun();
  backburner.schedule.apply(backburner, arguments);
};

// Used by global test teardown
Ember.run.hasScheduledTimers = function() {
  return backburner.hasTimers();
};

// Used by global test teardown
Ember.run.cancelTimers = function () {
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
  Ember.run.sync();
  ```

  @method sync
  @return {void}
*/
Ember.run.sync = function() {
  if (backburner.currentInstance) {
    backburner.currentInstance.queues.sync.flush();
  }
};

/**
  Invokes the passed target/method and optional arguments after a specified
  period if time. The last parameter of this method must always be a number
  of milliseconds.

  You should use this method whenever you need to run some action after a
  period of time instead of using `setTimeout()`. This method will ensure that
  items that expire during the same script execution cycle all execute
  together, which is often more efficient than using a real setTimeout.

  ```javascript
  Ember.run.later(myContext, function() {
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
  @return {String} a string you can use to cancel the timer in
    `Ember.run.cancel` later.
*/
Ember.run.later = function(target, method) {
  return backburner.later.apply(backburner, arguments);
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
  @return {Object} Timer information for use in cancelling, see `Ember.run.cancel`.
*/
Ember.run.once = function(target, method) {
  checkAutoRun();
  var args = slice.call(arguments);
  args.unshift('actions');
  return backburner.scheduleOnce.apply(backburner, args);
};

/**
  Schedules a function to run one time in a given queue of the current RunLoop.
  Calling this method with the same queue/target/method combination will have
  no effect (past the initial call).

  Note that although you can pass optional arguments these will not be
  considered when looking for duplicates. New arguments will replace previous
  calls.

  ```javascript
  Ember.run(function() {
    var sayHi = function() { console.log('hi'); }
    Ember.run.scheduleOnce('afterRender', myContext, sayHi);
    Ember.run.scheduleOnce('afterRender', myContext, sayHi);
    // sayHi will only be executed once, in the afterRender queue of the RunLoop
  });
  ```

  Also note that passing an anonymous function to `Ember.run.scheduleOnce` will
  not prevent additional calls with an identical anonymous function from
  scheduling the items multiple times, e.g.:

  ```javascript
  function scheduleIt() {
    Ember.run.scheduleOnce('actions', myContext, function() { console.log("Closure"); });
  }
  scheduleIt();
  scheduleIt();
  // "Closure" will print twice, even though we're using `Ember.run.scheduleOnce`,
  // because the function we pass to it is anonymous and won't match the
  // previously scheduled operation.
  ```

  Available queues, and their order, can be found at `Ember.run.queues`

  @method scheduleOnce
  @param {String} [queue] The name of the queue to schedule against. Default queues are 'sync' and 'actions'.
  @param {Object} [target] The target of the method to invoke.
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @return {Object} Timer information for use in cancelling, see `Ember.run.cancel`.
*/
Ember.run.scheduleOnce = function(queue, target, method) {
  checkAutoRun();
  return backburner.scheduleOnce.apply(backburner, arguments);
};

/**
  Schedules an item to run from within a separate run loop, after
  control has been returned to the system. This is equivalent to calling
  `Ember.run.later` with a wait time of 1ms.

  ```javascript
  Ember.run.next(myContext, function() {
    // code to be executed in the next run loop,
    // which will be scheduled after the current one
  });
  ```

  Multiple operations scheduled with `Ember.run.next` will coalesce
  into the same later run loop, along with any other operations
  scheduled by `Ember.run.later` that expire right around the same
  time that `Ember.run.next` operations will fire.

  Note that there are often alternatives to using `Ember.run.next`.
  For instance, if you'd like to schedule an operation to happen
  after all DOM element operations have completed within the current
  run loop, you can make use of the `afterRender` run loop queue (added
  by the `ember-views` package, along with the preceding `render` queue
  where all the DOM element operations happen). Example:

  ```javascript
  App.MyCollectionView = Ember.CollectionView.extend({
    didInsertElement: function() {
      Ember.run.scheduleOnce('afterRender', this, 'processChildElements');
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

  One benefit of the above approach compared to using `Ember.run.next` is
  that you will be able to perform DOM/CSS operations before unprocessed
  elements are rendered to the screen, which may prevent flickering or
  other artifacts caused by delaying processing until after rendering.

  The other major benefit to the above approach is that `Ember.run.next`
  introduces an element of non-determinism, which can make things much
  harder to test, due to its reliance on `setTimeout`; it's much harder
  to guarantee the order of scheduled operations when they are scheduled
  outside of the current run loop, i.e. with `Ember.run.next`.

  @method next
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @return {Object} Timer information for use in cancelling, see `Ember.run.cancel`.
*/
Ember.run.next = function() {
  var args = slice.call(arguments);
  args.push(1);
  return backburner.later.apply(backburner, args);
};

/**
  Cancels a scheduled item. Must be a value returned by `Ember.run.later()`,
  `Ember.run.once()`, `Ember.run.next()`, `Ember.run.debounce()`, or
  `Ember.run.throttle()`.

  ```javascript
  var runNext = Ember.run.next(myContext, function() {
    // will not be executed
  });
  Ember.run.cancel(runNext);

  var runLater = Ember.run.later(myContext, function() {
    // will not be executed
  }, 500);
  Ember.run.cancel(runLater);

  var runOnce = Ember.run.once(myContext, function() {
    // will not be executed
  });
  Ember.run.cancel(runOnce);

  var throttle = Ember.run.throttle(myContext, function() {
    // will not be executed
  }, 1);
  Ember.run.cancel(throttle);

  var debounce = Ember.run.debounce(myContext, function() {
    // will not be executed
  }, 1);
  Ember.run.cancel(debounce);

  var debounceImmediate = Ember.run.debounce(myContext, function() {
    // will be executed since we passed in true (immediate)
  }, 100, true);
  // the 100ms delay until this method can be called again will be cancelled
  Ember.run.cancel(debounceImmediate);
  ```
  ```
  ```

  @method cancel
  @param {Object} timer Timer object to cancel
  @return {Boolean} true if cancelled or false/undefined if it wasn't found
*/
Ember.run.cancel = function(timer) {
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
    var myFunc = function() { console.log(this.name + ' ran.'); };
    var myContext = {name: 'debounce'};

    Ember.run.debounce(myContext, myFunc, 150);

    // less than 150ms passes

    Ember.run.debounce(myContext, myFunc, 150);

    // 150ms passes
    // myFunc is invoked with context myContext
    // console logs 'debounce ran.' one time.
  ```

  Immediate allows you to run the function immediately, but debounce
  other calls for this function until the wait time has elapsed. If
  `debounce` is called again before the specified time has elapsed,
  the timer is reset and the entire period msut pass again before
  the method can be called again.

  ```javascript
    var myFunc = function() { console.log(this.name + ' ran.'); };
    var myContext = {name: 'debounce'};

    Ember.run.debounce(myContext, myFunc, 150, true);

    // console logs 'debounce ran.' one time immediately.
    // 100ms passes

    Ember.run.debounce(myContext, myFunc, 150, true);

    // 150ms passes and nothing else is logged to the console and
    // the debouncee is no longer being watched

    Ember.run.debounce(myContext, myFunc, 150, true);

    // console logs 'debounce ran.' one time immediately.
    // 150ms passes and nothing else is logged tot he console and
    // the debouncee is no longer being watched

  ```

  @method debounce
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @param {Number} wait Number of milliseconds to wait.
  @param {Boolean} immediate Trigger the function on the leading instead of the trailing edge of the wait interval.
  @return {Array} Timer information for use in cancelling, see `Ember.run.cancel`.
*/
Ember.run.debounce = function() {
  return backburner.debounce.apply(backburner, arguments);
};

/**
  Ensure that the target method is never called more frequently than
  the specified spacing period.

  ```javascript
    var myFunc = function() { console.log(this.name + ' ran.'); };
    var myContext = {name: 'throttle'};

    Ember.run.throttle(myContext, myFunc, 150);

    // 50ms passes
    Ember.run.throttle(myContext, myFunc, 150);

    // 50ms passes
    Ember.run.throttle(myContext, myFunc, 150);

    // 50ms passes
    Ember.run.throttle(myContext, myFunc, 150);

    // 150ms passes
    // myFunc is invoked with context myContext
    // console logs 'throttle ran.' twice, 150ms apart.
  ```

  @method throttle
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    May be a function or a string. If you pass a string
    then it will be looked up on the passed target.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @param {Number} spacing Number of milliseconds to space out requests.
  @return {Array} Timer information for use in cancelling, see `Ember.run.cancel`.
*/
Ember.run.throttle = function() {
  return backburner.throttle.apply(backburner, arguments);
};

// Make sure it's not an autorun during testing
function checkAutoRun() {
  if (!Ember.run.currentRunLoop) {
    Ember.assert("You have turned on testing mode, which disabled the run-loop's autorun. You will need to wrap any code with asynchronous side-effects in an Ember.run", !Ember.testing);
  }
}
