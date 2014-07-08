define("backburner",
  ["backburner/utils","backburner/deferred_action_queues","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Utils = __dependency1__["default"];
    var DeferredActionQueues = __dependency2__.DeferredActionQueues;

    var slice = [].slice,
        pop = [].pop,
        each = Utils.each,
        isString = Utils.isString,
        isFunction = Utils.isFunction,
        isNumber = Utils.isNumber,
        timers = [],
        global = this,
        NUMBER = /\d+/;

    // In IE 6-8, try/finally doesn't work without a catch.
    // Unfortunately, this is impossible to test for since wrapping it in a parent try/catch doesn't trigger the bug.
    // This tests for another broken try/catch behavior that only exhibits in the same versions of IE.
    var needsIETryCatchFix = (function(e,x){
      try{ x(); }
      catch(e) { } // jshint ignore:line
      return !!e;
    })();

    function isCoercableNumber(number) {
      return isNumber(number) || NUMBER.test(number);
    }

    function Backburner(queueNames, options) {
      this.queueNames = queueNames;
      this.options = options || {};
      if (!this.options.defaultQueue) {
        this.options.defaultQueue = queueNames[0];
      }
      this.instanceStack = [];
      this._debouncees = [];
      this._throttlers = [];
    }

    Backburner.prototype = {
      queueNames: null,
      options: null,
      currentInstance: null,
      instanceStack: null,

      begin: function() {
        var options = this.options,
            onBegin = options && options.onBegin,
            previousInstance = this.currentInstance;

        if (previousInstance) {
          this.instanceStack.push(previousInstance);
        }

        this.currentInstance = new DeferredActionQueues(this.queueNames, options);
        if (onBegin) {
          onBegin(this.currentInstance, previousInstance);
        }
      },

      end: function() {
        var options = this.options,
            onEnd = options && options.onEnd,
            currentInstance = this.currentInstance,
            nextInstance = null;

        // Prevent double-finally bug in Safari 6.0.2 and iOS 6
        // This bug appears to be resolved in Safari 6.0.5 and iOS 7
        var finallyAlreadyCalled = false;
        try {
          currentInstance.flush();
        } finally {
          if (!finallyAlreadyCalled) {
            finallyAlreadyCalled = true;

            this.currentInstance = null;

            if (this.instanceStack.length) {
              nextInstance = this.instanceStack.pop();
              this.currentInstance = nextInstance;
            }

            if (onEnd) {
              onEnd(currentInstance, nextInstance);
            }
          }
        }
      },

      run: function(target, method /*, args */) {
        var onError = getOnError(this.options);

        this.begin();

        if (!method) {
          method = target;
          target = null;
        }

        if (isString(method)) {
          method = target[method];
        }

        var args = slice.call(arguments, 2);

        // guard against Safari 6's double-finally bug
        var didFinally = false;

        if (onError) {
          try {
            return method.apply(target, args);
          } catch(error) {
            onError(error);
          } finally {
            if (!didFinally) {
              didFinally = true;
              this.end();
            }
          }
        } else {
          try {
            return method.apply(target, args);
          } finally {
            if (!didFinally) {
              didFinally = true;
              this.end();
            }
          }
        }
      },

      defer: function(queueName, target, method /* , args */) {
        if (!method) {
          method = target;
          target = null;
        }

        if (isString(method)) {
          method = target[method];
        }

        var stack = this.DEBUG ? new Error() : undefined,
            args = arguments.length > 3 ? slice.call(arguments, 3) : undefined;
        if (!this.currentInstance) { createAutorun(this); }
        return this.currentInstance.schedule(queueName, target, method, args, false, stack);
      },

      deferOnce: function(queueName, target, method /* , args */) {
        if (!method) {
          method = target;
          target = null;
        }

        if (isString(method)) {
          method = target[method];
        }

        var stack = this.DEBUG ? new Error() : undefined,
            args = arguments.length > 3 ? slice.call(arguments, 3) : undefined;
        if (!this.currentInstance) { createAutorun(this); }
        return this.currentInstance.schedule(queueName, target, method, args, true, stack);
      },

      setTimeout: function() {
        var args = slice.call(arguments),
            length = args.length,
            method, wait, target,
            methodOrTarget, methodOrWait, methodOrArgs;

        if (length === 0) {
          return;
        } else if (length === 1) {
          method = args.shift();
          wait = 0;
        } else if (length === 2) {
          methodOrTarget = args[0];
          methodOrWait = args[1];

          if (isFunction(methodOrWait) || isFunction(methodOrTarget[methodOrWait])) {
            target = args.shift();
            method = args.shift();
            wait = 0;
          } else if (isCoercableNumber(methodOrWait)) {
            method = args.shift();
            wait = args.shift();
          } else {
            method = args.shift();
            wait =  0;
          }
        } else {
          var last = args[args.length - 1];

          if (isCoercableNumber(last)) {
            wait = args.pop();
          } else {
            wait = 0;
          }

          methodOrTarget = args[0];
          methodOrArgs = args[1];

          if (isFunction(methodOrArgs) || (isString(methodOrArgs) &&
                                          methodOrTarget !== null &&
                                          methodOrArgs in methodOrTarget)) {
            target = args.shift();
            method = args.shift();
          } else {
            method = args.shift();
          }
        }

        var executeAt = (+new Date()) + parseInt(wait, 10);

        if (isString(method)) {
          method = target[method];
        }

        var onError = getOnError(this.options);

        function fn() {
          if (onError) {
            try {
              method.apply(target, args);
            } catch (e) {
              onError(e);
            }
          } else {
            method.apply(target, args);
          }
        }

        // find position to insert
        var i = searchTimer(executeAt, timers);

        timers.splice(i, 0, executeAt, fn);

        updateLaterTimer(this, executeAt, wait);

        return fn;
      },

      throttle: function(target, method /* , args, wait, [immediate] */) {
        var self = this,
            args = arguments,
            immediate = pop.call(args),
            wait,
            throttler,
            index,
            timer;

        if (isNumber(immediate) || isString(immediate)) {
          wait = immediate;
          immediate = true;
        } else {
          wait = pop.call(args);
        }

        wait = parseInt(wait, 10);

        index = findThrottler(target, method, this._throttlers);
        if (index > -1) { return this._throttlers[index]; } // throttled

        timer = global.setTimeout(function() {
          if (!immediate) {
            self.run.apply(self, args);
          }
          var index = findThrottler(target, method, self._throttlers);
          if (index > -1) {
            self._throttlers.splice(index, 1);
          }
        }, wait);

        if (immediate) {
          self.run.apply(self, args);
        }

        throttler = [target, method, timer];

        this._throttlers.push(throttler);

        return throttler;
      },

      debounce: function(target, method /* , args, wait, [immediate] */) {
        var self = this,
            args = arguments,
            immediate = pop.call(args),
            wait,
            index,
            debouncee,
            timer;

        if (isNumber(immediate) || isString(immediate)) {
          wait = immediate;
          immediate = false;
        } else {
          wait = pop.call(args);
        }

        wait = parseInt(wait, 10);
        // Remove debouncee
        index = findDebouncee(target, method, this._debouncees);

        if (index > -1) {
          debouncee = this._debouncees[index];
          this._debouncees.splice(index, 1);
          clearTimeout(debouncee[2]);
        }

        timer = global.setTimeout(function() {
          if (!immediate) {
            self.run.apply(self, args);
          }
          var index = findDebouncee(target, method, self._debouncees);
          if (index > -1) {
            self._debouncees.splice(index, 1);
          }
        }, wait);

        if (immediate && index === -1) {
          self.run.apply(self, args);
        }

        debouncee = [target, method, timer];

        self._debouncees.push(debouncee);

        return debouncee;
      },

      cancelTimers: function() {
        var clearItems = function(item) {
          clearTimeout(item[2]);
        };

        each(this._throttlers, clearItems);
        this._throttlers = [];

        each(this._debouncees, clearItems);
        this._debouncees = [];

        if (this._laterTimer) {
          clearTimeout(this._laterTimer);
          this._laterTimer = null;
        }
        timers = [];

        if (this._autorun) {
          clearTimeout(this._autorun);
          this._autorun = null;
        }
      },

      hasTimers: function() {
        return !!timers.length || !!this._debouncees.length || !!this._throttlers.length || this._autorun;
      },

      cancel: function(timer) {
        var timerType = typeof timer;

        if (timer && timerType === 'object' && timer.queue && timer.method) { // we're cancelling a deferOnce
          return timer.queue.cancel(timer);
        } else if (timerType === 'function') { // we're cancelling a setTimeout
          for (var i = 0, l = timers.length; i < l; i += 2) {
            if (timers[i + 1] === timer) {
              timers.splice(i, 2); // remove the two elements
              return true;
            }
          }
        } else if (Object.prototype.toString.call(timer) === "[object Array]"){ // we're cancelling a throttle or debounce
          return this._cancelItem(findThrottler, this._throttlers, timer) ||
                   this._cancelItem(findDebouncee, this._debouncees, timer);
        } else {
          return; // timer was null or not a timer
        }
      },

      _cancelItem: function(findMethod, array, timer){
        var item,
            index;

        if (timer.length < 3) { return false; }

        index = findMethod(timer[0], timer[1], array);

        if(index > -1) {

          item = array[index];

          if(item[2] === timer[2]){
            array.splice(index, 1);
            clearTimeout(timer[2]);
            return true;
          }
        }

        return false;
      }
    };

    Backburner.prototype.schedule = Backburner.prototype.defer;
    Backburner.prototype.scheduleOnce = Backburner.prototype.deferOnce;
    Backburner.prototype.later = Backburner.prototype.setTimeout;

    if (needsIETryCatchFix) {
      var originalRun = Backburner.prototype.run;
      Backburner.prototype.run = wrapInTryCatch(originalRun);

      var originalEnd = Backburner.prototype.end;
      Backburner.prototype.end = wrapInTryCatch(originalEnd);
    }

    function wrapInTryCatch(func) {
      return function () {
        try {
          return func.apply(this, arguments);
        } catch (e) {
          throw e;
        }
      };
    }

    function getOnError(options) {
      return options.onError || (options.onErrorTarget && options.onErrorTarget[options.onErrorMethod]);
    }


    function createAutorun(backburner) {
      backburner.begin();
      backburner._autorun = global.setTimeout(function() {
        backburner._autorun = null;
        backburner.end();
      });
    }

    function updateLaterTimer(self, executeAt, wait) {
      if (!self._laterTimer || executeAt < self._laterTimerExpiresAt) {
        self._laterTimer = global.setTimeout(function() {
          self._laterTimer = null;
          self._laterTimerExpiresAt = null;
          executeTimers(self);
        }, wait);
        self._laterTimerExpiresAt = executeAt;
      }
    }

    function executeTimers(self) {
      var now = +new Date(),
          time, fns, i, l;

      self.run(function() {
        i = searchTimer(now, timers);

        fns = timers.splice(0, i);

        for (i = 1, l = fns.length; i < l; i += 2) {
          self.schedule(self.options.defaultQueue, null, fns[i]);
        }
      });

      if (timers.length) {
        updateLaterTimer(self, timers[0], timers[0] - now);
      }
    }

    function findDebouncee(target, method, debouncees) {
      return findItem(target, method, debouncees);
    }

    function findThrottler(target, method, throttlers) {
      return findItem(target, method, throttlers);
    }

    function findItem(target, method, collection) {
      var item,
          index = -1;

      for (var i = 0, l = collection.length; i < l; i++) {
        item = collection[i];
        if (item[0] === target && item[1] === method) {
          index = i;
          break;
        }
      }

      return index;
    }

    function searchTimer(time, timers) {
      var start = 0,
          end = timers.length - 2,
          middle, l;

      while (start < end) {
        // since timers is an array of pairs 'l' will always
        // be an integer
        l = (end - start) / 2;

        // compensate for the index in case even number
        // of pairs inside timers
        middle = start + l - (l % 2);

        if (time >= timers[middle]) {
          start = middle + 2;
        } else {
          end = middle;
        }
      }

      return (time >= timers[start]) ? start + 2 : start;
    }

    __exports__.Backburner = Backburner;
  });
define("backburner/deferred_action_queues",
  ["backburner/utils","backburner/queue","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Utils = __dependency1__["default"];
    var Queue = __dependency2__.Queue;

    var each = Utils.each,
        isString = Utils.isString;

    function DeferredActionQueues(queueNames, options) {
      var queues = this.queues = {};
      this.queueNames = queueNames = queueNames || [];

      this.options = options;

      each(queueNames, function(queueName) {
        queues[queueName] = new Queue(this, queueName, options);
      });
    }

    DeferredActionQueues.prototype = {
      queueNames: null,
      queues: null,
      options: null,

      schedule: function(queueName, target, method, args, onceFlag, stack) {
        var queues = this.queues,
            queue = queues[queueName];

        if (!queue) { throw new Error("You attempted to schedule an action in a queue (" + queueName + ") that doesn't exist"); }

        if (onceFlag) {
          return queue.pushUnique(target, method, args, stack);
        } else {
          return queue.push(target, method, args, stack);
        }
      },

      invoke: function(target, method, args, _) {
        if (args && args.length > 0) {
          method.apply(target, args);
        } else {
          method.call(target);
        }
      },

      invokeWithOnError: function(target, method, args, onError) {
        try {
          if (args && args.length > 0) {
            method.apply(target, args);
          } else {
            method.call(target);
          }
        } catch(error) {
          onError(error);
        }
      },

      flush: function() {
        var queues = this.queues,
            queueNames = this.queueNames,
            queueName, queue, queueItems, priorQueueNameIndex,
            queueNameIndex = 0, numberOfQueues = queueNames.length,
            options = this.options,
            onError = options.onError || (options.onErrorTarget && options.onErrorTarget[options.onErrorMethod]),
            invoke = onError ? this.invokeWithOnError : this.invoke;

        outerloop:
        while (queueNameIndex < numberOfQueues) {
          queueName = queueNames[queueNameIndex];
          queue = queues[queueName];
          queueItems = queue._queueBeingFlushed = queue._queue.slice();
          queue._queue = [];

          var queueOptions = queue.options, // TODO: write a test for this
              before = queueOptions && queueOptions.before,
              after = queueOptions && queueOptions.after,
              target, method, args, stack,
              queueIndex = 0, numberOfQueueItems = queueItems.length;

          if (numberOfQueueItems && before) { before(); }

          while (queueIndex < numberOfQueueItems) {
            target = queueItems[queueIndex];
            method = queueItems[queueIndex+1];
            args   = queueItems[queueIndex+2];
            stack  = queueItems[queueIndex+3]; // Debugging assistance

            if (isString(method)) { method = target[method]; }

            // method could have been nullified / canceled during flush
            if (method) {
              invoke(target, method, args, onError);
            }

            queueIndex += 4;
          }

          queue._queueBeingFlushed = null;
          if (numberOfQueueItems && after) { after(); }

          if ((priorQueueNameIndex = indexOfPriorQueueWithActions(this, queueNameIndex)) !== -1) {
            queueNameIndex = priorQueueNameIndex;
            continue outerloop;
          }

          queueNameIndex++;
        }
      }
    };

    function indexOfPriorQueueWithActions(daq, currentQueueIndex) {
      var queueName, queue;

      for (var i = 0, l = currentQueueIndex; i <= l; i++) {
        queueName = daq.queueNames[i];
        queue = daq.queues[queueName];
        if (queue._queue.length) { return i; }
      }

      return -1;
    }

    __exports__.DeferredActionQueues = DeferredActionQueues;
  });
define("backburner/queue",
  ["exports"],
  function(__exports__) {
    "use strict";
    function Queue(daq, name, options) {
      this.daq = daq;
      this.name = name;
      this.globalOptions = options;
      this.options = options[name];
      this._queue = [];
    }

    Queue.prototype = {
      daq: null,
      name: null,
      options: null,
      onError: null,
      _queue: null,

      push: function(target, method, args, stack) {
        var queue = this._queue;
        queue.push(target, method, args, stack);
        return {queue: this, target: target, method: method};
      },

      pushUnique: function(target, method, args, stack) {
        var queue = this._queue, currentTarget, currentMethod, i, l;

        for (i = 0, l = queue.length; i < l; i += 4) {
          currentTarget = queue[i];
          currentMethod = queue[i+1];

          if (currentTarget === target && currentMethod === method) {
            queue[i+2] = args; // replace args
            queue[i+3] = stack; // replace stack
            return {queue: this, target: target, method: method};
          }
        }

        queue.push(target, method, args, stack);
        return {queue: this, target: target, method: method};
      },

      // TODO: remove me, only being used for Ember.run.sync
      flush: function() {
        var queue = this._queue,
            globalOptions = this.globalOptions,
            options = this.options,
            before = options && options.before,
            after = options && options.after,
            onError = globalOptions.onError || (globalOptions.onErrorTarget && globalOptions.onErrorTarget[globalOptions.onErrorMethod]),
            target, method, args, stack, i, l = queue.length;

        if (l && before) { before(); }
        for (i = 0; i < l; i += 4) {
          target = queue[i];
          method = queue[i+1];
          args   = queue[i+2];
          stack  = queue[i+3]; // Debugging assistance

          // TODO: error handling
          if (args && args.length > 0) {
            if (onError) {
              try {
                method.apply(target, args);
              } catch (e) {
                onError(e);
              }
            } else {
              method.apply(target, args);
            }
          } else {
            if (onError) {
              try {
                method.call(target);
              } catch(e) {
                onError(e);
              }
            } else {
              method.call(target);
            }
          }
        }
        if (l && after) { after(); }

        // check if new items have been added
        if (queue.length > l) {
          this._queue = queue.slice(l);
          this.flush();
        } else {
          this._queue.length = 0;
        }
      },

      cancel: function(actionToCancel) {
        var queue = this._queue, currentTarget, currentMethod, i, l;

        for (i = 0, l = queue.length; i < l; i += 4) {
          currentTarget = queue[i];
          currentMethod = queue[i+1];

          if (currentTarget === actionToCancel.target && currentMethod === actionToCancel.method) {
            queue.splice(i, 4);
            return true;
          }
        }

        // if not found in current queue
        // could be in the queue that is being flushed
        queue = this._queueBeingFlushed;
        if (!queue) {
          return;
        }
        for (i = 0, l = queue.length; i < l; i += 4) {
          currentTarget = queue[i];
          currentMethod = queue[i+1];

          if (currentTarget === actionToCancel.target && currentMethod === actionToCancel.method) {
            // don't mess with array during flush
            // just nullify the method
            queue[i+1] = null;
            return true;
          }
        }
      }
    };

    __exports__.Queue = Queue;
  });
define("backburner/utils",
  ["exports"],
  function(__exports__) {
    "use strict";
    __exports__["default"] = {
      each: function(collection, callback) {
        for (var i = 0; i < collection.length; i++) {
          callback(collection[i]);
        }
      },

      isString: function(suspect) {
        return typeof suspect === 'string';
      },

      isFunction: function(suspect) {
        return typeof suspect === 'function';
      },

      isNumber: function(suspect) {
        return typeof suspect === 'number';
      }
    };
  });
