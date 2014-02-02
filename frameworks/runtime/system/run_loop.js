// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('ext/function');
sc_require('private/observer_set');


// When in debug mode, users can log deferred calls (such as .invokeOnce()) by
// setting SC.LOG_DEFERRED_CALLS.  We'll declare the variable explicitly to make
// life easier for people who want to enter it inside consoles that auto-
// complete.
//@if (debug)
if (!SC.LOG_DEFERRED_CALLS) SC.LOG_DEFERRED_CALLS = false;
//@endif

/**
  @class

  The run loop provides a universal system for coordinating events within
  your application.  The run loop processes timers as well as pending
  observer notifications within your application.

  To use a RunLoop within your application, you should make sure your event
  handlers always begin and end with SC.RunLoop.begin() and SC.RunLoop.end()

  The RunLoop is important because bindings do not fire until the end of
  your run loop is reached.  This improves the performance of your
  application.

  Example:

  This is how you could write your mouseup handler in jQuery:

        $('#okButton').on('click', function () {
          SC.run(function () {

            // handle click event...

          }); // allows bindings to trigger...
        });

  @extends SC.Object
  @since SproutCore 1.0
*/
SC.RunLoop = SC.Object.extend(
  /** @scope SC.RunLoop.prototype */ {

  /**
    Call this method whenver you begin executing code.

    This is typically invoked automatically for you from event handlers and
    the timeout handler.  If you call setTimeout() or setInterval() yourself,
    you may need to invoke this yourself.

    @returns {SC.RunLoop} receiver
  */
  beginRunLoop: function () {
    this._start = new Date().getTime(); // can't use Date.now() in runtime
    if (SC.LOG_BINDINGS || SC.LOG_OBSERVERS) {
      SC.Logger.log("-- SC.RunLoop.beginRunLoop at %@".fmt(this._start));
    }
    this._runLoopInProgress = YES;
    this._flushinvokeNextQueue();
    return this;
  },

  /**
    YES when a run loop is in progress

    @property
    @type Boolean
  */
  isRunLoopInProgress: function () {
    return this._runLoopInProgress;
  }.property(),

  /**
    Call this method whenever you are done executing code.

    This is typically invoked automatically for you from event handlers and
    the timeout handler.  If you call setTimeout() or setInterval() yourself
    you may need to invoke this yourself.

    @returns {SC.RunLoop} receiver
  */
  endRunLoop: function () {
    // at the end of a runloop, flush all the delayed actions we may have
    // stored up.  Note that if any of these queues actually run, we will
    // step through all of them again.  This way any changes get flushed
    // out completely.

    if (SC.LOG_BINDINGS || SC.LOG_OBSERVERS) {
      SC.Logger.log("-- SC.RunLoop.endRunLoop ~ flushing application queues");
    }

    this.flushAllPending();

    this._start = null;

    if (SC.LOG_BINDINGS || SC.LOG_OBSERVERS) {
      SC.Logger.log("-- SC.RunLoop.endRunLoop ~ End");
    }

    SC.RunLoop.lastRunLoopEnd = Date.now();
    this._runLoopInProgress = NO;

    // If there are members in the invokeNextQueue, be sure to schedule another
    // run of the run loop.
    var queue = this._invokeNextQueue;
    if (queue && queue.getMembers().length) {
      this._invokeNextTimeout = this.scheduleRunLoop(SC.RunLoop.lastRunLoopEnd);
    }

    return this;
  },

  /**
    Repeatedly flushes all bindings, observers, and other queued functions until all queues are empty.
  */
  flushAllPending: function () {
    var didChange;

    do {
      didChange = this.flushApplicationQueues();
      if (!didChange) didChange = this._flushinvokeLastQueue();
    } while (didChange);
  },


  /**
    Invokes the passed target/method pair once at the end of the runloop.
    You can call this method as many times as you like and the method will
    only be invoked once.

    Usually you will not call this method directly but use invokeOnce()
    defined on SC.Object.

    Note that in development mode only, the object and method that call this
    method will be recorded, for help in debugging scheduled code.

    @param {Object} target
    @param {Function} method
    @returns {SC.RunLoop} receiver
  */
  invokeOnce: function (target, method) {
    //@if(debug)
    // Calling invokeOnce outside of a run loop causes problems when coupled
    // with time dependent methods invokeNext and invokeLater, because the
    // time dependent methods execute at the start of the next run of the run
    // loop and may fire before the invokeOnce code in this case.
    var isRunLoopInProgress = this.get('isRunLoopInProgress');
    if (!isRunLoopInProgress) {
      SC.warn("Developer Warning: invokeOnce called outside of the run loop, which may cause unexpected problems. Check the stack trace below for what triggered this, and see http://blog.sproutcore.com/1-10-upgrade-invokefoo/ for more.");
      console.trace();
    }
    //@endif
    // normalize
    if (method === undefined) {
      method = target;
      target = this;
    }

    var deferredCallLoggingInfo;      // Used only in debug mode

    //@if (debug)
    // When in debug mode, SC.Object#invokeOnce() will pass in the originating
    // method, target, and stack.  That way, we'll record the interesting parts
    // rather than having most of these calls seemingly coming from
    // SC.Object#invokeOnce().
    //
    // If it was not specified, we'll record the originating function ourselves.
    var shouldLog = SC.LOG_DEFERRED_CALLS;
    if (shouldLog) {
      var originatingTarget = arguments[2],
          originatingMethod = arguments[3],
          originatingStack  = arguments[4];

      if (!originatingTarget) originatingTarget = null;   // More obvious when debugging
      if (!originatingMethod) {
        originatingStack  = SC._getRecentStack();
        originatingMethod = originatingStack[0];
      }

      deferredCallLoggingInfo = {
        originatingTarget: originatingTarget,
        originatingMethod: originatingMethod,
        originatingStack:  originatingStack
      };
    }
    //@endif

    if (typeof method === "string") method = target[method];
    if (!this._invokeQueue) this._invokeQueue = SC.ObserverSet.create();
    if (method) this._invokeQueue.add(target, method, undefined, deferredCallLoggingInfo);
    return this;
  },

  /**
    Invokes the passed target/method pair at the very end of the run loop,
    once all other delayed invoke queues have been flushed.  Use this to
    schedule cleanup methods at the end of the run loop once all other work
    (including rendering) has finished.

    If you call this with the same target/method pair multiple times it will
    only invoke the pair only once at the end of the runloop.

    Usually you will not call this method directly but use invokeLast()
    defined on SC.Object.

    Note that in development mode only, the object and method that call this
    method will be recorded, for help in debugging scheduled code.

    @param {Object} target
    @param {Function} method
    @returns {SC.RunLoop} receiver
  */
  invokeLast: function (target, method) {
    //@if(debug)
    // Calling invokeLast outside of a run loop causes problems when coupled
    // with time dependent methods invokeNext and invokeLater, because the
    // time dependent methods execute at the start of the next run of the run
    // loop and may fire before the invokeLast code in this case.
    var isRunLoopInProgress = this.get('isRunLoopInProgress');
    if (!isRunLoopInProgress) {
      SC.warn("Developer Warning: invokeLast called outside of the run loop, which may cause unexpected problems. Check the stack trace below for what triggered this, and see http://blog.sproutcore.com/1-10-upgrade-invokefoo/ for more.");
      console.trace();
    }
    //@endif

    // normalize
    if (method === undefined) {
      method = target;
      target = this;
    }

    var deferredCallLoggingInfo;      // Used only in debug mode

    //@if (debug)
    // When in debug mode, SC.Object#invokeOnce() will pass in the originating
    // method, target, and stack.  That way, we'll record the interesting parts
    // rather than having most of these calls seemingly coming from
    // SC.Object#invokeOnce().
    //
    // If it was not specified, we'll record the originating function ourselves.
    var shouldLog = SC.LOG_DEFERRED_CALLS;
    if (shouldLog) {
      var originatingTarget = arguments[2],
          originatingMethod = arguments[3],
          originatingStack  = arguments[4];

      if (!originatingTarget) originatingTarget = null;   // More obvious when debugging
      if (!originatingMethod) {
        originatingStack  = SC._getRecentStack();
        originatingMethod = originatingStack[0];
      }

      deferredCallLoggingInfo = {
        originatingTarget: originatingTarget,
        originatingMethod: originatingMethod,
        originatingStack:  originatingStack
      };
    }
    //@endif


    if (typeof method === "string") method = target[method];
    if (!this._invokeLastQueue) this._invokeLastQueue = SC.ObserverSet.create();
    this._invokeLastQueue.add(target, method, undefined, deferredCallLoggingInfo);
    return this;
  },

  /**
    Invokes the passed target/method pair once at the beginning of the next
    run of the run loop, before any other methods (including events) are
    processed.  Use this to defer painting to make views more responsive.

    If you call this with the same target/method pair multiple times it will
    only invoke the pair only once at the beginning of the next runloop.

    Usually you will not call this method directly but use invokeNext()
    defined on SC.Object.

    @param {Object} target
    @param {Function} method
    @returns {SC.RunLoop} receiver
  */
  invokeNext: function (target, method) {
    // normalize
    if (method === undefined) {
      method = target;
      target = this;
    }

    if (typeof method === "string") method = target[method];
    if (!this._invokeNextQueue) this._invokeNextQueue = SC.ObserverSet.create();
    this._invokeNextQueue.add(target, method);
    return this;
  },

  /**
    Executes any pending events at the end of the run loop.  This method is
    called automatically at the end of a run loop to flush any pending
    queue changes.

    The default method will invoke any one time methods and then sync any
    bindings that might have changed.  You can override this method in a
    subclass if you like to handle additional cleanup.

    This method must return YES if it found any items pending in its queues
    to take action on.  endRunLoop will invoke this method repeatedly until
    the method returns NO.  This way if any if your final executing code
    causes additional queues to trigger, then can be flushed again.

    @returns {Boolean} YES if items were found in any queue, NO otherwise
  */
  flushApplicationQueues: function () {
    var hadContent = NO,
        // execute any methods in the invokeQueue.
        queue = this._invokeQueue;
    if (queue && queue.getMembers().length) {
      this._invokeQueue = null; // reset so that a new queue will be created
      hadContent = YES; // needs to execute again
      queue.invokeMethods();
    }

    // flush any pending changed bindings.  This could actually trigger a
    // lot of code to execute.
    return SC.Binding.flushPendingChanges() || hadContent;
  },

  _flushinvokeLastQueue: function () {
    var queue = this._invokeLastQueue, hadContent = NO;
    if (queue && queue.getMembers().length) {
      this._invokeLastQueue = null; // reset queue.
      hadContent = YES; // has targets!
      if (hadContent) queue.invokeMethods();
    }
    return hadContent;
  },

  _flushinvokeNextQueue: function () {
    var queue = this._invokeNextQueue, hadContent = NO;
    if (queue && queue.getMembers().length) {
      this._invokeNextQueue = null; // reset queue.
      hadContent = YES; // has targets!
      if (hadContent) queue.invokeMethods();
    }
    return hadContent;
  },

  /** @private
    Schedules the run loop to run at the given time.  If the run loop is
    already scheduled to run earlier nothing will change, but if the run loop
    is not scheduled or it is scheduled later, then it will be rescheduled
    to the value of nextTimeoutAt.

    @returns timeoutID {Number} The ID of the timeout to start the next run of the run loop
  */
  scheduleRunLoop: function (nextTimeoutAt) {
    /*jshint eqnull:true*/
    // If there is no run loop scheduled or if the scheduled run loop is later, reschedule.
    if (this._timeoutAt == null || this._timeoutAt > nextTimeoutAt) {
      // clear existing...
      if (this._timeout) { clearTimeout(this._timeout); }

      // reschedule
      var delay = Math.max(0, nextTimeoutAt - Date.now());
      this._timeout = setTimeout(this._timeoutDidFire, delay);
      this._timeoutAt = nextTimeoutAt;
    }

    return this._timeout;
  },

  /** @private
    Invoked when a timeout actually fires.  Simply cleanup, then begin and end
    a runloop. Note that this function will be called with 'this' set to the
    global context, hence the need to lookup the current run loop.
  */
  _timeoutDidFire: function () {
    var rl = SC.RunLoop.currentRunLoop;
    rl._timeout = rl._timeoutAt = rl._invokeNextTimeout = null; // cleanup
    SC.run();  // begin/end runloop to trigger timers.
  },

  /** @private Unschedule the run loop that is scheduled for the given timeoutID */
  unscheduleRunLoop: function () {
    // Don't unschedule if the timeout is shared with an invokeNext timeout.
    if (!this._invokeNextTimeout) {
      clearTimeout(this._timeout);
      this._timeout = this._timeoutAt = null; // cleanup
    }
  }

});


//@if(debug)
 /**
  Will return the recent stack as a hash with numerical keys, for nice output
  in some browsers’ debuggers.  The “recent” stack is capped at 6 entries.

  This is used by, amongst other places, SC.LOG_DEFERRED_CALLS.

  @returns {Hash}
*/
SC._getRecentStack = function () {
  var currentFunction = arguments.callee.caller,
      i               = 0,
      stack           = {},
      first           = YES,
      functionName;

  while (currentFunction  &&  i < 10) {
    // Skip ourselves!
    if (first) {
      first = NO;
    } else {
      functionName = currentFunction.displayName || currentFunction.toString().substring(0, 40);
      stack[i++]   = functionName;
    }
    currentFunction = currentFunction.caller;
  }

  return stack;
};
//@endif



/**
  The current run loop.  This is created automatically the first time you
  call begin().

  @type SC.RunLoop
*/
SC.RunLoop.currentRunLoop = null;

/**
  The default RunLoop class.  If you choose to extend the RunLoop, you can
  set this property to make sure your class is used instead.

  @type Class
*/
SC.RunLoop.runLoopClass = SC.RunLoop;

/**
  Begins a new run loop on the currentRunLoop.  If you are already in a
  runloop, this method has no effect.

  @returns {SC.RunLoop} receiver
*/
SC.RunLoop.begin = function () {
  var runLoop = this.currentRunLoop;
  if (!runLoop) runLoop = this.currentRunLoop = this.runLoopClass.create();
  runLoop.beginRunLoop();
  return this;
};

/**
  Ends the run loop on the currentRunLoop.  This will deliver any final
  pending notifications and schedule any additional necessary cleanup.

  @returns {SC.RunLoop} receiver
*/
SC.RunLoop.end = function () {
  var runLoop = this.currentRunLoop;
  if (!runLoop) {
    throw new Error("SC.RunLoop.end() called outside of a runloop!");
  }
  runLoop.endRunLoop();
  return this;
};


/**
  Call this to kill the current run loop--stopping all propagation of bindings
  and observers and clearing all timers.

  This is useful if you are popping up an error catcher: you need a run loop
  for the error catcher, but you don't want the app itself to continue
  running.
*/
SC.RunLoop.kill = function () {
  this.currentRunLoop = this.runLoopClass.create();
  return this;
};

/**
  Returns YES when a run loop is in progress

  @return {Boolean}
*/
SC.RunLoop.isRunLoopInProgress = function () {
  if (this.currentRunLoop) return this.currentRunLoop.get('isRunLoopInProgress');
  return NO;
};

/**
  Executes a passed function in the context of a run loop. If called outside a
  runloop, starts and ends one. If called inside an existing runloop, is
  simply executes the function unless you force it to create a nested runloop.

  If an exception is thrown during execution, we give an error catcher the
  opportunity to handle it before allowing the exception to bubble again.

  @param {Function} callback callback to execute
  @param {Object} target context for callback
  @param {Boolean} if YES, starts/ends a new runloop even if one is already running
*/
SC.run = function (callback, target, forceNested) {
  var alreadyRunning = SC.RunLoop.isRunLoopInProgress();

  // Only use a try/catch block if we have an ExceptionHandler
  // since in some browsers try/catch causes a loss of the backtrace
  if (SC.ExceptionHandler && SC.ExceptionHandler.enabled) {
    try {
      if (forceNested || !alreadyRunning) SC.RunLoop.begin();
      if (callback) callback.call(target);
      if (forceNested || !alreadyRunning) SC.RunLoop.end();
    } catch (e) {
      var handled = SC.ExceptionHandler.handleException(e);

      // If the exception was not handled, throw it again so the browser
      // can deal with it (and potentially use it for debugging).
      // (We don't throw it in IE because the user will see two errors)
      if (!handled && !SC.browser.isIE) {
        throw e;
      }
    }
  } else {
    if (forceNested || !alreadyRunning) SC.RunLoop.begin();
    if (callback) callback.call(target);
    if (forceNested || !alreadyRunning) SC.RunLoop.end();
  }
};

/**
  Wraps the passed function in code that ensures a run loop will
  surround it when run.
*/
SC.RunLoop.wrapFunction = function (func) {
  var ret = function () {
    var alreadyRunning = SC.RunLoop.isRunLoopInProgress();
    if (!alreadyRunning) SC.RunLoop.begin();
    var ret = arguments.callee.wrapped.apply(this, arguments);
    if (!alreadyRunning) SC.RunLoop.end();
    return ret;
  };
  ret.wrapped = func;
  return ret;
};
