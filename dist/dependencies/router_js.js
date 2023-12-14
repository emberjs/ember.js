import RouteRecognizer from 'route-recognizer';
import { Promise as Promise$1 } from 'rsvp';
import { DEBUG } from '@glimmer/env';

function buildTransitionAborted() {
    let error = new Error('TransitionAborted');
    error.name = 'TransitionAborted';
    error.code = 'TRANSITION_ABORTED';
    return error;
}
function isTransitionAborted(maybeError) {
    return (typeof maybeError === 'object' &&
        maybeError !== null &&
        maybeError.code === 'TRANSITION_ABORTED');
}
function isAbortable(maybeAbortable) {
    return (typeof maybeAbortable === 'object' &&
        maybeAbortable !== null &&
        typeof maybeAbortable.isAborted === 'boolean');
}
function throwIfAborted(maybe) {
    if (isAbortable(maybe) && maybe.isAborted) {
        throw buildTransitionAborted();
    }
}

const slice = Array.prototype.slice;
const hasOwnProperty = Object.prototype.hasOwnProperty;
/**
  Determines if an object is Promise by checking if it is "thenable".
**/
function isPromise(p) {
    return p !== null && typeof p === 'object' && typeof p.then === 'function';
}
function merge(hash, other) {
    for (let prop in other) {
        if (hasOwnProperty.call(other, prop)) {
            hash[prop] = other[prop];
        }
    }
}
/**
  @private

  Extracts query params from the end of an array
**/
function extractQueryParams(array) {
    let len = array && array.length, head, queryParams;
    if (len && len > 0) {
        let obj = array[len - 1];
        if (isQueryParamsContainer(obj)) {
            queryParams = obj.queryParams;
            head = slice.call(array, 0, len - 1);
            return [head, queryParams];
        }
    }
    // SAFETY: We confirmed that the last item isn't a QP container
    return [array, null];
}
// TODO: Actually check that Dict is QueryParams
function isQueryParamsContainer(obj) {
    if (obj && typeof obj === 'object') {
        let cast = obj;
        return ('queryParams' in cast && Object.keys(cast.queryParams).every((k) => typeof k === 'string'));
    }
    return false;
}
/**
  @private

  Coerces query param properties and array elements into strings.
**/
function coerceQueryParamsToString(queryParams) {
    for (let key in queryParams) {
        let val = queryParams[key];
        if (typeof val === 'number') {
            queryParams[key] = '' + val;
        }
        else if (Array.isArray(val)) {
            for (let i = 0, l = val.length; i < l; i++) {
                val[i] = '' + val[i];
            }
        }
    }
}
/**
  @private
 */
function log(router, ...args) {
    if (!router.log) {
        return;
    }
    if (args.length === 2) {
        let [sequence, msg] = args;
        router.log('Transition #' + sequence + ': ' + msg);
    }
    else {
        let [msg] = args;
        router.log(msg);
    }
}
function isParam(object) {
    return (typeof object === 'string' ||
        object instanceof String ||
        typeof object === 'number' ||
        object instanceof Number);
}
function forEach(array, callback) {
    for (let i = 0, l = array.length; i < l && callback(array[i]) !== false; i++) {
        // empty intentionally
    }
}
function getChangelist(oldObject, newObject) {
    let key;
    let results = {
        all: {},
        changed: {},
        removed: {},
    };
    merge(results.all, newObject);
    let didChange = false;
    coerceQueryParamsToString(oldObject);
    coerceQueryParamsToString(newObject);
    // Calculate removals
    for (key in oldObject) {
        if (hasOwnProperty.call(oldObject, key)) {
            if (!hasOwnProperty.call(newObject, key)) {
                didChange = true;
                results.removed[key] = oldObject[key];
            }
        }
    }
    // Calculate changes
    for (key in newObject) {
        if (hasOwnProperty.call(newObject, key)) {
            let oldElement = oldObject[key];
            let newElement = newObject[key];
            if (isArray(oldElement) && isArray(newElement)) {
                if (oldElement.length !== newElement.length) {
                    results.changed[key] = newObject[key];
                    didChange = true;
                }
                else {
                    for (let i = 0, l = oldElement.length; i < l; i++) {
                        if (oldElement[i] !== newElement[i]) {
                            results.changed[key] = newObject[key];
                            didChange = true;
                        }
                    }
                }
            }
            else if (oldObject[key] !== newObject[key]) {
                results.changed[key] = newObject[key];
                didChange = true;
            }
        }
    }
    return didChange ? results : undefined;
}
function isArray(obj) {
    return Array.isArray(obj);
}
function promiseLabel(label) {
    return 'Router: ' + label;
}

const STATE_SYMBOL = `__STATE__-2619860001345920-3322w3`;
const PARAMS_SYMBOL = `__PARAMS__-261986232992830203-23323`;
const QUERY_PARAMS_SYMBOL = `__QPS__-2619863929824844-32323`;
/**
  A Transition is a thenable (a promise-like object) that represents
  an attempt to transition to another route. It can be aborted, either
  explicitly via `abort` or by attempting another transition while a
  previous one is still underway. An aborted transition can also
  be `retry()`d later.

  @class Transition
  @constructor
  @param {Object} router
  @param {Object} intent
  @param {Object} state
  @param {Object} error
  @private
 */
class Transition {
    constructor(router, intent, state, error = undefined, previousTransition = undefined) {
        this.from = null;
        this.to = undefined;
        this.isAborted = false;
        this.isActive = true;
        this.urlMethod = 'update';
        this.resolveIndex = 0;
        this.queryParamsOnly = false;
        this.isTransition = true;
        this.isCausedByAbortingTransition = false;
        this.isCausedByInitialTransition = false;
        this.isCausedByAbortingReplaceTransition = false;
        this._visibleQueryParams = {};
        this.isIntermediate = false;
        this[STATE_SYMBOL] = state || router.state;
        this.intent = intent;
        this.router = router;
        this.data = (intent && intent.data) || {};
        this.resolvedModels = {};
        this[QUERY_PARAMS_SYMBOL] = {};
        this.promise = undefined;
        this.error = undefined;
        this[PARAMS_SYMBOL] = {};
        this.routeInfos = [];
        this.targetName = undefined;
        this.pivotHandler = undefined;
        this.sequence = -1;
        if (DEBUG) {
            let error = new Error(`Transition creation stack`);
            this.debugCreationStack = () => error.stack;
            // not aborted yet, will be replaced when `this.isAborted` is set
            this.debugAbortStack = () => undefined;
            this.debugPreviousTransition = previousTransition;
        }
        if (error) {
            this.promise = Promise$1.reject(error);
            this.error = error;
            return;
        }
        // if you're doing multiple redirects, need the new transition to know if it
        // is actually part of the first transition or not. Any further redirects
        // in the initial transition also need to know if they are part of the
        // initial transition
        this.isCausedByAbortingTransition = !!previousTransition;
        this.isCausedByInitialTransition =
            !!previousTransition &&
                (previousTransition.isCausedByInitialTransition || previousTransition.sequence === 0);
        // Every transition in the chain is a replace
        this.isCausedByAbortingReplaceTransition =
            !!previousTransition &&
                previousTransition.urlMethod === 'replace' &&
                (!previousTransition.isCausedByAbortingTransition ||
                    previousTransition.isCausedByAbortingReplaceTransition);
        if (state) {
            this[PARAMS_SYMBOL] = state.params;
            this[QUERY_PARAMS_SYMBOL] = state.queryParams;
            this.routeInfos = state.routeInfos;
            let len = state.routeInfos.length;
            if (len) {
                this.targetName = state.routeInfos[len - 1].name;
            }
            for (let i = 0; i < len; ++i) {
                let handlerInfo = state.routeInfos[i];
                // TODO: this all seems hacky
                if (!handlerInfo.isResolved) {
                    break;
                }
                this.pivotHandler = handlerInfo.route;
            }
            this.sequence = router.currentSequence++;
            this.promise = state.resolve(this).catch((result) => {
                let error = this.router.transitionDidError(result, this);
                throw error;
            }, promiseLabel('Handle Abort'));
        }
        else {
            this.promise = Promise$1.resolve(this[STATE_SYMBOL]);
            this[PARAMS_SYMBOL] = {};
        }
    }
    /**
      The Transition's internal promise. Calling `.then` on this property
      is that same as calling `.then` on the Transition object itself, but
      this property is exposed for when you want to pass around a
      Transition's promise, but not the Transition object itself, since
      Transition object can be externally `abort`ed, while the promise
      cannot.
  
      @property promise
      @type {Object}
      @public
     */
    /**
      Custom state can be stored on a Transition's `data` object.
      This can be useful for decorating a Transition within an earlier
      hook and shared with a later hook. Properties set on `data` will
      be copied to new transitions generated by calling `retry` on this
      transition.
  
      @property data
      @type {Object}
      @public
     */
    /**
      A standard promise hook that resolves if the transition
      succeeds and rejects if it fails/redirects/aborts.
  
      Forwards to the internal `promise` property which you can
      use in situations where you want to pass around a thenable,
      but not the Transition itself.
  
      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      @param {String} label optional string for labeling the promise.
      Useful for tooling.
      @return {Promise}
      @public
     */
    then(onFulfilled, onRejected, label) {
        return this.promise.then(onFulfilled, onRejected, label);
    }
    /**
  
      Forwards to the internal `promise` property which you can
      use in situations where you want to pass around a thennable,
      but not the Transition itself.
  
      @method catch
      @param {Function} onRejection
      @param {String} label optional string for labeling the promise.
      Useful for tooling.
      @return {Promise}
      @public
     */
    catch(onRejection, label) {
        return this.promise.catch(onRejection, label);
    }
    /**
  
      Forwards to the internal `promise` property which you can
      use in situations where you want to pass around a thenable,
      but not the Transition itself.
  
      @method finally
      @param {Function} callback
      @param {String} label optional string for labeling the promise.
      Useful for tooling.
      @return {Promise}
      @public
     */
    finally(callback, label) {
        return this.promise.finally(callback, label);
    }
    /**
      Aborts the Transition. Note you can also implicitly abort a transition
      by initiating another transition while a previous one is underway.
  
      @method abort
      @return {Transition} this transition
      @public
     */
    abort() {
        this.rollback();
        let transition = new Transition(this.router, undefined, undefined, undefined);
        transition.to = this.from;
        transition.from = this.from;
        transition.isAborted = true;
        this.router.routeWillChange(transition);
        this.router.routeDidChange(transition);
        return this;
    }
    rollback() {
        if (!this.isAborted) {
            log(this.router, this.sequence, this.targetName + ': transition was aborted');
            if (DEBUG) {
                let error = new Error(`Transition aborted stack`);
                this.debugAbortStack = () => error.stack;
            }
            if (this.intent !== undefined && this.intent !== null) {
                this.intent.preTransitionState = this.router.state;
            }
            this.isAborted = true;
            this.isActive = false;
            this.router.activeTransition = undefined;
        }
    }
    redirect(newTransition) {
        this.rollback();
        this.router.routeWillChange(newTransition);
    }
    /**
  
      Retries a previously-aborted transition (making sure to abort the
      transition if it's still active). Returns a new transition that
      represents the new attempt to transition.
  
      @method retry
      @return {Transition} new transition
      @public
     */
    retry() {
        // TODO: add tests for merged state retry()s
        this.abort();
        let newTransition = this.router.transitionByIntent(this.intent, false);
        // inheriting a `null` urlMethod is not valid
        // the urlMethod is only set to `null` when
        // the transition is initiated *after* the url
        // has been updated (i.e. `router.handleURL`)
        //
        // in that scenario, the url method cannot be
        // inherited for a new transition because then
        // the url would not update even though it should
        if (this.urlMethod !== null) {
            newTransition.method(this.urlMethod);
        }
        return newTransition;
    }
    /**
  
      Sets the URL-changing method to be employed at the end of a
      successful transition. By default, a new Transition will just
      use `updateURL`, but passing 'replace' to this method will
      cause the URL to update using 'replaceWith' instead. Omitting
      a parameter will disable the URL change, allowing for transitions
      that don't update the URL at completion (this is also used for
      handleURL, since the URL has already changed before the
      transition took place).
  
      @method method
      @param {String} method the type of URL-changing method to use
        at the end of a transition. Accepted values are 'replace',
        falsy values, or any other non-falsy value (which is
        interpreted as an updateURL transition).
  
      @return {Transition} this transition
      @public
     */
    method(method) {
        this.urlMethod = method;
        return this;
    }
    // Alias 'trigger' as 'send'
    send(ignoreFailure = false, _name, err, transition, handler) {
        this.trigger(ignoreFailure, _name, err, transition, handler);
    }
    /**
  
      Fires an event on the current list of resolved/resolving
      handlers within this transition. Useful for firing events
      on route hierarchies that haven't fully been entered yet.
  
      Note: This method is also aliased as `send`
  
      @method trigger
      @param {Boolean} [ignoreFailure=false] a boolean specifying whether unhandled events throw an error
      @param {String} name the name of the event to fire
      @public
     */
    trigger(ignoreFailure = false, name, ...args) {
        // TODO: Deprecate the current signature
        if (typeof ignoreFailure === 'string') {
            name = ignoreFailure;
            ignoreFailure = false;
        }
        this.router.triggerEvent(this[STATE_SYMBOL].routeInfos.slice(0, this.resolveIndex + 1), ignoreFailure, name, args);
    }
    /**
      Transitions are aborted and their promises rejected
      when redirects occur; this method returns a promise
      that will follow any redirects that occur and fulfill
      with the value fulfilled by any redirecting transitions
      that occur.
  
      @method followRedirects
      @return {Promise} a promise that fulfills with the same
        value that the final redirecting transition fulfills with
      @public
     */
    followRedirects() {
        let router = this.router;
        return this.promise.catch(function (reason) {
            if (router.activeTransition) {
                return router.activeTransition.followRedirects();
            }
            return Promise$1.reject(reason);
        });
    }
    toString() {
        return 'Transition (sequence ' + this.sequence + ')';
    }
    /**
      @private
     */
    log(message) {
        log(this.router, this.sequence, message);
    }
}
/**
  @private

  Logs and returns an instance of TransitionAborted.
 */
function logAbort(transition) {
    log(transition.router, transition.sequence, 'detected abort.');
    return buildTransitionAborted();
}
function isTransition(obj) {
    return typeof obj === 'object' && obj instanceof Transition && obj.isTransition;
}
function prepareResult(obj) {
    if (isTransition(obj)) {
        return null;
    }
    return obj;
}

let ROUTE_INFOS = new WeakMap();
function toReadOnlyRouteInfo(routeInfos, queryParams = {}, includeAttributes = false) {
    return routeInfos.map((info, i) => {
        let { name, params, paramNames, context, route } = info;
        // SAFETY: This should be safe since it is just for use as a key
        let key = info;
        if (ROUTE_INFOS.has(key) && includeAttributes) {
            let routeInfo = ROUTE_INFOS.get(key);
            routeInfo = attachMetadata(route, routeInfo);
            let routeInfoWithAttribute = createRouteInfoWithAttributes(routeInfo, context);
            ROUTE_INFOS.set(key, routeInfoWithAttribute);
            return routeInfoWithAttribute;
        }
        let routeInfo = {
            find(predicate, thisArg) {
                let publicInfo;
                let arr = [];
                if (predicate.length === 3) {
                    arr = routeInfos.map(
                    // SAFETY: This should be safe since it is just for use as a key
                    (info) => ROUTE_INFOS.get(info));
                }
                for (let i = 0; routeInfos.length > i; i++) {
                    // SAFETY: This should be safe since it is just for use as a key
                    publicInfo = ROUTE_INFOS.get(routeInfos[i]);
                    if (predicate.call(thisArg, publicInfo, i, arr)) {
                        return publicInfo;
                    }
                }
                return undefined;
            },
            get name() {
                return name;
            },
            get paramNames() {
                return paramNames;
            },
            get metadata() {
                return buildRouteInfoMetadata(info.route);
            },
            get parent() {
                let parent = routeInfos[i - 1];
                if (parent === undefined) {
                    return null;
                }
                // SAFETY: This should be safe since it is just for use as a key
                return ROUTE_INFOS.get(parent);
            },
            get child() {
                let child = routeInfos[i + 1];
                if (child === undefined) {
                    return null;
                }
                // SAFETY: This should be safe since it is just for use as a key
                return ROUTE_INFOS.get(child);
            },
            get localName() {
                let parts = this.name.split('.');
                return parts[parts.length - 1];
            },
            get params() {
                return params;
            },
            get queryParams() {
                return queryParams;
            },
        };
        if (includeAttributes) {
            routeInfo = createRouteInfoWithAttributes(routeInfo, context);
        }
        // SAFETY: This should be safe since it is just for use as a key
        ROUTE_INFOS.set(info, routeInfo);
        return routeInfo;
    });
}
function createRouteInfoWithAttributes(routeInfo, context) {
    let attributes = {
        get attributes() {
            return context;
        },
    };
    if (!Object.isExtensible(routeInfo) || routeInfo.hasOwnProperty('attributes')) {
        return Object.freeze(Object.assign({}, routeInfo, attributes));
    }
    return Object.assign(routeInfo, attributes);
}
function buildRouteInfoMetadata(route) {
    if (route !== undefined && route !== null && route.buildRouteInfoMetadata !== undefined) {
        return route.buildRouteInfoMetadata();
    }
    return null;
}
function attachMetadata(route, routeInfo) {
    let metadata = {
        get metadata() {
            return buildRouteInfoMetadata(route);
        },
    };
    if (!Object.isExtensible(routeInfo) || routeInfo.hasOwnProperty('metadata')) {
        return Object.freeze(Object.assign({}, routeInfo, metadata));
    }
    return Object.assign(routeInfo, metadata);
}
class InternalRouteInfo {
    constructor(router, name, paramNames, route) {
        this._routePromise = undefined;
        this._route = null;
        this.params = {};
        this.isResolved = false;
        this.name = name;
        this.paramNames = paramNames;
        this.router = router;
        if (route) {
            this._processRoute(route);
        }
    }
    getModel(_transition) {
        return Promise$1.resolve(this.context);
    }
    serialize(_context) {
        return this.params || {};
    }
    resolve(transition) {
        return Promise$1.resolve(this.routePromise)
            .then((route) => {
            throwIfAborted(transition);
            return route;
        })
            .then(() => this.runBeforeModelHook(transition))
            .then(() => throwIfAborted(transition))
            .then(() => this.getModel(transition))
            .then((resolvedModel) => {
            throwIfAborted(transition);
            return resolvedModel;
        })
            .then((resolvedModel) => this.runAfterModelHook(transition, resolvedModel))
            .then((resolvedModel) => this.becomeResolved(transition, resolvedModel));
    }
    becomeResolved(transition, resolvedContext) {
        let params = this.serialize(resolvedContext);
        if (transition) {
            this.stashResolvedModel(transition, resolvedContext);
            transition[PARAMS_SYMBOL] = transition[PARAMS_SYMBOL] || {};
            transition[PARAMS_SYMBOL][this.name] = params;
        }
        let context;
        let contextsMatch = resolvedContext === this.context;
        if ('context' in this || !contextsMatch) {
            context = resolvedContext;
        }
        // SAFETY: Since this is just for lookup, it should be safe
        let cached = ROUTE_INFOS.get(this);
        let resolved = new ResolvedRouteInfo(this.router, this.name, this.paramNames, params, this.route, context);
        if (cached !== undefined) {
            // SAFETY: This is potentially a bit risker, but for what we're doing, it should be ok.
            ROUTE_INFOS.set(resolved, cached);
        }
        return resolved;
    }
    shouldSupersede(routeInfo) {
        // Prefer this newer routeInfo over `other` if:
        // 1) The other one doesn't exist
        // 2) The names don't match
        // 3) This route has a context that doesn't match
        //    the other one (or the other one doesn't have one).
        // 4) This route has parameters that don't match the other.
        if (!routeInfo) {
            return true;
        }
        let contextsMatch = routeInfo.context === this.context;
        return (routeInfo.name !== this.name ||
            ('context' in this && !contextsMatch) ||
            (this.hasOwnProperty('params') && !paramsMatch(this.params, routeInfo.params)));
    }
    get route() {
        // _route could be set to either a route object or undefined, so we
        // compare against null to know when it's been set
        if (this._route !== null) {
            return this._route;
        }
        return this.fetchRoute();
    }
    set route(route) {
        this._route = route;
    }
    get routePromise() {
        if (this._routePromise) {
            return this._routePromise;
        }
        this.fetchRoute();
        return this._routePromise;
    }
    set routePromise(routePromise) {
        this._routePromise = routePromise;
    }
    log(transition, message) {
        if (transition.log) {
            transition.log(this.name + ': ' + message);
        }
    }
    updateRoute(route) {
        route._internalName = this.name;
        return (this.route = route);
    }
    runBeforeModelHook(transition) {
        if (transition.trigger) {
            transition.trigger(true, 'willResolveModel', transition, this.route);
        }
        let result;
        if (this.route) {
            if (this.route.beforeModel !== undefined) {
                result = this.route.beforeModel(transition);
            }
        }
        if (isTransition(result)) {
            result = null;
        }
        return Promise$1.resolve(result);
    }
    runAfterModelHook(transition, resolvedModel) {
        // Stash the resolved model on the payload.
        // This makes it possible for users to swap out
        // the resolved model in afterModel.
        let name = this.name;
        this.stashResolvedModel(transition, resolvedModel);
        let result;
        if (this.route !== undefined) {
            if (this.route.afterModel !== undefined) {
                result = this.route.afterModel(resolvedModel, transition);
            }
        }
        result = prepareResult(result);
        return Promise$1.resolve(result).then(() => {
            // Ignore the fulfilled value returned from afterModel.
            // Return the value stashed in resolvedModels, which
            // might have been swapped out in afterModel.
            // SAFTEY: We expect this to be of type T, though typing it as such is challenging.
            return transition.resolvedModels[name];
        });
    }
    stashResolvedModel(transition, resolvedModel) {
        transition.resolvedModels = transition.resolvedModels || {};
        // SAFETY: It's unfortunate that we have to do this cast. It should be safe though.
        transition.resolvedModels[this.name] = resolvedModel;
    }
    fetchRoute() {
        let route = this.router.getRoute(this.name);
        return this._processRoute(route);
    }
    _processRoute(route) {
        // Setup a routePromise so that we can wait for asynchronously loaded routes
        this.routePromise = Promise$1.resolve(route);
        // Wait until the 'route' property has been updated when chaining to a route
        // that is a promise
        if (isPromise(route)) {
            this.routePromise = this.routePromise.then((r) => {
                return this.updateRoute(r);
            });
            // set to undefined to avoid recursive loop in the route getter
            return (this.route = undefined);
        }
        else if (route) {
            return this.updateRoute(route);
        }
        return undefined;
    }
}
class ResolvedRouteInfo extends InternalRouteInfo {
    constructor(router, name, paramNames, params, route, context) {
        super(router, name, paramNames, route);
        this.params = params;
        this.isResolved = true;
        this.context = context;
    }
    resolve(transition) {
        // A ResolvedRouteInfo just resolved with itself.
        if (transition && transition.resolvedModels) {
            transition.resolvedModels[this.name] = this.context;
        }
        return Promise$1.resolve(this);
    }
}
class UnresolvedRouteInfoByParam extends InternalRouteInfo {
    constructor(router, name, paramNames, params, route) {
        super(router, name, paramNames, route);
        this.params = {};
        if (params) {
            this.params = params;
        }
    }
    getModel(transition) {
        let fullParams = this.params;
        if (transition && transition[QUERY_PARAMS_SYMBOL]) {
            fullParams = {};
            merge(fullParams, this.params);
            fullParams.queryParams = transition[QUERY_PARAMS_SYMBOL];
        }
        let route = this.route;
        let result;
        // FIXME: Review these casts
        if (route.deserialize) {
            result = route.deserialize(fullParams, transition);
        }
        else if (route.model) {
            result = route.model(fullParams, transition);
        }
        if (result && isTransition(result)) {
            result = undefined;
        }
        return Promise$1.resolve(result);
    }
}
class UnresolvedRouteInfoByObject extends InternalRouteInfo {
    constructor(router, name, paramNames, context) {
        super(router, name, paramNames);
        this.context = context;
        this.serializer = this.router.getSerializer(name);
    }
    getModel(transition) {
        if (this.router.log !== undefined) {
            this.router.log(this.name + ': resolving provided model');
        }
        return super.getModel(transition);
    }
    /**
      @private
  
      Serializes a route using its custom `serialize` method or
      by a default that looks up the expected property name from
      the dynamic segment.
  
      @param {Object} model the model to be serialized for this route
    */
    serialize(model) {
        let { paramNames, context } = this;
        if (!model) {
            // SAFETY: By the time we serialize, we expect to be resolved.
            // This may not be an entirely safe assumption though no tests fail.
            model = context;
        }
        let object = {};
        if (isParam(model)) {
            object[paramNames[0]] = model;
            return object;
        }
        // Use custom serialize if it exists.
        if (this.serializer) {
            // invoke this.serializer unbound (getSerializer returns a stateless function)
            return this.serializer.call(null, model, paramNames);
        }
        else if (this.route !== undefined) {
            if (this.route.serialize) {
                return this.route.serialize(model, paramNames);
            }
        }
        if (paramNames.length !== 1) {
            return;
        }
        let name = paramNames[0];
        if (/_id$/.test(name)) {
            // SAFETY: Model is supposed to extend IModel already
            object[name] = model.id;
        }
        else {
            object[name] = model;
        }
        return object;
    }
}
function paramsMatch(a, b) {
    if (a === b) {
        // Both are identical, may both be undefined
        return true;
    }
    if (!a || !b) {
        // Only one is undefined, already checked they aren't identical
        return false;
    }
    // Note: this assumes that both params have the same
    // number of keys, but since we're comparing the
    // same routes, they should.
    for (let k in a) {
        if (a.hasOwnProperty(k) && a[k] !== b[k]) {
            return false;
        }
    }
    return true;
}

class TransitionIntent {
    constructor(router, data = {}) {
        this.router = router;
        this.data = data;
    }
}

function handleError(currentState, transition, error) {
    // This is the only possible
    // reject value of TransitionState#resolve
    let routeInfos = currentState.routeInfos;
    let errorHandlerIndex = transition.resolveIndex >= routeInfos.length ? routeInfos.length - 1 : transition.resolveIndex;
    let wasAborted = transition.isAborted;
    throw new TransitionError(error, currentState.routeInfos[errorHandlerIndex].route, wasAborted, currentState);
}
function resolveOneRouteInfo(currentState, transition) {
    if (transition.resolveIndex === currentState.routeInfos.length) {
        // This is is the only possible
        // fulfill value of TransitionState#resolve
        return;
    }
    let routeInfo = currentState.routeInfos[transition.resolveIndex];
    let callback = proceed.bind(null, currentState, transition);
    return routeInfo.resolve(transition).then(callback, null, currentState.promiseLabel('Proceed'));
}
function proceed(currentState, transition, resolvedRouteInfo) {
    let wasAlreadyResolved = currentState.routeInfos[transition.resolveIndex].isResolved;
    // Swap the previously unresolved routeInfo with
    // the resolved routeInfo
    currentState.routeInfos[transition.resolveIndex++] = resolvedRouteInfo;
    if (!wasAlreadyResolved) {
        // Call the redirect hook. The reason we call it here
        // vs. afterModel is so that redirects into child
        // routes don't re-run the model hooks for this
        // already-resolved route.
        let { route } = resolvedRouteInfo;
        if (route !== undefined) {
            if (route.redirect) {
                route.redirect(resolvedRouteInfo.context, transition);
            }
        }
    }
    // Proceed after ensuring that the redirect hook
    // didn't abort this transition by transitioning elsewhere.
    throwIfAborted(transition);
    return resolveOneRouteInfo(currentState, transition);
}
class TransitionState {
    constructor() {
        this.routeInfos = [];
        this.queryParams = {};
        this.params = {};
    }
    promiseLabel(label) {
        let targetName = '';
        forEach(this.routeInfos, function (routeInfo) {
            if (targetName !== '') {
                targetName += '.';
            }
            targetName += routeInfo.name;
            return true;
        });
        return promiseLabel("'" + targetName + "': " + label);
    }
    resolve(transition) {
        // First, calculate params for this state. This is useful
        // information to provide to the various route hooks.
        let params = this.params;
        forEach(this.routeInfos, (routeInfo) => {
            params[routeInfo.name] = routeInfo.params || {};
            return true;
        });
        transition.resolveIndex = 0;
        let callback = resolveOneRouteInfo.bind(null, this, transition);
        let errorHandler = handleError.bind(null, this, transition);
        // The prelude RSVP.resolve() async moves us into the promise land.
        return Promise$1.resolve(null, this.promiseLabel('Start transition'))
            .then(callback, null, this.promiseLabel('Resolve route'))
            .catch(errorHandler, this.promiseLabel('Handle error'))
            .then(() => this);
    }
}
class TransitionError {
    constructor(error, route, wasAborted, state) {
        this.error = error;
        this.route = route;
        this.wasAborted = wasAborted;
        this.state = state;
    }
}

class NamedTransitionIntent extends TransitionIntent {
    constructor(router, name, pivotHandler, contexts = [], queryParams = {}, data) {
        super(router, data);
        this.preTransitionState = undefined;
        this.name = name;
        this.pivotHandler = pivotHandler;
        this.contexts = contexts;
        this.queryParams = queryParams;
    }
    applyToState(oldState, isIntermediate) {
        let handlers = this.router.recognizer.handlersFor(this.name);
        let targetRouteName = handlers[handlers.length - 1].handler;
        return this.applyToHandlers(oldState, handlers, targetRouteName, isIntermediate, false);
    }
    applyToHandlers(oldState, parsedHandlers, targetRouteName, isIntermediate, checkingIfActive) {
        let i, len;
        let newState = new TransitionState();
        let objects = this.contexts.slice(0);
        let invalidateIndex = parsedHandlers.length;
        // Pivot handlers are provided for refresh transitions
        if (this.pivotHandler) {
            for (i = 0, len = parsedHandlers.length; i < len; ++i) {
                if (parsedHandlers[i].handler === this.pivotHandler._internalName) {
                    invalidateIndex = i;
                    break;
                }
            }
        }
        for (i = parsedHandlers.length - 1; i >= 0; --i) {
            let result = parsedHandlers[i];
            let name = result.handler;
            let oldHandlerInfo = oldState.routeInfos[i];
            let newHandlerInfo = null;
            if (result.names.length > 0) {
                if (i >= invalidateIndex) {
                    newHandlerInfo = this.createParamHandlerInfo(name, result.names, objects, oldHandlerInfo);
                }
                else {
                    newHandlerInfo = this.getHandlerInfoForDynamicSegment(name, result.names, objects, oldHandlerInfo, targetRouteName, i);
                }
            }
            else {
                // This route has no dynamic segment.
                // Therefore treat as a param-based handlerInfo
                // with empty params. This will cause the `model`
                // hook to be called with empty params, which is desirable.
                newHandlerInfo = this.createParamHandlerInfo(name, result.names, objects, oldHandlerInfo);
            }
            if (checkingIfActive) {
                // If we're performing an isActive check, we want to
                // serialize URL params with the provided context, but
                // ignore mismatches between old and new context.
                newHandlerInfo = newHandlerInfo.becomeResolved(null, 
                // SAFETY: This seems to imply that it would be resolved, but it's unclear if that's actually the case.
                newHandlerInfo.context);
                let oldContext = oldHandlerInfo && oldHandlerInfo.context;
                if (result.names.length > 0 &&
                    oldHandlerInfo.context !== undefined &&
                    newHandlerInfo.context === oldContext) {
                    // If contexts match in isActive test, assume params also match.
                    // This allows for flexibility in not requiring that every last
                    // handler provide a `serialize` method
                    newHandlerInfo.params = oldHandlerInfo && oldHandlerInfo.params;
                }
                newHandlerInfo.context = oldContext;
            }
            let handlerToUse = oldHandlerInfo;
            if (i >= invalidateIndex || newHandlerInfo.shouldSupersede(oldHandlerInfo)) {
                invalidateIndex = Math.min(i, invalidateIndex);
                handlerToUse = newHandlerInfo;
            }
            if (isIntermediate && !checkingIfActive) {
                handlerToUse = handlerToUse.becomeResolved(null, 
                // SAFETY: This seems to imply that it would be resolved, but it's unclear if that's actually the case.
                handlerToUse.context);
            }
            newState.routeInfos.unshift(handlerToUse);
        }
        if (objects.length > 0) {
            throw new Error('More context objects were passed than there are dynamic segments for the route: ' +
                targetRouteName);
        }
        if (!isIntermediate) {
            this.invalidateChildren(newState.routeInfos, invalidateIndex);
        }
        merge(newState.queryParams, this.queryParams || {});
        if (isIntermediate && oldState.queryParams) {
            merge(newState.queryParams, oldState.queryParams);
        }
        return newState;
    }
    invalidateChildren(handlerInfos, invalidateIndex) {
        for (let i = invalidateIndex, l = handlerInfos.length; i < l; ++i) {
            let handlerInfo = handlerInfos[i];
            if (handlerInfo.isResolved) {
                let { name, params, route, paramNames } = handlerInfos[i];
                handlerInfos[i] = new UnresolvedRouteInfoByParam(this.router, name, paramNames, params, route);
            }
        }
    }
    getHandlerInfoForDynamicSegment(name, names, objects, oldHandlerInfo, _targetRouteName, i) {
        let objectToUse;
        if (objects.length > 0) {
            // Use the objects provided for this transition.
            objectToUse = objects[objects.length - 1];
            if (isParam(objectToUse)) {
                return this.createParamHandlerInfo(name, names, objects, oldHandlerInfo);
            }
            else {
                objects.pop();
            }
        }
        else if (oldHandlerInfo && oldHandlerInfo.name === name) {
            // Reuse the matching oldHandlerInfo
            return oldHandlerInfo;
        }
        else {
            if (this.preTransitionState) {
                let preTransitionHandlerInfo = this.preTransitionState.routeInfos[i];
                objectToUse = preTransitionHandlerInfo === null || preTransitionHandlerInfo === void 0 ? void 0 : preTransitionHandlerInfo.context;
            }
            else {
                // Ideally we should throw this error to provide maximal
                // information to the user that not enough context objects
                // were provided, but this proves too cumbersome in Ember
                // in cases where inner template helpers are evaluated
                // before parent helpers un-render, in which cases this
                // error somewhat prematurely fires.
                //throw new Error("Not enough context objects were provided to complete a transition to " + targetRouteName + ". Specifically, the " + name + " route needs an object that can be serialized into its dynamic URL segments [" + names.join(', ') + "]");
                return oldHandlerInfo;
            }
        }
        return new UnresolvedRouteInfoByObject(this.router, name, names, objectToUse);
    }
    createParamHandlerInfo(name, names, objects, oldHandlerInfo) {
        let params = {};
        // Soak up all the provided string/numbers
        let numNames = names.length;
        let missingParams = [];
        while (numNames--) {
            // Only use old params if the names match with the new handler
            let oldParams = (oldHandlerInfo && name === oldHandlerInfo.name && oldHandlerInfo.params) || {};
            let peek = objects[objects.length - 1];
            let paramName = names[numNames];
            if (isParam(peek)) {
                params[paramName] = '' + objects.pop();
            }
            else {
                // If we're here, this means only some of the params
                // were string/number params, so try and use a param
                // value from a previous handler.
                if (oldParams.hasOwnProperty(paramName)) {
                    params[paramName] = oldParams[paramName];
                }
                else {
                    missingParams.push(paramName);
                }
            }
        }
        if (missingParams.length > 0) {
            throw new Error(`You didn't provide enough string/numeric parameters to satisfy all of the dynamic segments for route ${name}.` +
                ` Missing params: ${missingParams}`);
        }
        return new UnresolvedRouteInfoByParam(this.router, name, names, params);
    }
}

const UnrecognizedURLError = (function () {
    UnrecognizedURLError.prototype = Object.create(Error.prototype);
    UnrecognizedURLError.prototype.constructor = UnrecognizedURLError;
    function UnrecognizedURLError(message) {
        let error = Error.call(this, message);
        this.name = 'UnrecognizedURLError';
        this.message = message || 'UnrecognizedURL';
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, UnrecognizedURLError);
        }
        else {
            this.stack = error.stack;
        }
    }
    return UnrecognizedURLError;
})();

class URLTransitionIntent extends TransitionIntent {
    constructor(router, url, data) {
        super(router, data);
        this.url = url;
        this.preTransitionState = undefined;
    }
    applyToState(oldState) {
        let newState = new TransitionState();
        let results = this.router.recognizer.recognize(this.url), i, len;
        if (!results) {
            throw new UnrecognizedURLError(this.url);
        }
        let statesDiffer = false;
        let _url = this.url;
        // Checks if a handler is accessible by URL. If it is not, an error is thrown.
        // For the case where the handler is loaded asynchronously, the error will be
        // thrown once it is loaded.
        function checkHandlerAccessibility(handler) {
            if (handler && handler.inaccessibleByURL) {
                throw new UnrecognizedURLError(_url);
            }
            return handler;
        }
        for (i = 0, len = results.length; i < len; ++i) {
            let result = results[i];
            let name = result.handler;
            let paramNames = [];
            if (this.router.recognizer.hasRoute(name)) {
                paramNames = this.router.recognizer.handlersFor(name)[i].names;
            }
            let newRouteInfo = new UnresolvedRouteInfoByParam(this.router, name, paramNames, result.params);
            let route = newRouteInfo.route;
            if (route) {
                checkHandlerAccessibility(route);
            }
            else {
                // If the handler is being loaded asynchronously, check if we can
                // access it after it has resolved
                newRouteInfo.routePromise = newRouteInfo.routePromise.then(checkHandlerAccessibility);
            }
            let oldRouteInfo = oldState.routeInfos[i];
            if (statesDiffer || newRouteInfo.shouldSupersede(oldRouteInfo)) {
                statesDiffer = true;
                newState.routeInfos[i] = newRouteInfo;
            }
            else {
                newState.routeInfos[i] = oldRouteInfo;
            }
        }
        merge(newState.queryParams, results.queryParams);
        return newState;
    }
}

class Router {
    constructor(logger) {
        this._lastQueryParams = {};
        this.state = undefined;
        this.oldState = undefined;
        this.activeTransition = undefined;
        this.currentRouteInfos = undefined;
        this._changedQueryParams = undefined;
        this.currentSequence = 0;
        this.log = logger;
        this.recognizer = new RouteRecognizer();
        this.reset();
    }
    /**
      The main entry point into the router. The API is essentially
      the same as the `map` method in `route-recognizer`.
  
      This method extracts the String handler at the last `.to()`
      call and uses it as the name of the whole route.
  
      @param {Function} callback
    */
    map(callback) {
        this.recognizer.map(callback, function (recognizer, routes) {
            for (let i = routes.length - 1, proceed = true; i >= 0 && proceed; --i) {
                let route = routes[i];
                let handler = route.handler;
                recognizer.add(routes, { as: handler });
                proceed = route.path === '/' || route.path === '' || handler.slice(-6) === '.index';
            }
        });
    }
    hasRoute(route) {
        return this.recognizer.hasRoute(route);
    }
    queryParamsTransition(changelist, wasTransitioning, oldState, newState) {
        this.fireQueryParamDidChange(newState, changelist);
        if (!wasTransitioning && this.activeTransition) {
            // One of the routes in queryParamsDidChange
            // caused a transition. Just return that transition.
            return this.activeTransition;
        }
        else {
            // Running queryParamsDidChange didn't change anything.
            // Just update query params and be on our way.
            // We have to return a noop transition that will
            // perform a URL update at the end. This gives
            // the user the ability to set the url update
            // method (default is replaceState).
            let newTransition = new Transition(this, undefined, undefined);
            newTransition.queryParamsOnly = true;
            oldState.queryParams = this.finalizeQueryParamChange(newState.routeInfos, newState.queryParams, newTransition);
            newTransition[QUERY_PARAMS_SYMBOL] = newState.queryParams;
            this.toReadOnlyInfos(newTransition, newState);
            this.routeWillChange(newTransition);
            newTransition.promise = newTransition.promise.then((result) => {
                if (!newTransition.isAborted) {
                    this._updateURL(newTransition, oldState);
                    this.didTransition(this.currentRouteInfos);
                    this.toInfos(newTransition, newState.routeInfos, true);
                    this.routeDidChange(newTransition);
                }
                return result;
            }, null, promiseLabel('Transition complete'));
            return newTransition;
        }
    }
    transitionByIntent(intent, isIntermediate) {
        try {
            return this.getTransitionByIntent(intent, isIntermediate);
        }
        catch (e) {
            return new Transition(this, intent, undefined, e, undefined);
        }
    }
    recognize(url) {
        let intent = new URLTransitionIntent(this, url);
        let newState = this.generateNewState(intent);
        if (newState === null) {
            return newState;
        }
        let readonlyInfos = toReadOnlyRouteInfo(newState.routeInfos, newState.queryParams);
        return readonlyInfos[readonlyInfos.length - 1];
    }
    recognizeAndLoad(url) {
        let intent = new URLTransitionIntent(this, url);
        let newState = this.generateNewState(intent);
        if (newState === null) {
            return Promise$1.reject(`URL ${url} was not recognized`);
        }
        let newTransition = new Transition(this, intent, newState, undefined);
        return newTransition.then(() => {
            let routeInfosWithAttributes = toReadOnlyRouteInfo(newState.routeInfos, newTransition[QUERY_PARAMS_SYMBOL], true);
            return routeInfosWithAttributes[routeInfosWithAttributes.length - 1];
        });
    }
    generateNewState(intent) {
        try {
            return intent.applyToState(this.state, false);
        }
        catch (e) {
            return null;
        }
    }
    getTransitionByIntent(intent, isIntermediate) {
        let wasTransitioning = !!this.activeTransition;
        let oldState = wasTransitioning ? this.activeTransition[STATE_SYMBOL] : this.state;
        let newTransition;
        let newState = intent.applyToState(oldState, isIntermediate);
        let queryParamChangelist = getChangelist(oldState.queryParams, newState.queryParams);
        if (routeInfosEqual(newState.routeInfos, oldState.routeInfos)) {
            // This is a no-op transition. See if query params changed.
            if (queryParamChangelist) {
                let newTransition = this.queryParamsTransition(queryParamChangelist, wasTransitioning, oldState, newState);
                newTransition.queryParamsOnly = true;
                // SAFETY: The returned OpaqueTransition should actually be this.
                return newTransition;
            }
            // No-op. No need to create a new transition.
            return this.activeTransition || new Transition(this, undefined, undefined);
        }
        if (isIntermediate) {
            let transition = new Transition(this, undefined, newState);
            transition.isIntermediate = true;
            this.toReadOnlyInfos(transition, newState);
            this.setupContexts(newState, transition);
            this.routeWillChange(transition);
            return this.activeTransition;
        }
        // Create a new transition to the destination route.
        newTransition = new Transition(this, intent, newState, undefined, this.activeTransition);
        // transition is to same route with same params, only query params differ.
        // not caught above probably because refresh() has been used
        if (routeInfosSameExceptQueryParams(newState.routeInfos, oldState.routeInfos)) {
            newTransition.queryParamsOnly = true;
        }
        this.toReadOnlyInfos(newTransition, newState);
        // Abort and usurp any previously active transition.
        if (this.activeTransition) {
            this.activeTransition.redirect(newTransition);
        }
        this.activeTransition = newTransition;
        // Transition promises by default resolve with resolved state.
        // For our purposes, swap out the promise to resolve
        // after the transition has been finalized.
        newTransition.promise = newTransition.promise.then((result) => {
            return this.finalizeTransition(newTransition, result);
        }, null, promiseLabel('Settle transition promise when transition is finalized'));
        if (!wasTransitioning) {
            this.notifyExistingHandlers(newState, newTransition);
        }
        this.fireQueryParamDidChange(newState, queryParamChangelist);
        return newTransition;
    }
    /**
    @private
  
    Begins and returns a Transition based on the provided
    arguments. Accepts arguments in the form of both URL
    transitions and named transitions.
  
    @param {Router} router
    @param {Array[Object]} args arguments passed to transitionTo,
      replaceWith, or handleURL
  */
    doTransition(name, modelsArray = [], isIntermediate = false) {
        let lastArg = modelsArray[modelsArray.length - 1];
        let queryParams = {};
        if (lastArg && Object.prototype.hasOwnProperty.call(lastArg, 'queryParams')) {
            // We just checked this.
            // TODO: Use an assertion?
            queryParams = modelsArray.pop().queryParams;
        }
        let intent;
        if (name === undefined) {
            log(this, 'Updating query params');
            // A query param update is really just a transition
            // into the route you're already on.
            let { routeInfos } = this.state;
            intent = new NamedTransitionIntent(this, routeInfos[routeInfos.length - 1].name, undefined, [], queryParams);
        }
        else if (name.charAt(0) === '/') {
            log(this, 'Attempting URL transition to ' + name);
            intent = new URLTransitionIntent(this, name);
        }
        else {
            log(this, 'Attempting transition to ' + name);
            intent = new NamedTransitionIntent(this, name, undefined, 
            // SAFETY: We know this to be the case since we removed the last item if it was QPs
            modelsArray, queryParams);
        }
        return this.transitionByIntent(intent, isIntermediate);
    }
    /**
    @private
  
    Updates the URL (if necessary) and calls `setupContexts`
    to update the router's array of `currentRouteInfos`.
   */
    finalizeTransition(transition, newState) {
        try {
            log(transition.router, transition.sequence, 'Resolved all models on destination route; finalizing transition.');
            let routeInfos = newState.routeInfos;
            // Run all the necessary enter/setup/exit hooks
            this.setupContexts(newState, transition);
            // Check if a redirect occurred in enter/setup
            if (transition.isAborted) {
                // TODO: cleaner way? distinguish b/w targetRouteInfos?
                this.state.routeInfos = this.currentRouteInfos;
                return Promise$1.reject(logAbort(transition));
            }
            this._updateURL(transition, newState);
            transition.isActive = false;
            this.activeTransition = undefined;
            this.triggerEvent(this.currentRouteInfos, true, 'didTransition', []);
            this.didTransition(this.currentRouteInfos);
            this.toInfos(transition, newState.routeInfos, true);
            this.routeDidChange(transition);
            log(this, transition.sequence, 'TRANSITION COMPLETE.');
            // Resolve with the final route.
            return routeInfos[routeInfos.length - 1].route;
        }
        catch (e) {
            if (!isTransitionAborted(e)) {
                let infos = transition[STATE_SYMBOL].routeInfos;
                transition.trigger(true, 'error', e, transition, infos[infos.length - 1].route);
                transition.abort();
            }
            throw e;
        }
    }
    /**
    @private
  
    Takes an Array of `RouteInfo`s, figures out which ones are
    exiting, entering, or changing contexts, and calls the
    proper route hooks.
  
    For example, consider the following tree of routes. Each route is
    followed by the URL segment it handles.
  
    ```
    |~index ("/")
    | |~posts ("/posts")
    | | |-showPost ("/:id")
    | | |-newPost ("/new")
    | | |-editPost ("/edit")
    | |~about ("/about/:id")
    ```
  
    Consider the following transitions:
  
    1. A URL transition to `/posts/1`.
       1. Triggers the `*model` callbacks on the
          `index`, `posts`, and `showPost` routes
       2. Triggers the `enter` callback on the same
       3. Triggers the `setup` callback on the same
    2. A direct transition to `newPost`
       1. Triggers the `exit` callback on `showPost`
       2. Triggers the `enter` callback on `newPost`
       3. Triggers the `setup` callback on `newPost`
    3. A direct transition to `about` with a specified
       context object
       1. Triggers the `exit` callback on `newPost`
          and `posts`
       2. Triggers the `serialize` callback on `about`
       3. Triggers the `enter` callback on `about`
       4. Triggers the `setup` callback on `about`
  
    @param {Router} transition
    @param {TransitionState} newState
  */
    setupContexts(newState, transition) {
        let partition = this.partitionRoutes(this.state, newState);
        let i, l, route;
        for (i = 0, l = partition.exited.length; i < l; i++) {
            route = partition.exited[i].route;
            delete route.context;
            if (route !== undefined) {
                if (route._internalReset !== undefined) {
                    route._internalReset(true, transition);
                }
                if (route.exit !== undefined) {
                    route.exit(transition);
                }
            }
        }
        let oldState = (this.oldState = this.state);
        this.state = newState;
        let currentRouteInfos = (this.currentRouteInfos = partition.unchanged.slice());
        try {
            for (i = 0, l = partition.reset.length; i < l; i++) {
                route = partition.reset[i].route;
                if (route !== undefined) {
                    if (route._internalReset !== undefined) {
                        route._internalReset(false, transition);
                    }
                }
            }
            for (i = 0, l = partition.updatedContext.length; i < l; i++) {
                this.routeEnteredOrUpdated(currentRouteInfos, partition.updatedContext[i], false, transition);
            }
            for (i = 0, l = partition.entered.length; i < l; i++) {
                this.routeEnteredOrUpdated(currentRouteInfos, partition.entered[i], true, transition);
            }
        }
        catch (e) {
            this.state = oldState;
            this.currentRouteInfos = oldState.routeInfos;
            throw e;
        }
        this.state.queryParams = this.finalizeQueryParamChange(currentRouteInfos, newState.queryParams, transition);
    }
    /**
    @private
  
    Fires queryParamsDidChange event
  */
    fireQueryParamDidChange(newState, queryParamChangelist) {
        // If queryParams changed trigger event
        if (queryParamChangelist) {
            // This is a little hacky but we need some way of storing
            // changed query params given that no activeTransition
            // is guaranteed to have occurred.
            this._changedQueryParams = queryParamChangelist.all;
            this.triggerEvent(newState.routeInfos, true, 'queryParamsDidChange', [
                queryParamChangelist.changed,
                queryParamChangelist.all,
                queryParamChangelist.removed,
            ]);
            this._changedQueryParams = undefined;
        }
    }
    /**
    @private
  
    Helper method used by setupContexts. Handles errors or redirects
    that may happen in enter/setup.
  */
    routeEnteredOrUpdated(currentRouteInfos, routeInfo, enter, transition) {
        let route = routeInfo.route, context = routeInfo.context;
        function _routeEnteredOrUpdated(route) {
            if (enter) {
                if (route.enter !== undefined) {
                    route.enter(transition);
                }
            }
            throwIfAborted(transition);
            route.context = context;
            if (route.contextDidChange !== undefined) {
                route.contextDidChange();
            }
            if (route.setup !== undefined) {
                route.setup(context, transition);
            }
            throwIfAborted(transition);
            currentRouteInfos.push(routeInfo);
            return route;
        }
        // If the route doesn't exist, it means we haven't resolved the route promise yet
        if (route === undefined) {
            routeInfo.routePromise = routeInfo.routePromise.then(_routeEnteredOrUpdated);
        }
        else {
            _routeEnteredOrUpdated(route);
        }
        return true;
    }
    /**
    @private
  
    This function is called when transitioning from one URL to
    another to determine which routes are no longer active,
    which routes are newly active, and which routes remain
    active but have their context changed.
  
    Take a list of old routes and new routes and partition
    them into four buckets:
  
    * unchanged: the route was active in both the old and
      new URL, and its context remains the same
    * updated context: the route was active in both the
      old and new URL, but its context changed. The route's
      `setup` method, if any, will be called with the new
      context.
    * exited: the route was active in the old URL, but is
      no longer active.
    * entered: the route was not active in the old URL, but
      is now active.
  
    The PartitionedRoutes structure has four fields:
  
    * `updatedContext`: a list of `RouteInfo` objects that
      represent routes that remain active but have a changed
      context
    * `entered`: a list of `RouteInfo` objects that represent
      routes that are newly active
    * `exited`: a list of `RouteInfo` objects that are no
      longer active.
    * `unchanged`: a list of `RouteInfo` objects that remain active.
  
    @param {Array[InternalRouteInfo]} oldRoutes a list of the route
      information for the previous URL (or `[]` if this is the
      first handled transition)
    @param {Array[InternalRouteInfo]} newRoutes a list of the route
      information for the new URL
  
    @return {Partition}
  */
    partitionRoutes(oldState, newState) {
        let oldRouteInfos = oldState.routeInfos;
        let newRouteInfos = newState.routeInfos;
        let routes = {
            updatedContext: [],
            exited: [],
            entered: [],
            unchanged: [],
            reset: [],
        };
        let routeChanged, contextChanged = false, i, l;
        for (i = 0, l = newRouteInfos.length; i < l; i++) {
            let oldRouteInfo = oldRouteInfos[i], newRouteInfo = newRouteInfos[i];
            if (!oldRouteInfo || oldRouteInfo.route !== newRouteInfo.route) {
                routeChanged = true;
            }
            if (routeChanged) {
                routes.entered.push(newRouteInfo);
                if (oldRouteInfo) {
                    routes.exited.unshift(oldRouteInfo);
                }
            }
            else if (contextChanged || oldRouteInfo.context !== newRouteInfo.context) {
                contextChanged = true;
                routes.updatedContext.push(newRouteInfo);
            }
            else {
                routes.unchanged.push(oldRouteInfo);
            }
        }
        for (i = newRouteInfos.length, l = oldRouteInfos.length; i < l; i++) {
            routes.exited.unshift(oldRouteInfos[i]);
        }
        routes.reset = routes.updatedContext.slice();
        routes.reset.reverse();
        return routes;
    }
    _updateURL(transition, state) {
        let urlMethod = transition.urlMethod;
        if (!urlMethod) {
            return;
        }
        let { routeInfos } = state;
        let { name: routeName } = routeInfos[routeInfos.length - 1];
        let params = {};
        for (let i = routeInfos.length - 1; i >= 0; --i) {
            let routeInfo = routeInfos[i];
            merge(params, routeInfo.params);
            if (routeInfo.route.inaccessibleByURL) {
                urlMethod = null;
            }
        }
        if (urlMethod) {
            params.queryParams = transition._visibleQueryParams || state.queryParams;
            let url = this.recognizer.generate(routeName, params);
            // transitions during the initial transition must always use replaceURL.
            // When the app boots, you are at a url, e.g. /foo. If some route
            // redirects to bar as part of the initial transition, you don't want to
            // add a history entry for /foo. If you do, pressing back will immediately
            // hit the redirect again and take you back to /bar, thus killing the back
            // button
            let initial = transition.isCausedByInitialTransition;
            // say you are at / and you click a link to route /foo. In /foo's
            // route, the transition is aborted using replaceWith('/bar').
            // Because the current url is still /, the history entry for / is
            // removed from the history. Clicking back will take you to the page
            // you were on before /, which is often not even the app, thus killing
            // the back button. That's why updateURL is always correct for an
            // aborting transition that's not the initial transition
            let replaceAndNotAborting = urlMethod === 'replace' && !transition.isCausedByAbortingTransition;
            // because calling refresh causes an aborted transition, this needs to be
            // special cased - if the initial transition is a replace transition, the
            // urlMethod should be honored here.
            let isQueryParamsRefreshTransition = transition.queryParamsOnly && urlMethod === 'replace';
            // say you are at / and you a `replaceWith(/foo)` is called. Then, that
            // transition is aborted with `replaceWith(/bar)`. At the end, we should
            // end up with /bar replacing /. We are replacing the replace. We only
            // will replace the initial route if all subsequent aborts are also
            // replaces. However, there is some ambiguity around the correct behavior
            // here.
            let replacingReplace = urlMethod === 'replace' && transition.isCausedByAbortingReplaceTransition;
            if (initial || replaceAndNotAborting || isQueryParamsRefreshTransition || replacingReplace) {
                this.replaceURL(url);
            }
            else {
                this.updateURL(url);
            }
        }
    }
    finalizeQueryParamChange(resolvedHandlers, newQueryParams, transition) {
        // We fire a finalizeQueryParamChange event which
        // gives the new route hierarchy a chance to tell
        // us which query params it's consuming and what
        // their final values are. If a query param is
        // no longer consumed in the final route hierarchy,
        // its serialized segment will be removed
        // from the URL.
        for (let k in newQueryParams) {
            if (newQueryParams.hasOwnProperty(k) && newQueryParams[k] === null) {
                delete newQueryParams[k];
            }
        }
        let finalQueryParamsArray = [];
        this.triggerEvent(resolvedHandlers, true, 'finalizeQueryParamChange', [
            newQueryParams,
            finalQueryParamsArray,
            transition,
        ]);
        if (transition) {
            transition._visibleQueryParams = {};
        }
        let finalQueryParams = {};
        for (let i = 0, len = finalQueryParamsArray.length; i < len; ++i) {
            let qp = finalQueryParamsArray[i];
            finalQueryParams[qp.key] = qp.value;
            if (transition && qp.visible !== false) {
                transition._visibleQueryParams[qp.key] = qp.value;
            }
        }
        return finalQueryParams;
    }
    toReadOnlyInfos(newTransition, newState) {
        let oldRouteInfos = this.state.routeInfos;
        this.fromInfos(newTransition, oldRouteInfos);
        this.toInfos(newTransition, newState.routeInfos);
        this._lastQueryParams = newState.queryParams;
    }
    fromInfos(newTransition, oldRouteInfos) {
        if (newTransition !== undefined && oldRouteInfos.length > 0) {
            let fromInfos = toReadOnlyRouteInfo(oldRouteInfos, Object.assign({}, this._lastQueryParams), true);
            newTransition.from = fromInfos[fromInfos.length - 1] || null;
        }
    }
    toInfos(newTransition, newRouteInfos, includeAttributes = false) {
        if (newTransition !== undefined && newRouteInfos.length > 0) {
            let toInfos = toReadOnlyRouteInfo(newRouteInfos, Object.assign({}, newTransition[QUERY_PARAMS_SYMBOL]), includeAttributes);
            newTransition.to = toInfos[toInfos.length - 1] || null;
        }
    }
    notifyExistingHandlers(newState, newTransition) {
        let oldRouteInfos = this.state.routeInfos, i, oldRouteInfoLen, oldHandler, newRouteInfo;
        oldRouteInfoLen = oldRouteInfos.length;
        for (i = 0; i < oldRouteInfoLen; i++) {
            oldHandler = oldRouteInfos[i];
            newRouteInfo = newState.routeInfos[i];
            if (!newRouteInfo || oldHandler.name !== newRouteInfo.name) {
                break;
            }
            if (!newRouteInfo.isResolved) ;
        }
        this.triggerEvent(oldRouteInfos, true, 'willTransition', [newTransition]);
        this.routeWillChange(newTransition);
        this.willTransition(oldRouteInfos, newState.routeInfos, newTransition);
    }
    /**
      Clears the current and target route routes and triggers exit
      on each of them starting at the leaf and traversing up through
      its ancestors.
    */
    reset() {
        if (this.state) {
            forEach(this.state.routeInfos.slice().reverse(), function (routeInfo) {
                let route = routeInfo.route;
                if (route !== undefined) {
                    if (route.exit !== undefined) {
                        route.exit();
                    }
                }
                return true;
            });
        }
        this.oldState = undefined;
        this.state = new TransitionState();
        this.currentRouteInfos = undefined;
    }
    /**
      let handler = routeInfo.handler;
      The entry point for handling a change to the URL (usually
      via the back and forward button).
  
      Returns an Array of handlers and the parameters associated
      with those parameters.
  
      @param {String} url a URL to process
  
      @return {Array} an Array of `[handler, parameter]` tuples
    */
    handleURL(url) {
        // Perform a URL-based transition, but don't change
        // the URL afterward, since it already happened.
        if (url.charAt(0) !== '/') {
            url = '/' + url;
        }
        return this.doTransition(url).method(null);
    }
    /**
      Transition into the specified named route.
  
      If necessary, trigger the exit callback on any routes
      that are no longer represented by the target route.
  
      @param {String} name the name of the route
    */
    transitionTo(name, ...contexts) {
        if (typeof name === 'object') {
            contexts.push(name);
            return this.doTransition(undefined, contexts, false);
        }
        return this.doTransition(name, contexts);
    }
    intermediateTransitionTo(name, ...args) {
        return this.doTransition(name, args, true);
    }
    refresh(pivotRoute) {
        let previousTransition = this.activeTransition;
        let state = previousTransition ? previousTransition[STATE_SYMBOL] : this.state;
        let routeInfos = state.routeInfos;
        if (pivotRoute === undefined) {
            pivotRoute = routeInfos[0].route;
        }
        log(this, 'Starting a refresh transition');
        let name = routeInfos[routeInfos.length - 1].name;
        let intent = new NamedTransitionIntent(this, name, pivotRoute, [], this._changedQueryParams || state.queryParams);
        let newTransition = this.transitionByIntent(intent, false);
        // if the previous transition is a replace transition, that needs to be preserved
        if (previousTransition && previousTransition.urlMethod === 'replace') {
            newTransition.method(previousTransition.urlMethod);
        }
        return newTransition;
    }
    /**
      Identical to `transitionTo` except that the current URL will be replaced
      if possible.
  
      This method is intended primarily for use with `replaceState`.
  
      @param {String} name the name of the route
    */
    replaceWith(name) {
        return this.doTransition(name).method('replace');
    }
    /**
      Take a named route and context objects and generate a
      URL.
  
      @param {String} name the name of the route to generate
        a URL for
      @param {...Object} objects a list of objects to serialize
  
      @return {String} a URL
    */
    generate(routeName, ...args) {
        let partitionedArgs = extractQueryParams(args), suppliedParams = partitionedArgs[0], queryParams = partitionedArgs[1];
        // Construct a TransitionIntent with the provided params
        // and apply it to the present state of the router.
        let intent = new NamedTransitionIntent(this, routeName, undefined, suppliedParams);
        let state = intent.applyToState(this.state, false);
        let params = {};
        for (let i = 0, len = state.routeInfos.length; i < len; ++i) {
            let routeInfo = state.routeInfos[i];
            let routeParams = routeInfo.serialize();
            merge(params, routeParams);
        }
        params.queryParams = queryParams;
        return this.recognizer.generate(routeName, params);
    }
    applyIntent(routeName, contexts) {
        let intent = new NamedTransitionIntent(this, routeName, undefined, contexts);
        let state = (this.activeTransition && this.activeTransition[STATE_SYMBOL]) || this.state;
        return intent.applyToState(state, false);
    }
    isActiveIntent(routeName, contexts, queryParams, _state) {
        let state = _state || this.state, targetRouteInfos = state.routeInfos, routeInfo, len;
        if (!targetRouteInfos.length) {
            return false;
        }
        let targetHandler = targetRouteInfos[targetRouteInfos.length - 1].name;
        let recognizerHandlers = this.recognizer.handlersFor(targetHandler);
        let index = 0;
        for (len = recognizerHandlers.length; index < len; ++index) {
            routeInfo = targetRouteInfos[index];
            if (routeInfo.name === routeName) {
                break;
            }
        }
        if (index === recognizerHandlers.length) {
            // The provided route name isn't even in the route hierarchy.
            return false;
        }
        let testState = new TransitionState();
        testState.routeInfos = targetRouteInfos.slice(0, index + 1);
        recognizerHandlers = recognizerHandlers.slice(0, index + 1);
        let intent = new NamedTransitionIntent(this, targetHandler, undefined, contexts);
        let newState = intent.applyToHandlers(testState, recognizerHandlers, targetHandler, true, true);
        let routesEqual = routeInfosEqual(newState.routeInfos, testState.routeInfos);
        if (!queryParams || !routesEqual) {
            return routesEqual;
        }
        // Get a hash of QPs that will still be active on new route
        let activeQPsOnNewHandler = {};
        merge(activeQPsOnNewHandler, queryParams);
        let activeQueryParams = state.queryParams;
        for (let key in activeQueryParams) {
            if (activeQueryParams.hasOwnProperty(key) && activeQPsOnNewHandler.hasOwnProperty(key)) {
                activeQPsOnNewHandler[key] = activeQueryParams[key];
            }
        }
        return routesEqual && !getChangelist(activeQPsOnNewHandler, queryParams);
    }
    isActive(routeName, ...args) {
        let [contexts, queryParams] = extractQueryParams(args);
        return this.isActiveIntent(routeName, contexts, queryParams);
    }
    trigger(name, ...args) {
        this.triggerEvent(this.currentRouteInfos, false, name, args);
    }
}
function routeInfosEqual(routeInfos, otherRouteInfos) {
    if (routeInfos.length !== otherRouteInfos.length) {
        return false;
    }
    for (let i = 0, len = routeInfos.length; i < len; ++i) {
        // SAFETY: Just casting for comparison
        if (routeInfos[i] !== otherRouteInfos[i]) {
            return false;
        }
    }
    return true;
}
function routeInfosSameExceptQueryParams(routeInfos, otherRouteInfos) {
    if (routeInfos.length !== otherRouteInfos.length) {
        return false;
    }
    for (let i = 0, len = routeInfos.length; i < len; ++i) {
        if (routeInfos[i].name !== otherRouteInfos[i].name) {
            return false;
        }
        if (!paramsEqual(routeInfos[i].params, otherRouteInfos[i].params)) {
            return false;
        }
    }
    return true;
}
function paramsEqual(params, otherParams) {
    if (params === otherParams) {
        // Both identical or both undefined
        return true;
    }
    if (!params || !otherParams) {
        // One is falsy but other is not
        return false;
    }
    let keys = Object.keys(params);
    let otherKeys = Object.keys(otherParams);
    if (keys.length !== otherKeys.length) {
        return false;
    }
    for (let i = 0, len = keys.length; i < len; ++i) {
        let key = keys[i];
        if (params[key] !== otherParams[key]) {
            return false;
        }
    }
    return true;
}

export { InternalRouteInfo, Transition as InternalTransition, PARAMS_SYMBOL, QUERY_PARAMS_SYMBOL, STATE_SYMBOL, TransitionError, TransitionState, Router as default, logAbort };
