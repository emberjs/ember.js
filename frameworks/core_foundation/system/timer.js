// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class

  A Timer executes a method after a defined period of time.  Timers are
  significantly more efficient than using setTimeout() or setInterval()
  because they are cooperatively scheduled using the run loop.  Timers are
  also gauranteed to fire at the same time, making it far easier to keep
  multiple timers in sync.

  ## Overview

  Timers were created for SproutCore as a way to efficiently defer execution
  of code fragments for use in Animations, event handling, and other tasks.

  Browsers are typically fairly inconsistent about when they will fire a
  timeout or interval based on what the browser is currently doing.  Timeouts
  and intervals are also fairly expensive for a browser to execute, which
  means if you schedule a large number of them it can quickly slow down the
  browser considerably.

  Timers, on the other handle, are scheduled cooperatively using the
  SC.RunLoop, which uses exactly one timeout to fire itself when needed and
  then executes by timers that need to fire on its own.  This approach can
  be many times faster than using timers and guarantees that timers scheduled
  to execute at the same time generally will do so, keeping animations and
  other operations in sync.

  ## Scheduling a Timer

  To schedule a basic timer, you can simply call SC.Timer.schedule() with
  a target and action you wish to have invoked:

      var timer = SC.Timer.schedule({
        target: myObject, action: 'timerFired', interval: 100
      });

  When this timer fires, it will call the timerFired() method on myObject.

  In addition to calling a method on a particular object, you can also use
  a timer to execute a variety of other types of code:

   - If you include an action name, but not a target object, then the action will be passed down the responder chain.
   - If you include a property path for the action property (e.g. 'MyApp.someController.someMethod'), then the method you name will be executed.
   - If you include a function in the action property, then the function will be executed.  If you also include a target object, the function will be called with this set to the target object.

  In general these properties are read-only.  Changing an interval, target,
  or action after creating a timer will have an unknown effect.

  ## Scheduling Repeating Timers

  In addition to scheduling one time timers, you can also schedule timers to
  execute periodically until some termination date.  You make a timer
  repeating by adding the repeats: YES property:

      var timer = SC.Timer.schedule({
        target: myObject,
        action: 'updateAnimation',
        interval: 100,
        repeats: YES,
        until: Time.now() + 1000
      }) ;

  The above example will execute the myObject.updateAnimation() every 100msec
  for 1 second from the current time.

  If you want a timer to repeat without expiration, you can simply omit the
  until: property.  The timer will then repeat until you invalidate it.

  ## Pausing and Invalidating Timers

  If you have created a timer but you no longer want it to execute, you can
  call the invalidate() method on it.  This will remove the timer from the
  run loop and clear certain properties so that it will not run again.

  You can use the invalidate() method on both repeating and one-time timers.

  If you do not want to invalidate a timer completely but you just want to
  stop the timer from execution temporarily, you can alternatively set the
  isPaused property to YES:

      timer.set('isPaused', YES) ;
      // Perform some critical function; timer will not execute
      timer.set('isPaused', NO) ;

  When a timer is paused, it will be scheduled and will fire like normal,
  but it will not actually execute the action method when it fires.  For a
  one time timer, this means that if you have the timer paused when it fires,
  it may never actually execute the action method.  For repeating timers,
  this means the timer will remain scheduled but simply will not execute its
  action while the timer is paused.

  ## Firing Timers

  If you need a timer to execute immediately, you can always call the fire()
  method yourself.  This will execute the timer action, if the timer is not
  paused.  For a one time timer, it will also invalidate the timer and remove
  it from the run loop.  Repeating timers can be fired anytime and it will
  not interrupt their regular scheduled times.


  @extends SC.Object
  @author Charles Jolley
  @version 1.0
  @since version 1.0
*/
SC.Timer = SC.Object.extend(
/** @scope SC.Timer.prototype */ {

  /**
    The target object whose method will be invoked when the time fires.

    You can set either a target/action property or you can pass a specific
    method.

    @type {Object}
    @field
  */
  target: null,

  /**
    The action to execute.

    The action can be a method name, a property path, or a function.  If you
    pass a method name, it will be invoked on the target object or it will
    be called up the responder chain if target is null.  If you pass a
    property path and it resolves to a function then the function will be
    called.  If you pass a function instead, then the function will be
    called in the context of the target object.

    @type {String, Function}
  */
  action: null,

  /**
    Set if the timer should be created from a memory pool.  Normally you will
    want to leave this set, but if you plan to use bindings or observers with
    this timer, then you must set isPooled to NO to avoid reusing your timer.

    @type Boolean
  */
  isPooled: NO,

  /**
    The time interval in milliseconds.

    You generally set this when you create the timer.  If you do not set it
    then the timer will fire as soon as possible in the next run loop.

    @type {Number}
  */
  interval: 0,

  /**
    Timer start date offset.

    The start date determines when the timer will be scheduled.  The first
    time the timer fires will be interval milliseconds after the start
    date.

    Generally you will not set this property yourself.  Instead it will be
    set automatically to the current run loop start date when you schedule
    the timer.  This ensures that all timers scheduled in the same run loop
    cycle will execute in the sync with one another.

    The value of this property is an offset like what you get if you call
    Date.now().

    @type {Number}
  */
  startTime: null,

  /**
    YES if you want the timer to execute repeatedly.

    @type {Boolean}
  */
  repeats: NO,

  /**
    Last date when the timer will execute.

    If you have set repeats to YES, then you can also set this property to
    have the timer automatically stop executing past a certain date.

    This property should contain an offset value like startOffset.  However if
    you set it to a Date object on create, it will be converted to an offset
    for you.

    If this property is null, then the timer will continue to repeat until you
    call invalidate().

    @type {Date, Number}
  */
  until: null,

  /**
    Set to YES to pause the timer.

    Pausing a timer does not remove it from the run loop, but it will
    temporarily suspend it from firing.  You should use this property if
    you will want the timer to fire again the future, but you want to prevent
    it from firing temporarily.

    If you are done with a timer, you should call invalidate() instead of
    setting this property.

    @type {Boolean}
  */
  isPaused: NO,

  /**
    YES onces the timer has been scheduled for the first time.
  */
  isScheduled: NO,

  /**
    YES if the timer can still execute.

    This read only property will return YES as long as the timer may possibly
    fire again in the future.  Once a timer has become invalid, it cannot
    become valid again.

    @field
    @type {Boolean}
  */
  isValid: YES,

  /**
    Set to the current time when the timer last fired.  Used to find the
    next 'frame' to execute.
  */
  lastFireTime: 0,

  /**
    Computed property returns the next time the timer should fire.  This
    property resets each time the timer fires.  Returns -1 if the timer
    cannot fire again.

    @type Time
  */
  fireTime: function() {
    if (!this.get('isValid')) { return -1 ; }  // not valid - can't fire

    // can't fire w/o startTime (set when schedule() is called).
    var start = this.get('startTime');
    if (!start || start === 0) { return -1; }

    // fire interval after start.
    var interval = this.get('interval'), last = this.get('lastFireTime');
    if (last < start) { last = start; } // first time to fire

    // find the next time to fire
    var next ;
    if (this.get('repeats')) {
      if (interval === 0) { // 0 means fire as fast as possible.
        next = last ; // time to fire immediately!

      // find the next full interval after start from last fire time.
      } else {
        next = start + (Math.floor((last - start) / interval)+1)*interval;
      }

    // otherwise, fire only once interval after start
    } else {
      next = start + interval ;
    }

    // can never have a fireTime after until
    var until = this.get('until');
    if (until && until>0 && next>until) next = until;

    return next ;
  }.property('interval', 'startTime', 'repeats', 'until', 'isValid', 'lastFireTime').cacheable(),

  /**
    Schedules the timer to execute in the runloop.

    This method is called automatically if you create the timer using the
    schedule() class method.  If you create the timer manually, you will
    need to call this method yourself for the timer to execute.

    @returns {SC.Timer} The receiver
  */
  schedule: function() {
    if (!this.get('isValid')) return this; // nothing to do

    this.beginPropertyChanges();

    // if start time was not set explicitly when the timer was created,
    // get it from the run loop.  This way timer scheduling will always
    // occur in sync.
    if (!this.startTime) this.set('startTime', SC.RunLoop.currentRunLoop.get('startTime')) ;

    // now schedule the timer if the last fire time was < the next valid
    // fire time.  The first time lastFireTime is 0, so this will always go.
    var next = this.get('fireTime'), last = this.get('lastFireTime');
    if (next >= last) {
      this.set('isScheduled', YES);
      SC.RunLoop.currentRunLoop.scheduleTimer(this, next);
    }

    this.endPropertyChanges() ;

    return this ;
  },
  /**
    Invalidates the timer so that it will not execute again.  If a timer has
    been scheduled, it will be removed from the run loop immediately.

    @returns {SC.Timer} The receiver
  */
  invalidate: function() {
    this.beginPropertyChanges();
    this.set('isValid', NO);

    var runLoop = SC.RunLoop.currentRunLoop;
    if(runLoop) runLoop.cancelTimer(this);

    this.action = this.target = null ; // avoid memory leaks
    this.endPropertyChanges();

    // return to pool...
    if (this.get('isPooled')) SC.Timer.returnTimerToPool(this);
    return this ;
  },

  /**
    Immediately fires the timer.

    If the timer is not-repeating, it will be invalidated.  If it is repeating
    you can call this method without interrupting its normal schedule.

    @returns {void}
  */
  fire: function() {

    // this will cause the fireTime to recompute
    var last = Date.now();
    this.set('lastFireTime', last);

    var next = this.get('fireTime');

    // now perform the fire action unless paused.
    if (!this.get('isPaused')) this.performAction() ;

     // reschedule the timer if needed...
     if (next > last) {
       this.schedule();
     } else {
       this.invalidate();
     }
  },

  /**
    Actually fires the action. You can override this method if you need
    to change how the timer fires its action.
  */
  performAction: function() {
    var typeOfAction = SC.typeOf(this.action);

    // if the action is a function, just try to call it.
    if (typeOfAction == SC.T_FUNCTION) {
      this.action.call((this.target || this), this) ;

    // otherwise, action should be a string.  If it has a period, treat it
    // like a property path.
    } else if (typeOfAction === SC.T_STRING) {
      if (this.action.indexOf('.') >= 0) {
        var path = this.action.split('.') ;
        var property = path.pop() ;

        var target = SC.objectForPropertyPath(path, window) ;
        var action = target.get ? target.get(property) : target[property];
        if (action && SC.typeOf(action) == SC.T_FUNCTION) {
          action.call(target, this) ;
        } else {
          throw new Error('%@: Timer could not find a function at %@'.fmt(this, this.action));
        }

      // otherwise, try to execute action direction on target or send down
      // responder chain.
      } else {
        SC.RootResponder.responder.sendAction(this.action, this.target, this);
      }
    }
  },

  init: function() {
    sc_super();

    // convert startTime and until to times if they are dates.
    if (this.startTime instanceof Date) {
      this.startTime = this.startTime.getTime() ;
    }

    if (this.until instanceof Date) {
      this.until = this.until.getTime() ;
    }
  },

  /** @private - Default values to reset reused timers to. */
  RESET_DEFAULTS: {
    target: null, action: null,
    isPooled: NO, isPaused: NO, isScheduled: NO, isValid: YES,
    interval: 0, repeats: NO, until: null,
    startTime: null, lastFireTime: 0
  },

  /**
    Resets the timer settings with the new settings.  This is the method
    called by the Timer pool when a timer is reused.  You will not normally
    call this method yourself, though you could override it if you need to
    reset additional properties when a timer is reused.

    @params {Hash} props properties to copy over
    @returns {SC.Timer} receiver
  */
  reset: function(props) {
    if (!props) props = SC.EMPTY_HASH;

    // note: we copy these properties manually just to make them fast.  we
    // don't expect you to use observers on a timer object if you are using
    // pooling anyway so this won't matter.  Still notify of property change
    // on fireTime to clear its cache.
    this.propertyWillChange('fireTime');
    var defaults = this.RESET_DEFAULTS ;
    for(var key in defaults) {
      if (!defaults.hasOwnProperty(key)) continue ;
      this[key] = SC.none(props[key]) ? defaults[key] : props[key];
    }
    this.propertyDidChange('fireTime');
    return this ;
  },

  // ..........................................................
  // TIMER QUEUE SUPPORT
  //

  /** @private - removes the timer from its current timerQueue if needed.
    return value is the new "root" timer.
  */
  removeFromTimerQueue: function(timerQueueRoot) {
    var prev = this._timerQueuePrevious, next = this._timerQueueNext ;

    if (!prev && !next && timerQueueRoot !== this) return timerQueueRoot ; // not in a queue...

    // else, patch up to remove...
    if (prev) prev._timerQueueNext = next ;
    if (next) next._timerQueuePrevious = prev ;
    this._timerQueuePrevious = this._timerQueueNext = null ;
    return (timerQueueRoot === this) ? next : timerQueueRoot ;
  },

  /** @private - schedules the timer in the queue based on the runtime. */
  scheduleInTimerQueue: function(timerQueueRoot, runTime) {
    this._timerQueueRunTime = runTime ;

    // find the place to begin
    var beforeNode = timerQueueRoot;
    var afterNode = null ;
    while(beforeNode && beforeNode._timerQueueRunTime < runTime) {
      afterNode = beforeNode ;
      beforeNode = beforeNode._timerQueueNext;
    }

    if (afterNode) {
      afterNode._timerQueueNext = this ;
      this._timerQueuePrevious = afterNode ;
    }

    if (beforeNode) {
      beforeNode._timerQueuePrevious = this ;
      this._timerQueueNext = beforeNode ;
    }

    // I am the new root if beforeNode === root
    return (beforeNode === timerQueueRoot) ? this : timerQueueRoot ;
  },

  /** @private
    adds the receiver to the passed array of expired timers based on the
    current time and then recursively calls the next timer.  Returns the
    first timer that is not expired.  This is faster than iterating through
    the timers because it does some faster cleanup of the nodes.
  */
  collectExpiredTimers: function(timers, now) {
    if (this._timerQueueRunTime > now) return this ; // not expired!
    timers.push(this);  // add to queue.. fixup next. assume we are root.
    var next = this._timerQueueNext ;
    this._timerQueueNext = null;
    if (next) next._timerQueuePrevious = null;
    return next ? next.collectExpiredTimers(timers, now) : null;
  }

}) ;

/** @scope SC.Timer */

/*
  Created a new timer with the passed properties and schedules it to
  execute.  This is the same as calling SC.Time.create({ props }).schedule().

  Note that unless you explicitly set isPooled to NO, this timer will be
  pulled from a shared memory pool of timers.  You cannot using bindings or
  observers on these timers as they may be reused for future timers at any
  time.

  @params {Hash} props Any properties you want to set on the timer.
  @returns {SC.Timer} new timer instance.
*/
SC.Timer.schedule = function(props) {
  // get the timer.
  var timer ;
  if (!props || SC.none(props.isPooled) || props.isPooled) {
    timer = this.timerFromPool(props);
  } else timer = this.create(props);
  return timer.schedule();
} ;

/**
  Returns a new timer from the timer pool, copying the passed properties onto
  the timer instance.  If the timer pool is currently empty, this will return
  a new instance.
*/
SC.Timer.timerFromPool = function(props) {
  var timers = this._timerPool;
  if (!timers) timers = this._timerPool = [] ;
  var timer = timers.pop();
  if (!timer) timer = this.create();
  return timer.reset(props) ;
};

/**
  Returns a timer instance to the timer pool for later use.  This is done
  automatically when a timer is invalidated if isPooled is YES.
*/
SC.Timer.returnTimerToPool = function(timer) {
  if (!this._timerPool) this._timerPool = [];

  this._timerPool.push(timer);
  return this ;
};


