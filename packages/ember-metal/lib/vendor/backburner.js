define("backburner",
  ["backburner/deferred_action_queues","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var DeferredActionQueues = __dependency1__.DeferredActionQueues;

    var slice = [].slice,
        pop = [].pop,
        debouncees = [],
        timers = [],
        autorun, laterTimer, laterTimerExpiresAt;

    function Backburner(queueNames, options) {
      this.queueNames = queueNames;
      this.options = options || {};
    }

    Backburner.prototype = {
      queueNames: null,
      options: null,
      currentInstance: null,
      previousInstance: null,

      begin: function() {
        if (this.currentInstance) {
          this.previousInstance = this.currentInstance;
        }
        this.currentInstance = new DeferredActionQueues(this.queueNames, this.options);
      },

      end: function() {
        try {
          this.currentInstance.flush();
        } finally {
          this.currentInstance = null;
          if (this.previousInstance) {
            this.currentInstance = this.previousInstance;
            this.previousInstance = null;
          }
        }
      },

      run: function(target, method /*, args */) {
        var ret;
        this.begin();

        if (!method) {
          method = target;
          target = null;
        }

        if (typeof method === 'string') {
          method = target[method];
        }

        // Prevent Safari double-finally.
        var finallyAlreadyCalled = false;
        try {
          if (arguments.length > 2) {
            ret = method.apply(target, slice.call(arguments, 2));
          } else {
            ret = method.call(target);
          }
        } finally {
          if (!finallyAlreadyCalled) {
            finallyAlreadyCalled = true;
            this.end();
          }
        }
        return ret;
      },

      defer: function(queueName, target, method /* , args */) {
        if (!method) {
          method = target;
          target = null;
        }

        if (typeof method === 'string') {
          method = target[method];
        }

        var stack = new Error().stack,
            args = arguments.length > 3 ? slice.call(arguments, 3) : undefined;
        if (!this.currentInstance) { createAutorun(this); }
        return this.currentInstance.schedule(queueName, target, method, args, false, stack);
      },

      deferOnce: function(queueName, target, method /* , args */) {
        if (!method) {
          method = target;
          target = null;
        }

        if (typeof method === 'string') {
          method = target[method];
        }

        var stack = new Error().stack,
            args = arguments.length > 3 ? slice.call(arguments, 3) : undefined;
        if (!this.currentInstance) { createAutorun(this); }
        return this.currentInstance.schedule(queueName, target, method, args, true, stack);
      },

      setTimeout: function() {
        var self = this,
            wait = pop.call(arguments),
            target = arguments[0],
            method = arguments[1],
            executeAt = (+new Date()) + wait;

        if (!method) {
          method = target;
          target = null;
        }

        if (typeof method === 'string') {
          method = target[method];
        }

        var fn, args;
        if (arguments.length > 2) {
          args = slice.call(arguments, 2);

          fn = function() {
            method.apply(target, args);
          };
        } else {
          fn = function() {
            method.call(target);
          };
        }

        // find position to insert - TODO: binary search
        var i, l;
        for (i = 0, l = timers.length; i < l; i += 2) {
          if (executeAt < timers[i]) { break; }
        }

        timers.splice(i, 0, executeAt, fn);

        if (laterTimer && laterTimerExpiresAt < executeAt) { return fn; }

        if (laterTimer) {
          clearTimeout(laterTimer);
          laterTimer = null;
        }
        laterTimer = setTimeout(function() {
          executeTimers(self);
          laterTimer = null;
          laterTimerExpiresAt = null;
        }, wait);
        laterTimerExpiresAt = executeAt;

        return fn;
      },

      debounce: function(target, method /* , args, wait */) {
        var self = this,
            args = arguments,
            wait = pop.call(args),
            debouncee;

        for (var i = 0, l = debouncees.length; i < l; i++) {
          debouncee = debouncees[i];
          if (debouncee[0] === target && debouncee[1] === method) { return; } // do nothing
        }

        var timer = setTimeout(function() {
          self.run.apply(self, args);

          // remove debouncee
          var index = -1;
          for (var i = 0, l = debouncees.length; i < l; i++) {
            debouncee = debouncees[i];
            if (debouncee[0] === target && debouncee[1] === method) {
              index = i;
              break;
            }
          }

          if (index > -1) { debouncees.splice(index, 1); }
        }, wait);

        debouncees.push([target, method, timer]);
      },

      cancelTimers: function() {
        for (var i = 0, l = debouncees.length; i < l; i++) {
          clearTimeout(debouncees[i][2]);
        }
        debouncees = [];

        if (laterTimer) {
          clearTimeout(laterTimer);
          laterTimer = null;
        }
        timers = [];

        if (autorun) { clearTimeout(autorun); }
      },

      hasTimers: function() {
        return !!timers.length && !autorun;
      },

      cancel: function(timer) {
        if (typeof timer === 'object' && timer.queue && timer.method) { // we're cancelling a deferOnce
          return timer.queue.cancel(timer);
        } else if (typeof timer === 'function') { // we're cancelling a setTimeout
          for (var i = 0, l = timers.length; i < l; i += 2) {
            if (timers[i + 1] === timer) {
              timers.splice(i, 2); // remove the two elements
              return true;
            }
          }
        }
      }
    };

    Backburner.prototype.schedule = Backburner.prototype.defer;
    Backburner.prototype.scheduleOnce = Backburner.prototype.deferOnce;
    Backburner.prototype.later = Backburner.prototype.setTimeout;

    function createAutorun(backburner) {
      backburner.begin();
      autorun = setTimeout(function() {
        backburner.end();
      });
    }

    function executeTimers(self) {
      var now = +new Date(),
          time, fns, i, l;

      self.run(function() {
        // TODO: binary search
        for (i = 0, l = timers.length; i < l; i += 2) {
          time = timers[i];
          if (time > now) { break; }
        }

        fns = timers.splice(0, i);

        for (i = 1, l = fns.length; i < l; i += 2) {
          self.schedule(self.queueNames[0], null, fns[i]); // TODO: make default queue configurable
        }
      });

      if (timers.length) {
        laterTimer = setTimeout(function() {
          executeTimers(self);
        }, timers[0] - now);
        laterTimerExpiresAt = timers[0];
      }
    }


    __exports__.Backburner = Backburner;
  });

define("backburner/deferred_action_queues",
  ["backburner/queue","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Queue = __dependency1__.Queue;

    function DeferredActionQueues(queueNames, options) {
      var queues = this.queues = {};
      this.queueNames = queueNames = queueNames || [];

      var queueName;
      for (var i = 0, l = queueNames.length; i < l; i++) {
        queueName = queueNames[i];
        queues[queueName] = new Queue(this, queueName, options[queueName]);
      }
    }

    DeferredActionQueues.prototype = {
      queueNames: null,
      queues: null,

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

      flush: function() {
        var queues = this.queues,
            queueNames = this.queueNames,
            queueName, queue, queueItems, priorQueueNameIndex,
            queueNameIndex = 0, numberOfQueues = queueNames.length;

        outerloop:
        while (queueNameIndex < numberOfQueues) {
          queueName = queueNames[queueNameIndex];
          queue = queues[queueName];
          queueItems = queue._queue.slice();
          queue._queue = [];

          var options = queue.options,
              before = options && options.before,
              after = options && options.after,
              target, method, args,
              queueIndex = 0, numberOfQueueItems = queueItems.length;

          if (numberOfQueueItems && before) { before(); }
          while (queueIndex < numberOfQueueItems) {
            target = queueItems[queueIndex];
            method = queueItems[queueIndex+1];
            args   = queueItems[queueIndex+2];

            if (typeof method === 'string') { method = target[method]; }

            // TODO: error handling
            if (args && args.length > 0) {
              method.apply(target, args);
            } else {
              method.call(target);
            }

            queueIndex += 4;
          }
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
      this.options = options;
      this._queue = [];
    }

    Queue.prototype = {
      daq: null,
      name: null,
      options: null,
      _queue: null,

      push: function(target, method, args, stack) {
        var queue = this._queue;
        queue.push(target, method, args, stack);
        return {queue: this, target: target, method: method};
      },

      pushUnique: function(target, method, args, stack) {
        var queue = this._queue, currentTarget, currentMethod;

        for (var i = 0, l = queue.length; i < l; i += 4) {
          currentTarget = queue[i];
          currentMethod = queue[i+1];

          if (currentTarget === target && currentMethod === method) {
            queue[i+2] = args; // replace args
            queue[i+3] = stack; // replace stack
            return {queue: this, target: target, method: method}; // TODO: test this code path
          }
        }

        this._queue.push(target, method, args, stack);
        return {queue: this, target: target, method: method};
      },

      // TODO: remove me, only being used for Ember.run.sync
      flush: function() {
        var queue = this._queue,
            options = this.options,
            before = options && options.before,
            after = options && options.after,
            action, target, method, args, i, l = queue.length;

        if (l && before) { before(); }
        for (i = 0; i < l; i += 4) {
          target = queue[i];
          method = queue[i+1];
          args   = queue[i+2];

          method.apply(target, args); // TODO: error handling
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
      }
    };

    __exports__.Queue = Queue;
  });