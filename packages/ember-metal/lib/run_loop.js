require('ember-metal/core'); // Ember.Logger
require('ember-metal/watching'); // Ember.watch.flushPending
require('ember-metal/observer'); // Ember.beginPropertyChanges, Ember.endPropertyChanges
require('ember-metal/utils'); // Ember.guidFor, Ember.tryFinally

/**
@module ember-metal
*/

// ..........................................................
// HELPERS
//

var slice = [].slice,
    forEach = Ember.ArrayPolyfills.forEach;

// invokes passed params - normalizing so you can pass target/func,
// target/string or just func
function invoke(target, method, args, ignore) {

  if (method === undefined) {
    method = target;
    target = undefined;
  }

  if ('string' === typeof method) { method = target[method]; }
  if (args && ignore > 0) {
    args = args.length > ignore ? slice.call(args, ignore) : null;
  }

  return Ember.handleErrors(function() {
    // IE8's Function.prototype.apply doesn't accept undefined/null arguments.
    return method.apply(target || this, args || []);
  }, this);
}


// ..........................................................
// RUNLOOP
//

var timerMark; // used by timers...

/**
Ember RunLoop (Private)

@class RunLoop
@namespace Ember
@private
@constructor
*/
var RunLoop = function(prev) {
  this._prev = prev || null;
  this.onceTimers = {};
};

RunLoop.prototype = {
  /**
    @method end
  */
  end: function() {
    this.flush();
  },

  /**
    @method prev
  */
  prev: function() {
    return this._prev;
  },

  // ..........................................................
  // Delayed Actions
  //

  /**
    @method schedule
    @param {String} queueName
    @param target
    @param method
  */
  schedule: function(queueName, target, method) {
    var queues = this._queues, queue;
    if (!queues) { queues = this._queues = {}; }
    queue = queues[queueName];
    if (!queue) { queue = queues[queueName] = []; }

    var args = arguments.length > 3 ? slice.call(arguments, 3) : null;
    queue.push({ target: target, method: method, args: args });
    return this;
  },

  /**
    @method flush
    @param {String} queueName
  */
  flush: function(queueName) {
    var queueNames, idx, len, queue, log;

    if (!this._queues) { return this; } // nothing to do

    function iter(item) {
      invoke(item.target, item.method, item.args);
    }

    function tryable() {
      forEach.call(queue, iter);
    }

    Ember.watch.flushPending(); // make sure all chained watchers are setup

    if (queueName) {
      while (this._queues && (queue = this._queues[queueName])) {
        this._queues[queueName] = null;

        // the sync phase is to allow property changes to propagate. don't
        // invoke observers until that is finished.
        if (queueName === 'sync') {
          log = Ember.LOG_BINDINGS;
          if (log) { Ember.Logger.log('Begin: Flush Sync Queue'); }

          Ember.beginPropertyChanges();

          Ember.tryFinally(tryable, Ember.endPropertyChanges);

          if (log) { Ember.Logger.log('End: Flush Sync Queue'); }

        } else {
          forEach.call(queue, iter);
        }
      }

    } else {
      queueNames = Ember.run.queues;
      len = queueNames.length;
      idx = 0;

      outerloop:
      while (idx < len) {
        queueName = queueNames[idx];
        queue = this._queues && this._queues[queueName];
        delete this._queues[queueName];

        if (queue) {
          // the sync phase is to allow property changes to propagate. don't
          // invoke observers until that is finished.
          if (queueName === 'sync') {
            log = Ember.LOG_BINDINGS;
            if (log) { Ember.Logger.log('Begin: Flush Sync Queue'); }

            Ember.beginPropertyChanges();

            Ember.tryFinally(tryable, Ember.endPropertyChanges);

            if (log) { Ember.Logger.log('End: Flush Sync Queue'); }
          } else {
            forEach.call(queue, iter);
          }
        }

        // Loop through prior queues
        for (var i = 0; i <= idx; i++) {
          if (this._queues && this._queues[queueNames[i]]) {
            // Start over at the first queue with contents
            idx = i;
            continue outerloop;
          }
        }

        idx++;
      }
    }

    timerMark = null;

    return this;
  }

};

Ember.RunLoop = RunLoop;

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
  Ember.run(function(){
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
  var loop,
  args = arguments;
  run.begin();

  function tryable() {
    if (target || method) {
      return invoke(target, method, args, 2);
    }
  }

  return Ember.tryFinally(tryable, run.end);
};

var run = Ember.run;


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
  run.currentRunLoop = new RunLoop(run.currentRunLoop);
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
  Ember.assert('must have a current run loop', run.currentRunLoop);

  function tryable()   { run.currentRunLoop.end();  }
  function finalizer() { run.currentRunLoop = run.currentRunLoop.prev(); }

  Ember.tryFinally(tryable, finalizer);
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
Ember.run.queues = ['sync', 'actions', 'destroy'];

/**
  Adds the passed target/method and any optional arguments to the named
  queue to be executed at the end of the RunLoop. If you have not already
  started a RunLoop when calling this method one will be started for you
  automatically.

  At the end of a RunLoop, any methods scheduled in this way will be invoked.
  Methods will be invoked in an order matching the named queues defined in
  the `run.queues` property.

  ```javascript
  Ember.run.schedule('sync', this, function(){
    // this will be executed in the first RunLoop queue, when bindings are synced
    console.log("scheduled on sync queue");
  });

  Ember.run.schedule('actions', this, function(){
    // this will be executed in the 'actions' queue, after bindings have synced.
    console.log("scheduled on actions queue");
  });

  // Note the functions will be run in order based on the run queues order. Output would be:
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
  var loop = run.autorun();
  loop.schedule.apply(loop, arguments);
};

var scheduledAutorun;
function autorun() {
  scheduledAutorun = null;
  if (run.currentRunLoop) { run.end(); }
}

// Used by global test teardown
Ember.run.hasScheduledTimers = function() {
  return !!(scheduledAutorun || scheduledLater);
};

// Used by global test teardown
Ember.run.cancelTimers = function () {
  if (scheduledAutorun) {
    clearTimeout(scheduledAutorun);
    scheduledAutorun = null;
  }
  if (scheduledLater) {
    clearTimeout(scheduledLater);
    scheduledLater = null;
  }
  timers = {};
};

/**
  Begins a new RunLoop if necessary and schedules a timer to flush the
  RunLoop at a later time. This method is used by parts of Ember to
  ensure the RunLoop always finishes. You normally do not need to call this
  method directly. Instead use `Ember.run()`

  @method autorun
  @example
    Ember.run.autorun();
  @return {Ember.RunLoop} the new current RunLoop
*/
Ember.run.autorun = function() {
  if (!run.currentRunLoop) {
    Ember.assert("You have turned on testing mode, which disabled the run-loop's autorun. You will need to wrap any code with asynchronous side-effects in an Ember.run", !Ember.testing);

    run.begin();

    if (!scheduledAutorun) {
      scheduledAutorun = setTimeout(autorun, 1);
    }
  }

  return run.currentRunLoop;
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
  run.autorun();
  run.currentRunLoop.flush('sync');
};

// ..........................................................
// TIMERS
//

var timers = {}; // active timers...

var scheduledLater, scheduledLaterExpires;
function invokeLaterTimers() {
  scheduledLater = null;
  run(function() {
    var now = (+ new Date()), earliest = -1;
    for (var key in timers) {
      if (!timers.hasOwnProperty(key)) { continue; }
      var timer = timers[key];
      if (timer && timer.expires) {
        if (now >= timer.expires) {
          delete timers[key];
          invoke(timer.target, timer.method, timer.args, 2);
        } else {
          if (earliest < 0 || (timer.expires < earliest)) { earliest = timer.expires; }
        }
      }
    }

    // schedule next timeout to fire when the earliest timer expires
    if (earliest > 0) { 
      scheduledLater = setTimeout(invokeLaterTimers, earliest - now); 
      scheduledLaterExpires = earliest;
    }
  });
}

/**
  Invokes the passed target/method and optional arguments after a specified
  period if time. The last parameter of this method must always be a number
  of milliseconds.

  You should use this method whenever you need to run some action after a
  period of time instead of using `setTimeout()`. This method will ensure that
  items that expire during the same script execution cycle all execute
  together, which is often more efficient than using a real setTimeout.

  ```javascript
  Ember.run.later(myContext, function(){
    // code here will execute within a RunLoop in about 500ms with this == myContext
  }, 500);
  ```

  @method later
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @param {Number} wait
    Number of milliseconds to wait.
  @return {String} a string you can use to cancel the timer in
    {{#crossLink "Ember/run.cancel"}}{{/crossLink}} later.
*/
Ember.run.later = function(target, method) {
  var args, expires, timer, guid, wait;

  // setTimeout compatibility...
  if (arguments.length===2 && 'function' === typeof target) {
    wait   = method;
    method = target;
    target = undefined;
    args   = [target, method];
  } else {
    args = slice.call(arguments);
    wait = args.pop();
  }

  expires = (+ new Date()) + wait;
  timer   = { target: target, method: method, expires: expires, args: args };
  guid    = Ember.guidFor(timer);
  timers[guid] = timer;
    
  if(scheduledLater && expires < scheduledLaterExpires) {
    // Cancel later timer (then reschedule earlier timer below)
    clearTimeout(scheduledLater);
    scheduledLater = null;
  }

  if (!scheduledLater) { 
    // Schedule later timers to be run.
    scheduledLater = setTimeout(invokeLaterTimers, wait);
    scheduledLaterExpires = expires;
  } 

  return guid;
};

function invokeOnceTimer(guid, onceTimers) {
  if (onceTimers[this.tguid]) { delete onceTimers[this.tguid][this.mguid]; }
  if (timers[guid]) { invoke(this.target, this.method, this.args); }
  delete timers[guid];
}

function scheduleOnce(queue, target, method, args) {
  var tguid = Ember.guidFor(target),
    mguid = Ember.guidFor(method),
    onceTimers = run.autorun().onceTimers,
    guid = onceTimers[tguid] && onceTimers[tguid][mguid],
    timer;

  if (guid && timers[guid]) {
    timers[guid].args = args; // replace args
  } else {
    timer = {
      target: target,
      method: method,
      args:   args,
      tguid:  tguid,
      mguid:  mguid
    };

    guid  = Ember.guidFor(timer);
    timers[guid] = timer;
    if (!onceTimers[tguid]) { onceTimers[tguid] = {}; }
    onceTimers[tguid][mguid] = guid; // so it isn't scheduled more than once

    run.schedule(queue, timer, invokeOnceTimer, guid, onceTimers);
  }

  return guid;
}

/**
  Schedules an item to run one time during the current RunLoop. Calling
  this method with the same target/method combination will have no effect.

  Note that although you can pass optional arguments these will not be
  considered when looking for duplicates. New arguments will replace previous
  calls.

  ```javascript
  Ember.run(function(){
    var doFoo = function() { foo(); }
    Ember.run.once(myContext, doFoo);
    Ember.run.once(myContext, doFoo);
    // doFoo will only be executed once at the end of the RunLoop
  });
  ```
  
  Also note that passing an anonymous function to `Ember.run.once` will
  not prevent additional calls with an identical anonymous function from 
  scheduling the items multiple times, e.g.:
  
  ```javascript
  function scheduleIt() {
    Ember.run.once(myContext, function() { console.log("Closure"); });
  }
  scheduleIt();
  scheduleIt();
  // "Closure" will print twice, even though we're using `Ember.run.once`,
  // because the function we pass to it is anonymous and won't match the 
  // previously scheduled operation.
  ```

  @method once
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @return {Object} timer
*/
Ember.run.once = function(target, method) {
  return scheduleOnce('actions', target, method, slice.call(arguments, 2));
};

Ember.run.scheduleOnce = function(queue, target, method, args) {
  return scheduleOnce(queue, target, method, slice.call(arguments, 3));
};

/**
  Schedules an item to run after control has been returned to the system.
  This is equivalent to calling `Ember.run.later` with a wait time of 1ms. 

  ```javascript
  Ember.run.next(myContext, function(){
    // code to be executed in the next RunLoop, which will be scheduled after the current one
  });
  ```

  @method next
  @param {Object} [target] target of method to invoke
  @param {Function|String} method The method to invoke.
    If you pass a string it will be resolved on the
    target at the time the method is invoked.
  @param {Object} [args*] Optional arguments to pass to the timeout.
  @return {Object} timer
*/
Ember.run.next = function() {
  var args = slice.call(arguments);
  args.push(1); // 1 millisecond wait
  return run.later.apply(this, args);
};

/**
  Cancels a scheduled item. Must be a value returned by `Ember.run.later()`,
  `Ember.run.once()`, or `Ember.run.next()`.

  ```javascript
  var runNext = Ember.run.next(myContext, function(){
    // will not be executed
  });
  Ember.run.cancel(runNext);

  var runLater = Ember.run.later(myContext, function(){
    // will not be executed
  }, 500);
  Ember.run.cancel(runLater);

  var runOnce = Ember.run.once(myContext, function(){
    // will not be executed
  });
  Ember.run.cancel(runOnce);
  ```

  @method cancel
  @param {Object} timer Timer object to cancel
  @return {void}
*/
Ember.run.cancel = function(timer) {
  delete timers[timer];
};
