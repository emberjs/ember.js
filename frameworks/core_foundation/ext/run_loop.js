// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// Create anonymous subclass of SC.RunLoop to add support for processing
// view queues and Timers.
SC.RunLoop = SC.RunLoop.extend(
/** @scope SC.RunLoop.prototype */ {

  /**
    The time the current run loop began executing.

    All timers scheduled during this run loop will begin executing as if
    they were scheduled at this time.

    @type Number
  */
  startTime: function() {
    if (!this._start) { this._start = Date.now(); }
    return this._start ;
  }.property(),

  /*

    Override to fire and reschedule timers once per run loop.

    Note that timers should fire only once per run loop to avoid the
    situation where a timer might cause an infinite loop by constantly
    rescheduling itself every time it is fired.
  */
  endRunLoop: function() {
    this.fireExpiredTimers(); // fire them timers!
    var ret = sc_super(); // do everything else
    this.scheduleNextTimeout(); // schedule a timeout if timers remain
    return ret;
  },

  // ..........................................................
  // TIMER SUPPORT
  //

  /**
    Schedules a timer to execute at the specified runTime.  You will not
    usually call this method directly.  Instead you should work with SC.Timer,
    which will manage both creating the timer and scheduling it.

    Calling this method on a timer that is already scheduled will remove it
    from the existing schedule and reschedule it.

    @param {SC.Timer} timer the timer to schedule
    @param {Time} runTime the time offset when you want this to run
    @returns {SC.RunLoop} receiver
  */
  scheduleTimer: function(timer, runTime) {
    // if the timer is already in the schedule, remove it.
    this._timerQueue = timer.removeFromTimerQueue(this._timerQueue);

    // now, add the timer ot the timeout queue.  This will walk down the
    // chain of timers to find the right place to insert it.
    this._timerQueue = timer.scheduleInTimerQueue(this._timerQueue, runTime);
    return this ;
  },

  /**
    Removes the named timer from the timeout queue.  If the timer is not
    currently scheduled, this method will have no effect.

    @param {SC.Timer} timer the timer to schedule
    @returns {SC.RunLoop} receiver
  */
  cancelTimer: function(timer) {
    this._timerQueue = timer.removeFromTimerQueue(this._timerQueue) ;
    return this ;
  },

  /** @private - shared array used by fireExpiredTimers to avoid memory */
  TIMER_ARRAY: [],

  /**
    Invokes any timers that have expired since this method was last called.
    Usually you will not call this method directly, but it will be invoked
    automatically at the end of the run loop.

    @returns {Boolean} YES if timers were fired, NO otherwise
  */
  fireExpiredTimers: function() {
    if (!this._timerQueue || this._firing) { return NO; } // nothing to do

    // max time we are allowed to run timers
    var now = this.get('startTime'),
        timers = this.TIMER_ARRAY,
        idx, len, didFire;

    // avoid recursive calls
    this._firing = YES;

    // collect timers to fire.  we do this one time up front to avoid infinite
    // loops where firing a timer causes it to schedule itself again, causing
    // it to fire again, etc.
    this._timerQueue = this._timerQueue.collectExpiredTimers(timers, now);

    // now step through timers and fire them.
    len = timers.length;
    for(idx=0;idx<len;idx++) { timers[idx].fire(); }

    // cleanup
    didFire = timers.length > 0 ;
    timers.length = 0 ; // reset for later use...
    this._firing = NO ;
    return didFire;
  },

  /** @private
    Invoked at the end of a runloop, if there are pending timers, a timeout
    will be scheduled to fire when the next timer expires.  You will not
    usually call this method yourself.  It is invoked automatically at the
    end of a run loop.

    @returns {Boolean} YES if a timeout was scheduled
  */
  scheduleNextTimeout: function() {
    var ret = NO,
      timer = this._timerQueue;

    // if no timer, and there is an existing timeout, attempt to cancel it.
    // NOTE: if this happens to be an invokeNext based timer, it will not be
    // cancelled.
    if (!timer) {
      if (this._timerTimeout) { this.unscheduleRunLoop(); }
      this._timerTimeout = null;

    // otherwise, determine if the timeout needs to be rescheduled.
    } else {
      var nextTimeoutAt = timer._timerQueueRunTime ;
      this._timerTimeout = this.scheduleRunLoop(nextTimeoutAt);
      ret = YES;
    }

    return ret ;
  }

});

// Recreate the currentRunLoop with the new methods
SC.RunLoop.currentRunLoop = SC.RunLoop.create();
SC.RunLoop.runLoopClass = SC.RunLoop;
