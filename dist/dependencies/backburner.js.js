const SET_TIMEOUT = setTimeout;
const NOOP = () => { };
function buildNext(flush) {
    // Using "promises first" here to:
    //
    // 1) Ensure more consistent experience on browsers that
    //    have differently queued microtasks (separate queues for
    //    MutationObserver vs Promises).
    // 2) Ensure better debugging experiences (it shows up in Chrome
    //    call stack as "Promise.then (async)") which is more consistent
    //    with user expectations
    //
    // When Promise is unavailable use MutationObserver (mostly so that we
    // still get microtasks on IE11), and when neither MutationObserver and
    // Promise are present use a plain old setTimeout.
    if (typeof Promise === 'function') {
        const autorunPromise = Promise.resolve();
        return () => autorunPromise.then(flush);
    }
    else if (typeof MutationObserver === 'function') {
        let iterations = 0;
        let observer = new MutationObserver(flush);
        let node = document.createTextNode('');
        observer.observe(node, { characterData: true });
        return () => {
            iterations = ++iterations % 2;
            node.data = '' + iterations;
            return iterations;
        };
    }
    else {
        return () => SET_TIMEOUT(flush, 0);
    }
}
function buildPlatform(flush) {
    let clearNext = NOOP;
    return {
        setTimeout(fn, ms) {
            return setTimeout(fn, ms);
        },
        clearTimeout(timerId) {
            return clearTimeout(timerId);
        },
        now() {
            return Date.now();
        },
        next: buildNext(flush),
        clearNext,
    };
}

const NUMBER = /\d+/;
const TIMERS_OFFSET = 6;
function isCoercableNumber(suspect) {
    let type = typeof suspect;
    return type === 'number' && suspect === suspect || type === 'string' && NUMBER.test(suspect);
}
function getOnError(options) {
    return options.onError || (options.onErrorTarget && options.onErrorTarget[options.onErrorMethod]);
}
function findItem(target, method, collection) {
    let index = -1;
    for (let i = 0, l = collection.length; i < l; i += 4) {
        if (collection[i] === target && collection[i + 1] === method) {
            index = i;
            break;
        }
    }
    return index;
}
function findTimerItem(target, method, collection) {
    let index = -1;
    for (let i = 2, l = collection.length; i < l; i += 6) {
        if (collection[i] === target && collection[i + 1] === method) {
            index = i - 2;
            break;
        }
    }
    return index;
}
function getQueueItems(items, queueItemLength, queueItemPositionOffset = 0) {
    let queueItems = [];
    for (let i = 0; i < items.length; i += queueItemLength) {
        let maybeError = items[i + 3 /* stack */ + queueItemPositionOffset];
        let queueItem = {
            target: items[i + 0 /* target */ + queueItemPositionOffset],
            method: items[i + 1 /* method */ + queueItemPositionOffset],
            args: items[i + 2 /* args */ + queueItemPositionOffset],
            stack: maybeError !== undefined && 'stack' in maybeError ? maybeError.stack : ''
        };
        queueItems.push(queueItem);
    }
    return queueItems;
}

function binarySearch(time, timers) {
    let start = 0;
    let end = timers.length - TIMERS_OFFSET;
    let middle;
    let l;
    while (start < end) {
        // since timers is an array of pairs 'l' will always
        // be an integer
        l = (end - start) / TIMERS_OFFSET;
        // compensate for the index in case even number
        // of pairs inside timers
        middle = start + l - (l % TIMERS_OFFSET);
        if (time >= timers[middle]) {
            start = middle + TIMERS_OFFSET;
        }
        else {
            end = middle;
        }
    }
    return (time >= timers[start]) ? start + TIMERS_OFFSET : start;
}

const QUEUE_ITEM_LENGTH = 4;
class Queue {
    constructor(name, options = {}, globalOptions = {}) {
        this._queueBeingFlushed = [];
        this.targetQueues = new Map();
        this.index = 0;
        this._queue = [];
        this.name = name;
        this.options = options;
        this.globalOptions = globalOptions;
    }
    stackFor(index) {
        if (index < this._queue.length) {
            let entry = this._queue[index * 3 + QUEUE_ITEM_LENGTH];
            if (entry) {
                return entry.stack;
            }
            else {
                return null;
            }
        }
    }
    flush(sync) {
        let { before, after } = this.options;
        let target;
        let method;
        let args;
        let errorRecordedForStack;
        this.targetQueues.clear();
        if (this._queueBeingFlushed.length === 0) {
            this._queueBeingFlushed = this._queue;
            this._queue = [];
        }
        if (before !== undefined) {
            before();
        }
        let invoke;
        let queueItems = this._queueBeingFlushed;
        if (queueItems.length > 0) {
            let onError = getOnError(this.globalOptions);
            invoke = onError ? this.invokeWithOnError : this.invoke;
            for (let i = this.index; i < queueItems.length; i += QUEUE_ITEM_LENGTH) {
                this.index += QUEUE_ITEM_LENGTH;
                method = queueItems[i + 1];
                // method could have been nullified / canceled during flush
                if (method !== null) {
                    //
                    //    ** Attention intrepid developer **
                    //
                    //    To find out the stack of this task when it was scheduled onto
                    //    the run loop, add the following to your app.js:
                    //
                    //    Ember.run.backburner.DEBUG = true; // NOTE: This slows your app, don't leave it on in production.
                    //
                    //    Once that is in place, when you are at a breakpoint and navigate
                    //    here in the stack explorer, you can look at `errorRecordedForStack.stack`,
                    //    which will be the captured stack when this job was scheduled.
                    //
                    //    One possible long-term solution is the following Chrome issue:
                    //       https://bugs.chromium.org/p/chromium/issues/detail?id=332624
                    //
                    target = queueItems[i];
                    args = queueItems[i + 2];
                    errorRecordedForStack = queueItems[i + 3]; // Debugging assistance
                    invoke(target, method, args, onError, errorRecordedForStack);
                }
                if (this.index !== this._queueBeingFlushed.length &&
                    this.globalOptions.mustYield && this.globalOptions.mustYield()) {
                    return 1 /* Pause */;
                }
            }
        }
        if (after !== undefined) {
            after();
        }
        this._queueBeingFlushed.length = 0;
        this.index = 0;
        if (sync !== false && this._queue.length > 0) {
            // check if new items have been added
            this.flush(true);
        }
    }
    hasWork() {
        return this._queueBeingFlushed.length > 0 || this._queue.length > 0;
    }
    cancel({ target, method }) {
        let queue = this._queue;
        let targetQueueMap = this.targetQueues.get(target);
        if (targetQueueMap !== undefined) {
            targetQueueMap.delete(method);
        }
        let index = findItem(target, method, queue);
        if (index > -1) {
            queue[index + 1] = null;
            return true;
        }
        // if not found in current queue
        // could be in the queue that is being flushed
        queue = this._queueBeingFlushed;
        index = findItem(target, method, queue);
        if (index > -1) {
            queue[index + 1] = null;
            return true;
        }
        return false;
    }
    push(target, method, args, stack) {
        this._queue.push(target, method, args, stack);
        return {
            queue: this,
            target,
            method
        };
    }
    pushUnique(target, method, args, stack) {
        let localQueueMap = this.targetQueues.get(target);
        if (localQueueMap === undefined) {
            localQueueMap = new Map();
            this.targetQueues.set(target, localQueueMap);
        }
        let index = localQueueMap.get(method);
        if (index === undefined) {
            let queueIndex = this._queue.push(target, method, args, stack) - QUEUE_ITEM_LENGTH;
            localQueueMap.set(method, queueIndex);
        }
        else {
            let queue = this._queue;
            queue[index + 2] = args; // replace args
            queue[index + 3] = stack; // replace stack
        }
        return {
            queue: this,
            target,
            method
        };
    }
    _getDebugInfo(debugEnabled) {
        if (debugEnabled) {
            let debugInfo = getQueueItems(this._queue, QUEUE_ITEM_LENGTH);
            return debugInfo;
        }
        return undefined;
    }
    invoke(target, method, args /*, onError, errorRecordedForStack */) {
        if (args === undefined) {
            method.call(target);
        }
        else {
            method.apply(target, args);
        }
    }
    invokeWithOnError(target, method, args, onError, errorRecordedForStack) {
        try {
            if (args === undefined) {
                method.call(target);
            }
            else {
                method.apply(target, args);
            }
        }
        catch (error) {
            onError(error, errorRecordedForStack);
        }
    }
}

class DeferredActionQueues {
    constructor(queueNames = [], options) {
        this.queues = {};
        this.queueNameIndex = 0;
        this.queueNames = queueNames;
        queueNames.reduce(function (queues, queueName) {
            queues[queueName] = new Queue(queueName, options[queueName], options);
            return queues;
        }, this.queues);
    }
    /**
     * @method schedule
     * @param {String} queueName
     * @param {Any} target
     * @param {Any} method
     * @param {Any} args
     * @param {Boolean} onceFlag
     * @param {Any} stack
     * @return queue
     */
    schedule(queueName, target, method, args, onceFlag, stack) {
        let queues = this.queues;
        let queue = queues[queueName];
        if (queue === undefined) {
            throw new Error(`You attempted to schedule an action in a queue (${queueName}) that doesn\'t exist`);
        }
        if (method === undefined || method === null) {
            throw new Error(`You attempted to schedule an action in a queue (${queueName}) for a method that doesn\'t exist`);
        }
        this.queueNameIndex = 0;
        if (onceFlag) {
            return queue.pushUnique(target, method, args, stack);
        }
        else {
            return queue.push(target, method, args, stack);
        }
    }
    /**
     * DeferredActionQueues.flush() calls Queue.flush()
     *
     * @method flush
     * @param {Boolean} fromAutorun
     */
    flush(fromAutorun = false) {
        let queue;
        let queueName;
        let numberOfQueues = this.queueNames.length;
        while (this.queueNameIndex < numberOfQueues) {
            queueName = this.queueNames[this.queueNameIndex];
            queue = this.queues[queueName];
            if (queue.hasWork() === false) {
                this.queueNameIndex++;
                if (fromAutorun && this.queueNameIndex < numberOfQueues) {
                    return 1 /* Pause */;
                }
            }
            else {
                if (queue.flush(false /* async */) === 1 /* Pause */) {
                    return 1 /* Pause */;
                }
            }
        }
    }
    /**
     * Returns debug information for the current queues.
     *
     * @method _getDebugInfo
     * @param {Boolean} debugEnabled
     * @returns {IDebugInfo | undefined}
     */
    _getDebugInfo(debugEnabled) {
        if (debugEnabled) {
            let debugInfo = {};
            let queue;
            let queueName;
            let numberOfQueues = this.queueNames.length;
            let i = 0;
            while (i < numberOfQueues) {
                queueName = this.queueNames[i];
                queue = this.queues[queueName];
                debugInfo[queueName] = queue._getDebugInfo(debugEnabled);
                i++;
            }
            return debugInfo;
        }
        return;
    }
}

function iteratorDrain (fn) {
    let iterator = fn();
    let result = iterator.next();
    while (result.done === false) {
        result.value();
        result = iterator.next();
    }
}

const noop = function () { };
const DISABLE_SCHEDULE = Object.freeze([]);
function parseArgs() {
    let length = arguments.length;
    let args;
    let method;
    let target;
    if (length === 0) ;
    else if (length === 1) {
        target = null;
        method = arguments[0];
    }
    else {
        let argsIndex = 2;
        let methodOrTarget = arguments[0];
        let methodOrArgs = arguments[1];
        let type = typeof methodOrArgs;
        if (type === 'function') {
            target = methodOrTarget;
            method = methodOrArgs;
        }
        else if (methodOrTarget !== null && type === 'string' && methodOrArgs in methodOrTarget) {
            target = methodOrTarget;
            method = target[methodOrArgs];
        }
        else if (typeof methodOrTarget === 'function') {
            argsIndex = 1;
            target = null;
            method = methodOrTarget;
        }
        if (length > argsIndex) {
            let len = length - argsIndex;
            args = new Array(len);
            for (let i = 0; i < len; i++) {
                args[i] = arguments[i + argsIndex];
            }
        }
    }
    return [target, method, args];
}
function parseTimerArgs() {
    let [target, method, args] = parseArgs(...arguments);
    let wait = 0;
    let length = args !== undefined ? args.length : 0;
    if (length > 0) {
        let last = args[length - 1];
        if (isCoercableNumber(last)) {
            wait = parseInt(args.pop(), 10);
        }
    }
    return [target, method, args, wait];
}
function parseDebounceArgs() {
    let target;
    let method;
    let isImmediate;
    let args;
    let wait;
    if (arguments.length === 2) {
        method = arguments[0];
        wait = arguments[1];
        target = null;
    }
    else {
        [target, method, args] = parseArgs(...arguments);
        if (args === undefined) {
            wait = 0;
        }
        else {
            wait = args.pop();
            if (!isCoercableNumber(wait)) {
                isImmediate = wait === true;
                wait = args.pop();
            }
        }
    }
    wait = parseInt(wait, 10);
    return [target, method, args, wait, isImmediate];
}
let UUID = 0;
let beginCount = 0;
let endCount = 0;
let beginEventCount = 0;
let endEventCount = 0;
let runCount = 0;
let joinCount = 0;
let deferCount = 0;
let scheduleCount = 0;
let scheduleIterableCount = 0;
let deferOnceCount = 0;
let scheduleOnceCount = 0;
let setTimeoutCount = 0;
let laterCount = 0;
let throttleCount = 0;
let debounceCount = 0;
let cancelTimersCount = 0;
let cancelCount = 0;
let autorunsCreatedCount = 0;
let autorunsCompletedCount = 0;
let deferredActionQueuesCreatedCount = 0;
let nestedDeferredActionQueuesCreated = 0;
class Backburner {
    constructor(queueNames, options) {
        this.DEBUG = false;
        this.currentInstance = null;
        this.instanceStack = [];
        this._eventCallbacks = {
            end: [],
            begin: []
        };
        this._timerTimeoutId = null;
        this._timers = [];
        this._autorun = false;
        this._autorunStack = null;
        this.queueNames = queueNames;
        this.options = options || {};
        if (typeof this.options.defaultQueue === 'string') {
            this._defaultQueue = this.options.defaultQueue;
        }
        else {
            this._defaultQueue = this.queueNames[0];
        }
        this._onBegin = this.options.onBegin || noop;
        this._onEnd = this.options.onEnd || noop;
        this._boundRunExpiredTimers = this._runExpiredTimers.bind(this);
        this._boundAutorunEnd = () => {
            autorunsCompletedCount++;
            // if the autorun was already flushed, do nothing
            if (this._autorun === false) {
                return;
            }
            this._autorun = false;
            this._autorunStack = null;
            this._end(true /* fromAutorun */);
        };
        let builder = this.options._buildPlatform || buildPlatform;
        this._platform = builder(this._boundAutorunEnd);
    }
    get counters() {
        return {
            begin: beginCount,
            end: endCount,
            events: {
                begin: beginEventCount,
                end: endEventCount,
            },
            autoruns: {
                created: autorunsCreatedCount,
                completed: autorunsCompletedCount,
            },
            run: runCount,
            join: joinCount,
            defer: deferCount,
            schedule: scheduleCount,
            scheduleIterable: scheduleIterableCount,
            deferOnce: deferOnceCount,
            scheduleOnce: scheduleOnceCount,
            setTimeout: setTimeoutCount,
            later: laterCount,
            throttle: throttleCount,
            debounce: debounceCount,
            cancelTimers: cancelTimersCount,
            cancel: cancelCount,
            loops: {
                total: deferredActionQueuesCreatedCount,
                nested: nestedDeferredActionQueuesCreated,
            },
        };
    }
    get defaultQueue() {
        return this._defaultQueue;
    }
    /*
      @method begin
      @return instantiated class DeferredActionQueues
    */
    begin() {
        beginCount++;
        let options = this.options;
        let previousInstance = this.currentInstance;
        let current;
        if (this._autorun !== false) {
            current = previousInstance;
            this._cancelAutorun();
        }
        else {
            if (previousInstance !== null) {
                nestedDeferredActionQueuesCreated++;
                this.instanceStack.push(previousInstance);
            }
            deferredActionQueuesCreatedCount++;
            current = this.currentInstance = new DeferredActionQueues(this.queueNames, options);
            beginEventCount++;
            this._trigger('begin', current, previousInstance);
        }
        this._onBegin(current, previousInstance);
        return current;
    }
    end() {
        endCount++;
        this._end(false);
    }
    on(eventName, callback) {
        if (typeof callback !== 'function') {
            throw new TypeError(`Callback must be a function`);
        }
        let callbacks = this._eventCallbacks[eventName];
        if (callbacks !== undefined) {
            callbacks.push(callback);
        }
        else {
            throw new TypeError(`Cannot on() event ${eventName} because it does not exist`);
        }
    }
    off(eventName, callback) {
        let callbacks = this._eventCallbacks[eventName];
        if (!eventName || callbacks === undefined) {
            throw new TypeError(`Cannot off() event ${eventName} because it does not exist`);
        }
        let callbackFound = false;
        if (callback) {
            for (let i = 0; i < callbacks.length; i++) {
                if (callbacks[i] === callback) {
                    callbackFound = true;
                    callbacks.splice(i, 1);
                    i--;
                }
            }
        }
        if (!callbackFound) {
            throw new TypeError(`Cannot off() callback that does not exist`);
        }
    }
    run() {
        runCount++;
        let [target, method, args] = parseArgs(...arguments);
        return this._run(target, method, args);
    }
    join() {
        joinCount++;
        let [target, method, args] = parseArgs(...arguments);
        return this._join(target, method, args);
    }
    /**
     * @deprecated please use schedule instead.
     */
    defer(queueName, target, method, ...args) {
        deferCount++;
        return this.schedule(queueName, target, method, ...args);
    }
    schedule(queueName, ..._args) {
        scheduleCount++;
        let [target, method, args] = parseArgs(..._args);
        let stack = this.DEBUG ? new Error() : undefined;
        return this._ensureInstance().schedule(queueName, target, method, args, false, stack);
    }
    /*
      Defer the passed iterable of functions to run inside the specified queue.
  
      @method scheduleIterable
      @param {String} queueName
      @param {Iterable} an iterable of functions to execute
      @return method result
    */
    scheduleIterable(queueName, iterable) {
        scheduleIterableCount++;
        let stack = this.DEBUG ? new Error() : undefined;
        return this._ensureInstance().schedule(queueName, null, iteratorDrain, [iterable], false, stack);
    }
    /**
     * @deprecated please use scheduleOnce instead.
     */
    deferOnce(queueName, target, method, ...args) {
        deferOnceCount++;
        return this.scheduleOnce(queueName, target, method, ...args);
    }
    scheduleOnce(queueName, ..._args) {
        scheduleOnceCount++;
        let [target, method, args] = parseArgs(..._args);
        let stack = this.DEBUG ? new Error() : undefined;
        return this._ensureInstance().schedule(queueName, target, method, args, true, stack);
    }
    setTimeout() {
        setTimeoutCount++;
        return this.later(...arguments);
    }
    later() {
        laterCount++;
        let [target, method, args, wait] = parseTimerArgs(...arguments);
        return this._later(target, method, args, wait);
    }
    throttle() {
        throttleCount++;
        let [target, method, args, wait, isImmediate = true] = parseDebounceArgs(...arguments);
        let index = findTimerItem(target, method, this._timers);
        let timerId;
        if (index === -1) {
            timerId = this._later(target, method, isImmediate ? DISABLE_SCHEDULE : args, wait);
            if (isImmediate) {
                this._join(target, method, args);
            }
        }
        else {
            timerId = this._timers[index + 1];
            let argIndex = index + 4;
            if (this._timers[argIndex] !== DISABLE_SCHEDULE) {
                this._timers[argIndex] = args;
            }
        }
        return timerId;
    }
    debounce() {
        debounceCount++;
        let [target, method, args, wait, isImmediate = false] = parseDebounceArgs(...arguments);
        let _timers = this._timers;
        let index = findTimerItem(target, method, _timers);
        let timerId;
        if (index === -1) {
            timerId = this._later(target, method, isImmediate ? DISABLE_SCHEDULE : args, wait);
            if (isImmediate) {
                this._join(target, method, args);
            }
        }
        else {
            let executeAt = this._platform.now() + wait;
            let argIndex = index + 4;
            if (_timers[argIndex] === DISABLE_SCHEDULE) {
                args = DISABLE_SCHEDULE;
            }
            timerId = _timers[index + 1];
            let i = binarySearch(executeAt, _timers);
            if ((index + TIMERS_OFFSET) === i) {
                _timers[index] = executeAt;
                _timers[argIndex] = args;
            }
            else {
                let stack = this._timers[index + 5];
                this._timers.splice(i, 0, executeAt, timerId, target, method, args, stack);
                this._timers.splice(index, TIMERS_OFFSET);
            }
            if (index === 0) {
                this._reinstallTimerTimeout();
            }
        }
        return timerId;
    }
    cancelTimers() {
        cancelTimersCount++;
        this._clearTimerTimeout();
        this._timers = [];
        this._cancelAutorun();
    }
    hasTimers() {
        return this._timers.length > 0 || this._autorun;
    }
    cancel(timer) {
        cancelCount++;
        if (timer === null || timer === undefined) {
            return false;
        }
        let timerType = typeof timer;
        if (timerType === 'number') { // we're cancelling a setTimeout or throttle or debounce
            return this._cancelLaterTimer(timer);
        }
        else if (timerType === 'object' && timer.queue && timer.method) { // we're cancelling a deferOnce
            return timer.queue.cancel(timer);
        }
        return false;
    }
    ensureInstance() {
        this._ensureInstance();
    }
    /**
     * Returns debug information related to the current instance of Backburner
     *
     * @method getDebugInfo
     * @returns {Object | undefined} Will return and Object containing debug information if
     * the DEBUG flag is set to true on the current instance of Backburner, else undefined.
     */
    getDebugInfo() {
        if (this.DEBUG) {
            return {
                autorun: this._autorunStack,
                counters: this.counters,
                timers: getQueueItems(this._timers, TIMERS_OFFSET, 2),
                instanceStack: [this.currentInstance, ...this.instanceStack]
                    .map((deferredActionQueue) => deferredActionQueue && deferredActionQueue._getDebugInfo(this.DEBUG))
            };
        }
        return undefined;
    }
    _end(fromAutorun) {
        let currentInstance = this.currentInstance;
        let nextInstance = null;
        if (currentInstance === null) {
            throw new Error(`end called without begin`);
        }
        // Prevent double-finally bug in Safari 6.0.2 and iOS 6
        // This bug appears to be resolved in Safari 6.0.5 and iOS 7
        let finallyAlreadyCalled = false;
        let result;
        try {
            result = currentInstance.flush(fromAutorun);
        }
        finally {
            if (!finallyAlreadyCalled) {
                finallyAlreadyCalled = true;
                if (result === 1 /* Pause */) {
                    const plannedNextQueue = this.queueNames[currentInstance.queueNameIndex];
                    this._scheduleAutorun(plannedNextQueue);
                }
                else {
                    this.currentInstance = null;
                    if (this.instanceStack.length > 0) {
                        nextInstance = this.instanceStack.pop();
                        this.currentInstance = nextInstance;
                    }
                    this._trigger('end', currentInstance, nextInstance);
                    this._onEnd(currentInstance, nextInstance);
                }
            }
        }
    }
    _join(target, method, args) {
        if (this.currentInstance === null) {
            return this._run(target, method, args);
        }
        if (target === undefined && args === undefined) {
            return method();
        }
        else {
            return method.apply(target, args);
        }
    }
    _run(target, method, args) {
        let onError = getOnError(this.options);
        this.begin();
        if (onError) {
            try {
                return method.apply(target, args);
            }
            catch (error) {
                onError(error);
            }
            finally {
                this.end();
            }
        }
        else {
            try {
                return method.apply(target, args);
            }
            finally {
                this.end();
            }
        }
    }
    _cancelAutorun() {
        if (this._autorun) {
            this._platform.clearNext();
            this._autorun = false;
            this._autorunStack = null;
        }
    }
    _later(target, method, args, wait) {
        let stack = this.DEBUG ? new Error() : undefined;
        let executeAt = this._platform.now() + wait;
        let id = UUID++;
        if (this._timers.length === 0) {
            this._timers.push(executeAt, id, target, method, args, stack);
            this._installTimerTimeout();
        }
        else {
            // find position to insert
            let i = binarySearch(executeAt, this._timers);
            this._timers.splice(i, 0, executeAt, id, target, method, args, stack);
            // always reinstall since it could be out of sync
            this._reinstallTimerTimeout();
        }
        return id;
    }
    _cancelLaterTimer(timer) {
        for (let i = 1; i < this._timers.length; i += TIMERS_OFFSET) {
            if (this._timers[i] === timer) {
                this._timers.splice(i - 1, TIMERS_OFFSET);
                if (i === 1) {
                    this._reinstallTimerTimeout();
                }
                return true;
            }
        }
        return false;
    }
    /**
     Trigger an event. Supports up to two arguments. Designed around
     triggering transition events from one run loop instance to the
     next, which requires an argument for the  instance and then
     an argument for the next instance.
  
     @private
     @method _trigger
     @param {String} eventName
     @param {any} arg1
     @param {any} arg2
     */
    _trigger(eventName, arg1, arg2) {
        let callbacks = this._eventCallbacks[eventName];
        if (callbacks !== undefined) {
            for (let i = 0; i < callbacks.length; i++) {
                callbacks[i](arg1, arg2);
            }
        }
    }
    _runExpiredTimers() {
        this._timerTimeoutId = null;
        if (this._timers.length > 0) {
            this.begin();
            this._scheduleExpiredTimers();
            this.end();
        }
    }
    _scheduleExpiredTimers() {
        let timers = this._timers;
        let i = 0;
        let l = timers.length;
        let defaultQueue = this._defaultQueue;
        let n = this._platform.now();
        for (; i < l; i += TIMERS_OFFSET) {
            let executeAt = timers[i];
            if (executeAt > n) {
                break;
            }
            let args = timers[i + 4];
            if (args !== DISABLE_SCHEDULE) {
                let target = timers[i + 2];
                let method = timers[i + 3];
                let stack = timers[i + 5];
                this.currentInstance.schedule(defaultQueue, target, method, args, false, stack);
            }
        }
        timers.splice(0, i);
        this._installTimerTimeout();
    }
    _reinstallTimerTimeout() {
        this._clearTimerTimeout();
        this._installTimerTimeout();
    }
    _clearTimerTimeout() {
        if (this._timerTimeoutId === null) {
            return;
        }
        this._platform.clearTimeout(this._timerTimeoutId);
        this._timerTimeoutId = null;
    }
    _installTimerTimeout() {
        if (this._timers.length === 0) {
            return;
        }
        let minExpiresAt = this._timers[0];
        let n = this._platform.now();
        let wait = Math.max(0, minExpiresAt - n);
        this._timerTimeoutId = this._platform.setTimeout(this._boundRunExpiredTimers, wait);
    }
    _ensureInstance() {
        let currentInstance = this.currentInstance;
        if (currentInstance === null) {
            this._autorunStack = this.DEBUG ? new Error() : undefined;
            currentInstance = this.begin();
            this._scheduleAutorun(this.queueNames[0]);
        }
        return currentInstance;
    }
    _scheduleAutorun(plannedNextQueue) {
        autorunsCreatedCount++;
        const next = this._platform.next;
        const flush = this.options.flush;
        if (flush) {
            flush(plannedNextQueue, next);
        }
        else {
            next();
        }
        this._autorun = true;
    }
}
Backburner.Queue = Queue;
Backburner.buildPlatform = buildPlatform;
Backburner.buildNext = buildNext;

export default Backburner;
export { buildPlatform };
//# sourceMappingURL=backburner.js.map
