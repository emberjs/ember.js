// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2010 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals sc_assert */

require('sproutcore-runtime/system/object');



// ..........................................................
// HELPERS
//

var slice = Array.prototype.slice;
var argsEmpty = [];

// invokes passed params - normalizing so you can pass target/func,
// target/string or just func
function invoke(target, method, args, ignore) {

  if (method===undefined) {
    method = target;
    target = undefined;
  }

  if ('string'===typeof method) method = target[method];
  if (args && ignore>0) {
    args = args.length>ignore ? slice.call(args, ignore) : argsEmpty;
  }
  return method.apply(target, args);
}


// ..........................................................
// RUNLOOP
//

var timerMark; // used by timers...

var RunLoop = SC.Object.extend({

  _prev: null,

  init: function(prev) {
    this._prev = prev;
    this.onceTimers = {};
  },

  end: function() {
    this.flush();
    return this._prev;
  },

  // ..........................................................
  // Delayed Actions
  //

  schedule: function(queueName, target, method) {
    var queues = this._queues, queue;
    if (!queues) queues = this._queues = {};
    queue = queues[queueName];
    if (!queue) queue = queues[queueName] = [];

    var args = arguments.length>3 ? slice.call(arguments, 3) : null;
    queue.push({ target: target, method: method, args: args });
    return this;
  },

  flush: function(queueName) {
    var queues = this._queues, queueNames, idx, len, queue, log;

    if (!queues) return this; // nothing to do

    function iter(item) {
      invoke(item.target, item.method, item.args);
    }

    SC.watch.flushPending(); // make sure all chained watchers are setup

    if (queueName) {
      while (this._queues && (queue = this._queues[queueName])) {
        this._queues[queueName] = null;

        //@if (debug)
        log = SC.LOG_BINDINGS && queueName==='sync';
        if (log) SC.Logger.log('Begin: Flush Sync Queue');
        //@endif

        // the sync phase is to allow property changes to propogate.  don't
        // invoke observers until that is finished.
        if (queueName === 'sync') SC.beginPropertyChanges();
        queue.forEach(iter);
        if (queueName === 'sync') SC.endPropertyChanges();

        //@if (debug)
        if (log) SC.Logger.log('End: Flush Sync Queue');
        //@endif

      }

    } else {
      queueNames = SC.run.queues;
      len = queueNames.length;
      do {
        this._queues = null;
        for(idx=0;idx<len;idx++) {
          queueName = queueNames[idx];
          queue = queues[queueName];

          //@if (debug)
          log = SC.LOG_BINDINGS && queueName==='sync';
          if (log) SC.Logger.log('Begin: Flush Sync Queue');
          //@endif

          if (queueName === 'sync') SC.beginPropertyChanges();
          if (queue) queue.forEach(iter);
          if (queueName === 'sync') SC.endPropertyChanges();

          //@if (debug)
          if (log) SC.Logger.log('End: Flush Sync Queue');
          //@endif

        }

      } while (queues = this._queues); // go until queues stay clean
    }

    timerMark = null;

    return this;
  }

});

SC.RunLoop = RunLoop;

// ..........................................................
// SC.run - this is ideally the only public API the dev sees
//

var run;

/**
  Runs the passed target and method inside of a runloop, ensuring any
  deferred actions including bindings and views updates are flushed at the
  end.

  Normally you should not need to invoke this method yourself.  However if
  you are implementing raw event handlers when interfacing with other
  libraries or plugins, you should probably wrap all of your code inside this
  call.

  @function
  @param {Object} target
    (Optional) target of method to call

  @param {Function|String} method
    Method to invoke.  May be a function or a string.  If you pass a string
    then it will be looked up on the passed target.

  @param {Object...} args
    Any additional arguments you wish to pass to the method.

  @returns {Object} return value from invoking the passed function.
*/
SC.run = run = function(target, method) {

  var ret, loop;
  run.begin();
  if (target || method) ret = invoke(target, method);
  run.end();
  return ret;
};

/**
  Begins a new RunLoop.  Any deferred actions invoked after the begin will
  be buffered until you invoke a matching call to SC.run.end().  This is
  an lower-level way to use a RunLoop instead of using SC.run().

  @returns {void}
*/
SC.run.begin = function() {
  run.currentRunLoop = new RunLoop(run.currentRunLoop);
};

/**
  Ends a RunLoop.  This must be called sometime after you call SC.run.begin()
  to flush any deferred actions.  This is a lower-level way to use a RunLoop
  instead of using SC.run().

  @returns {void}
*/
SC.run.end = function() {
  sc_assert('must have a current run loop', run.currentRunLoop);
  run.currentRunLoop = run.currentRunLoop.end();
};

/**
  Array of named queues.  This array determines the order in which queues
  are flushed at the end of the RunLoop.  You can define your own queues by
  simply adding the queue name to this array.  Normally you should not need
  to inspect or modify this property.

  @property {String}
*/
SC.run.queues = ['sync', 'actions', 'timers'];

/**
  Adds the passed target/method and any optional arguments to the named
  queue to be executed at the end of the RunLoop.  If you have not already
  started a RunLoop when calling this method one will be started for you
  automatically.

  At the end of a RunLoop, any methods scheduled in this way will be invoked.
  Methods will be invoked in an order matching the named queues defined in
  the run.queues property.

  @param {String} queue
    The name of the queue to schedule against.  Default queues are 'sync' and
    'actions'

  @param {Object} target
    (Optional) target object to use as the context when invoking a method.

  @param {String|Function} method
    The method to invoke.  If you pass a string it will be resolved on the
    target object at the time the scheduled item is invoked allowing you to
    change the target function.

  @param {Object} arguments...
    Optional arguments to be passed to the queued method.

  @returns {void}
*/
SC.run.schedule = function(queue, target, method) {
  var loop = run.autorun();
  loop.schedule.apply(loop, arguments);
};

var autorunTimer;

function autorun() {
  autorunTimer = null;
  if (run.currentRunLoop) run.end();
}

/**
  Begins a new RunLoop is necessary and schedules a timer to flush the
  RunLoop at a later time.  This method is used by parts of SproutCore to
  ensure the RunLoop always finishes.  You normally do not need to call this
  method directly.  Instead use SC.run().

  @returns {SC.RunLoop} the new current RunLoop
*/
SC.run.autorun = function() {

  if (!run.currentRunLoop) run.begin();
  if (!autorunTimer) autorunTimer = setTimeout(autorun, 1);

  return run.currentRunLoop;
};

/**
  Immediately flushes any events scheduled in the 'sync' queue.  Bindings
  use this queue so this method is a useful way to immediately force all
  bindings in the application to sync.

  You should call this method anytime you need any changed state to propogate
  throughout the app immediately without repainting the UI.

  @returns {void}
*/
SC.run.sync = function() {
  run.autorun();
  run.currentRunLoop.flush('sync');
};

// ..........................................................
// TIMERS
//

var timers = {}; // active timers...

var laterScheduled = false;
function invokeLaterTimers() {
  var now = (+ new Date()), earliest = -1;
  for(var key in timers) {
    if (!timers.hasOwnProperty(key)) continue;
    var timer = timers[key];
    if (timer && timer.expires) {
      if (now >= timer.expires) {
        delete timers[key];
        invoke(timer.target, timer.method, timer.args, 2);
      } else {
        if (earliest<0 || (timer.expires < earliest)) earliest=timer.expires;
      }
    }
  }

  // schedule next timeout to fire...
  if (earliest>0) setTimeout(invokeLaterTimers, earliest-(+ new Date())); 
}

/**
  Invokes the passed target/method and optional arguments after a specified
  period if time.  The last parameter of this method must always be a number
  of milliseconds.

  You should use this method whenever you need to run some action after a
  period of time inside of using setTimeout().  This method will ensure that
  items that expire during the same script execution cycle all execute
  together, which is often more efficient than using a real setTimeout.

  @param {Object} target
    (optional) target of method to invoke

  @param {Function|String} method
    The method to invoke.  If you pass a string it will be resolved on the
    target at the time the method is invoked.

  @param {Object...} args
    Optional arguments to pass to the timeout.

  @param {Number} wait
    Number of milliseconds to wait.

  @returns {Timer} an object you can use to cancel a timer at a later time.
*/
SC.run.later = function(target, method) {
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
  
  expires = (+ new Date())+wait;
  timer   = { target: target, method: method, expires: expires, args: args };
  guid    = SC.guidFor(timer);
  timers[guid] = timer;
  run.once(timers, invokeLaterTimers);
  return guid;
};

function invokeOnceTimer(guid, onceTimers) {
  if (onceTimers[this.tguid]) delete onceTimers[this.tguid][this.mguid];
  if (timers[guid]) invoke(this.target, this.method, this.args, 2);
  delete timers[guid];
}

/**
  Schedules an item to run one time during the current RunLoop.  Calling
  this method with the same target/method combination will have no effect.

  Note that although you can pass optional arguments these will not be
  considered when looking for duplicates.  New arguments will replace previous
  calls.

  @param {Object} target
    (optional) target of method to invoke

  @param {Function|String} method
    The method to invoke.  If you pass a string it will be resolved on the
    target at the time the method is invoked.

  @param {Object...} args
    Optional arguments to pass to the timeout.


  @returns {Object} timer
*/
SC.run.once = function(target, method) {
  var tguid = SC.guidFor(target), mguid = SC.guidFor(method), guid, timer;

  var onceTimers = run.autorun().onceTimers;
  guid = onceTimers[tguid] && onceTimers[tguid][mguid];
  if (guid && timers[guid]) {
    timers[guid].args = slice.call(arguments); // replace args

  } else {
    timer = {
      target: target,
      method: method,
      args:   slice.call(arguments),
      tguid:  tguid,
      mguid:  mguid
    };

    guid  = SC.guidFor(timer);
    timers[guid] = timer;
    if (!onceTimers[tguid]) onceTimers[tguid] = {};
    onceTimers[tguid][mguid] = guid; // so it isn't scheduled more than once

    run.schedule('timers', timer, invokeOnceTimer, guid, onceTimers);
  }

  return guid;
};

var scheduledNext = false;
function invokeNextTimers() {
  scheduledNext = null;
  for(var key in timers) {
    if (!timers.hasOwnProperty(key)) continue;
    var timer = timers[key];
    if (timer.next) {
      delete timers[key];
      invoke(timer.target, timer.method, timer.args, 2);
    }
  }
}

/**
  Schedules an item to run after control has been returned to the system.
  This is often equivalent to calling setTimeout(function...,1).

  @param {Object} target
    (optional) target of method to invoke

  @param {Function|String} method
    The method to invoke.  If you pass a string it will be resolved on the
    target at the time the method is invoked.

  @param {Object...} args
    Optional arguments to pass to the timeout.

  @returns {Object} timer
*/
SC.run.next = function(target, method) {
  var timer, guid;

  timer = {
    target: target,
    method: method,
    args: slice.call(arguments),
    next: true
  };

  guid = SC.guidFor(timer);
  timers[guid] = timer;

  if (!scheduledNext) scheduledNext = setTimeout(invokeNextTimers, 1);
  return guid;
};

/**
  Cancels a scheduled item.  Must be a value returned by `SC.run.later()`,
  `SC.run.once()`, or `SC.run.next()`.

  @param {Object} timer
    Timer object to cancel

  @returns {void}
*/
SC.run.cancel = function(timer) {
  delete timers[timer];
};


// ..........................................................
// DEPRECATED API
//

/**
  @deprecated
  @method

  Use `#js:SC.run.begin()` instead
*/
SC.RunLoop.begin = SC.run.begin;

/**
  @deprecated
  @method

  Use `#js:SC.run.end()` instead
*/
SC.RunLoop.end = SC.run.end;


