define("router/handler-info", 
  ["./utils","rsvp/promise","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var bind = __dependency1__.bind;
    var merge = __dependency1__.merge;
    var oCreate = __dependency1__.oCreate;
    var serialize = __dependency1__.serialize;
    var promiseLabel = __dependency1__.promiseLabel;
    var Promise = __dependency2__["default"];

    function HandlerInfo(props) {
      if (props) {
        merge(this, props);
      }
    }

    HandlerInfo.prototype = {
      name: null,
      handler: null,
      params: null,
      context: null,

      log: function(payload, message) {
        if (payload.log) {
          payload.log(this.name + ': ' + message);
        }
      },

      promiseLabel: function(label) {
        return promiseLabel("'" + this.name + "' " + label);
      },

      getUnresolved: function() {
        return this;
      },

      resolve: function(async, shouldContinue, payload) {
        var checkForAbort  = bind(this.checkForAbort,      this, shouldContinue),
            beforeModel    = bind(this.runBeforeModelHook, this, async, payload),
            model          = bind(this.getModel,           this, async, payload),
            afterModel     = bind(this.runAfterModelHook,  this, async, payload),
            becomeResolved = bind(this.becomeResolved,     this, payload);

        return Promise.resolve(undefined, this.promiseLabel("Start handler"))
               .then(checkForAbort, null, this.promiseLabel("Check for abort"))
               .then(beforeModel, null, this.promiseLabel("Before model"))
               .then(checkForAbort, null, this.promiseLabel("Check if aborted during 'beforeModel' hook"))
               .then(model, null, this.promiseLabel("Model"))
               .then(checkForAbort, null, this.promiseLabel("Check if aborted in 'model' hook"))
               .then(afterModel, null, this.promiseLabel("After model"))
               .then(checkForAbort, null, this.promiseLabel("Check if aborted in 'afterModel' hook"))
               .then(becomeResolved, null, this.promiseLabel("Become resolved"));
      },

      runBeforeModelHook: function(async, payload) {
        if (payload.trigger) {
          payload.trigger(true, 'willResolveModel', payload, this.handler);
        }
        return this.runSharedModelHook(async, payload, 'beforeModel', []);
      },

      runAfterModelHook: function(async, payload, resolvedModel) {
        // Stash the resolved model on the payload.
        // This makes it possible for users to swap out
        // the resolved model in afterModel.
        var name = this.name;
        this.stashResolvedModel(payload, resolvedModel);

        return this.runSharedModelHook(async, payload, 'afterModel', [resolvedModel])
                   .then(function() {
                     // Ignore the fulfilled value returned from afterModel.
                     // Return the value stashed in resolvedModels, which
                     // might have been swapped out in afterModel.
                     return payload.resolvedModels[name];
                   }, null, this.promiseLabel("Ignore fulfillment value and return model value"));
      },

      runSharedModelHook: function(async, payload, hookName, args) {
        this.log(payload, "calling " + hookName + " hook");

        if (this.queryParams) {
          args.push(this.queryParams);
        }
        args.push(payload);

        var handler = this.handler;
        return async(function() {
          return handler[hookName] && handler[hookName].apply(handler, args);
        }, this.promiseLabel("Handle " + hookName));
      },

      getModel: function(payload) {
        throw new Error("This should be overridden by a subclass of HandlerInfo");
      },

      checkForAbort: function(shouldContinue, promiseValue) {
        return Promise.resolve(shouldContinue(), this.promiseLabel("Check for abort")).then(function() {
          // We don't care about shouldContinue's resolve value;
          // pass along the original value passed to this fn.
          return promiseValue;
        }, null, this.promiseLabel("Ignore fulfillment value and continue"));
      },

      stashResolvedModel: function(payload, resolvedModel) {
        payload.resolvedModels = payload.resolvedModels || {};
        payload.resolvedModels[this.name] = resolvedModel;
      },

      becomeResolved: function(payload, resolvedContext) {
        var params = this.params || serialize(this.handler, resolvedContext, this.names);

        if (payload) {
          this.stashResolvedModel(payload, resolvedContext);
          payload.params = payload.params || {};
          payload.params[this.name] = params;
        }

        return new ResolvedHandlerInfo({
          context: resolvedContext,
          name: this.name,
          handler: this.handler,
          params: params
        });
      },

      shouldSupercede: function(other) {
        // Prefer this newer handlerInfo over `other` if:
        // 1) The other one doesn't exist
        // 2) The names don't match
        // 3) This handler has a context that doesn't match
        //    the other one (or the other one doesn't have one).
        // 4) This handler has parameters that don't match the other.
        if (!other) { return true; }

        var contextsMatch = (other.context === this.context);
        return other.name !== this.name ||
               (this.hasOwnProperty('context') && !contextsMatch) ||
               (this.hasOwnProperty('params') && !paramsMatch(this.params, other.params));
      }
    };

    function ResolvedHandlerInfo(props) {
      HandlerInfo.call(this, props);
    }

    ResolvedHandlerInfo.prototype = oCreate(HandlerInfo.prototype);
    ResolvedHandlerInfo.prototype.resolve = function(async, shouldContinue, payload) {
      // A ResolvedHandlerInfo just resolved with itself.
      if (payload && payload.resolvedModels) {
        payload.resolvedModels[this.name] = this.context;
      }
      return Promise.resolve(this, this.promiseLabel("Resolve"));
    };

    ResolvedHandlerInfo.prototype.getUnresolved = function() {
      return new UnresolvedHandlerInfoByParam({
        name: this.name,
        handler: this.handler,
        params: this.params
      });
    };

    // These are generated by URL transitions and
    // named transitions for non-dynamic route segments.
    function UnresolvedHandlerInfoByParam(props) {
      HandlerInfo.call(this, props);
      this.params = this.params || {};
    }

    UnresolvedHandlerInfoByParam.prototype = oCreate(HandlerInfo.prototype);
    UnresolvedHandlerInfoByParam.prototype.getModel = function(async, payload) {
      var fullParams = this.params;
      if (payload && payload.queryParams) {
        fullParams = {};
        merge(fullParams, this.params);
        fullParams.queryParams = payload.queryParams;
      }

      var hookName = typeof this.handler.deserialize === 'function' ?
                     'deserialize' : 'model';

      return this.runSharedModelHook(async, payload, hookName, [fullParams]);
    };


    // These are generated only for named transitions
    // with dynamic route segments.
    function UnresolvedHandlerInfoByObject(props) {
      HandlerInfo.call(this, props);
    }

    UnresolvedHandlerInfoByObject.prototype = oCreate(HandlerInfo.prototype);
    UnresolvedHandlerInfoByObject.prototype.getModel = function(async, payload) {
      this.log(payload, this.name + ": resolving provided model");
      return Promise.resolve(this.context);
    };

    function paramsMatch(a, b) {
      if ((!a) ^ (!b)) {
        // Only one is null.
        return false;
      }

      if (!a) {
        // Both must be null.
        return true;
      }

      // Note: this assumes that both params have the same
      // number of keys, but since we're comparing the
      // same handlers, they should.
      for (var k in a) {
        if (a.hasOwnProperty(k) && a[k] !== b[k]) {
          return false;
        }
      }
      return true;
    }

    __exports__.HandlerInfo = HandlerInfo;
    __exports__.ResolvedHandlerInfo = ResolvedHandlerInfo;
    __exports__.UnresolvedHandlerInfoByParam = UnresolvedHandlerInfoByParam;
    __exports__.UnresolvedHandlerInfoByObject = UnresolvedHandlerInfoByObject;
  });
define("router/router", 
  ["route-recognizer","rsvp/promise","./utils","./transition-state","./transition","./transition-intent/named-transition-intent","./transition-intent/url-transition-intent","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    var RouteRecognizer = __dependency1__["default"];
    var Promise = __dependency2__["default"];
    var trigger = __dependency3__.trigger;
    var log = __dependency3__.log;
    var slice = __dependency3__.slice;
    var forEach = __dependency3__.forEach;
    var merge = __dependency3__.merge;
    var serialize = __dependency3__.serialize;
    var extractQueryParams = __dependency3__.extractQueryParams;
    var getChangelist = __dependency3__.getChangelist;
    var promiseLabel = __dependency3__.promiseLabel;
    var TransitionState = __dependency4__["default"];
    var logAbort = __dependency5__.logAbort;
    var Transition = __dependency5__.Transition;
    var TransitionAborted = __dependency5__.TransitionAborted;
    var NamedTransitionIntent = __dependency6__["default"];
    var URLTransitionIntent = __dependency7__["default"];

    var pop = Array.prototype.pop;

    function Router() {
      this.recognizer = new RouteRecognizer();
      this.reset();
    }

    Router.prototype = {

      /**
        The main entry point into the router. The API is essentially
        the same as the `map` method in `route-recognizer`.

        This method extracts the String handler at the last `.to()`
        call and uses it as the name of the whole route.

        @param {Function} callback
      */
      map: function(callback) {
        this.recognizer.delegate = this.delegate;

        this.recognizer.map(callback, function(recognizer, routes) {
          for (var i = routes.length - 1, proceed = true; i >= 0 && proceed; --i) {
            var route = routes[i];
            recognizer.add(routes, { as: route.handler });
            proceed = route.path === '/' || route.path === '' || route.handler.slice(-6) === '.index';
          }
        });
      },

      hasRoute: function(route) {
        return this.recognizer.hasRoute(route);
      },

      // NOTE: this doesn't really belong here, but here
      // it shall remain until our ES6 transpiler can
      // handle cyclical deps.
      transitionByIntent: function(intent, isIntermediate) {

        var wasTransitioning = !!this.activeTransition;
        var oldState = wasTransitioning ? this.activeTransition.state : this.state;
        var newTransition;
        var router = this;

        try {
          var newState = intent.applyToState(oldState, this.recognizer, this.getHandler, isIntermediate);
          var queryParamChangelist = getChangelist(oldState.queryParams, newState.queryParams);

          if (handlerInfosEqual(newState.handlerInfos, oldState.handlerInfos)) {

            // This is a no-op transition. See if query params changed.
            if (queryParamChangelist) {

              fireQueryParamDidChange(this, newState, queryParamChangelist);

              if (!wasTransitioning && this.activeTransition) {
                // One of the handlers in queryParamsDidChange
                // caused a transition. Just return that transition.
                return this.activeTransition;
              } else {
                // Running queryParamsDidChange didn't change anything.
                // Just update query params and be on our way.

                // We have to return a noop transition that will
                // perform a URL update at the end. This gives
                // the user the ability to set the url update
                // method (default is replaceState).
                newTransition = new Transition(this);

                oldState.queryParams = finalizeQueryParamChange(this, newState.handlerInfos, newState.queryParams, newTransition);

                newTransition.promise = newTransition.promise.then(function(result) {
                  updateURL(newTransition, oldState, true);
                  if (router.didTransition) {
                    router.didTransition(router.currentHandlerInfos);
                  }
                  return result;
                }, null, promiseLabel("Transition complete"));
                return newTransition;
              }
            }

            // No-op. No need to create a new transition.
            return new Transition(this);
          }

          if (isIntermediate) {
            setupContexts(this, newState);
            return;
          }

          // Create a new transition to the destination route.
          newTransition = new Transition(this, intent, newState);

          // Abort and usurp any previously active transition.
          if (this.activeTransition) {
            this.activeTransition.abort();
          }
          this.activeTransition = newTransition;

          // Transition promises by default resolve with resolved state.
          // For our purposes, swap out the promise to resolve
          // after the transition has been finalized.
          newTransition.promise = newTransition.promise.then(function(result) {
            return router.async(function() {
              return finalizeTransition(newTransition, result.state);
            }, "Finalize transition");
          }, null, promiseLabel("Settle transition promise when transition is finalized"));

          if (!wasTransitioning) {
            trigger(this, this.state.handlerInfos, true, ['willTransition', newTransition]);
          }

          // If fireQueryParamsDidChange
          fireQueryParamDidChange(this, newState, queryParamChangelist);

          return newTransition;
        } catch(e) {
          return new Transition(this, intent, null, e);
        }
      },

      /**
        Clears the current and target route handlers and triggers exit
        on each of them starting at the leaf and traversing up through
        its ancestors.
      */
      reset: function() {
        if (this.state) {
          forEach(this.state.handlerInfos, function(handlerInfo) {
            var handler = handlerInfo.handler;
            if (handler.exit) {
              handler.exit();
            }
          });
        }

        this.state = new TransitionState();
        this.currentHandlerInfos = null;
      },

      activeTransition: null,

      /**
        var handler = handlerInfo.handler;
        The entry point for handling a change to the URL (usually
        via the back and forward button).

        Returns an Array of handlers and the parameters associated
        with those parameters.

        @param {String} url a URL to process

        @return {Array} an Array of `[handler, parameter]` tuples
      */
      handleURL: function(url) {
        // Perform a URL-based transition, but don't change
        // the URL afterward, since it already happened.
        var args = slice.call(arguments);
        if (url.charAt(0) !== '/') { args[0] = '/' + url; }

        return doTransition(this, args).method(null);
      },

      /**
        Hook point for updating the URL.

        @param {String} url a URL to update to
      */
      updateURL: function() {
        throw new Error("updateURL is not implemented");
      },

      /**
        Hook point for replacing the current URL, i.e. with replaceState

        By default this behaves the same as `updateURL`

        @param {String} url a URL to update to
      */
      replaceURL: function(url) {
        this.updateURL(url);
      },

      /**
        Transition into the specified named route.

        If necessary, trigger the exit callback on any handlers
        that are no longer represented by the target route.

        @param {String} name the name of the route
      */
      transitionTo: function(name) {
        return doTransition(this, arguments);
      },

      intermediateTransitionTo: function(name) {
        doTransition(this, arguments, true);
      },

      refresh: function(pivotHandler) {


        var state = this.activeTransition ? this.activeTransition.state : this.state;
        var handlerInfos = state.handlerInfos;
        var params = {};
        for (var i = 0, len = handlerInfos.length; i < len; ++i) {
          var handlerInfo = handlerInfos[i];
          params[handlerInfo.name] = handlerInfo.params || {};
        }

        log(this, "Starting a refresh transition");
        var intent = new NamedTransitionIntent({
          name: handlerInfos[handlerInfos.length - 1].name,
          pivotHandler: pivotHandler || handlerInfos[0].handler,
          contexts: [], // TODO collect contexts...?
          queryParams: this._changedQueryParams || state.queryParams || {}
        });

        return this.transitionByIntent(intent, false);
      },

      /**
        Identical to `transitionTo` except that the current URL will be replaced
        if possible.

        This method is intended primarily for use with `replaceState`.

        @param {String} name the name of the route
      */
      replaceWith: function(name) {
        return doTransition(this, arguments).method('replace');
      },

      /**
        Take a named route and context objects and generate a
        URL.

        @param {String} name the name of the route to generate
          a URL for
        @param {...Object} objects a list of objects to serialize

        @return {String} a URL
      */
      generate: function(handlerName) {

        var partitionedArgs = extractQueryParams(slice.call(arguments, 1)),
          suppliedParams = partitionedArgs[0],
          queryParams = partitionedArgs[1];

        // Construct a TransitionIntent with the provided params
        // and apply it to the present state of the router.
        var intent = new NamedTransitionIntent({ name: handlerName, contexts: suppliedParams });
        var state = intent.applyToState(this.state, this.recognizer, this.getHandler);
        var params = {};

        for (var i = 0, len = state.handlerInfos.length; i < len; ++i) {
          var handlerInfo = state.handlerInfos[i];
          var handlerParams = handlerInfo.params ||
                              serialize(handlerInfo.handler, handlerInfo.context, handlerInfo.names);
          merge(params, handlerParams);
        }
        params.queryParams = queryParams;

        return this.recognizer.generate(handlerName, params);
      },

      isActive: function(handlerName) {

        var partitionedArgs   = extractQueryParams(slice.call(arguments, 1)),
            contexts          = partitionedArgs[0],
            queryParams       = partitionedArgs[1],
            activeQueryParams  = this.state.queryParams;

        var targetHandlerInfos = this.state.handlerInfos,
            found = false, names, object, handlerInfo, handlerObj, i, len;

        if (!targetHandlerInfos.length) { return false; }

        var targetHandler = targetHandlerInfos[targetHandlerInfos.length - 1].name;
        var recogHandlers = this.recognizer.handlersFor(targetHandler);

        var index = 0;
        for (len = recogHandlers.length; index < len; ++index) {
          handlerInfo = targetHandlerInfos[index];
          if (handlerInfo.name === handlerName) { break; }
        }

        if (index === recogHandlers.length) {
          // The provided route name isn't even in the route hierarchy.
          return false;
        }

        var state = new TransitionState();
        state.handlerInfos = targetHandlerInfos.slice(0, index + 1);
        recogHandlers = recogHandlers.slice(0, index + 1);

        var intent = new NamedTransitionIntent({
          name: targetHandler,
          contexts: contexts
        });

        var newState = intent.applyToHandlers(state, recogHandlers, this.getHandler, targetHandler, true, true);

        // Get a hash of QPs that will still be active on new route
        var activeQPsOnNewHandler = {};
        merge(activeQPsOnNewHandler, queryParams);
        for (var key in activeQueryParams) {
          if (activeQueryParams.hasOwnProperty(key) &&
              activeQPsOnNewHandler.hasOwnProperty(key)) {
            activeQPsOnNewHandler[key] = activeQueryParams[key];
          }
        }

        return handlerInfosEqual(newState.handlerInfos, state.handlerInfos) &&
               !getChangelist(activeQPsOnNewHandler, queryParams);
      },

      trigger: function(name) {
        var args = slice.call(arguments);
        trigger(this, this.currentHandlerInfos, false, args);
      },

      /**
        @private

        Pluggable hook for possibly running route hooks
        in a try-catch escaping manner.

        @param {Function} callback the callback that will
                          be asynchronously called

        @return {Promise} a promise that fulfills with the
                          value returned from the callback
       */
      async: function(callback, label) {
        return new Promise(function(resolve) {
          resolve(callback());
        }, label);
      },

      /**
        Hook point for logging transition status updates.

        @param {String} message The message to log.
      */
      log: null
    };

    /**
      @private

      Fires queryParamsDidChange event
    */
    function fireQueryParamDidChange(router, newState, queryParamChangelist) {
      // If queryParams changed trigger event
      if (queryParamChangelist) {

        // This is a little hacky but we need some way of storing
        // changed query params given that no activeTransition
        // is guaranteed to have occurred.
        router._changedQueryParams = queryParamChangelist.changed;
        for (var i in queryParamChangelist.removed) {
          if (queryParamChangelist.removed.hasOwnProperty(i)) {
            router._changedQueryParams[i] = null;
          }
        }
        trigger(router, newState.handlerInfos, true, ['queryParamsDidChange', queryParamChangelist.changed, queryParamChangelist.all, queryParamChangelist.removed]);
        router._changedQueryParams = null;
      }
    }

    /**
      @private

      Takes an Array of `HandlerInfo`s, figures out which ones are
      exiting, entering, or changing contexts, and calls the
      proper handler hooks.

      For example, consider the following tree of handlers. Each handler is
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
            `index`, `posts`, and `showPost` handlers
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
    function setupContexts(router, newState, transition) {
      var partition = partitionHandlers(router.state, newState);

      forEach(partition.exited, function(handlerInfo) {
        var handler = handlerInfo.handler;
        delete handler.context;
        if (handler.exit) { handler.exit(); }
      });

      var oldState = router.oldState = router.state;
      router.state = newState;
      var currentHandlerInfos = router.currentHandlerInfos = partition.unchanged.slice();

      try {
        forEach(partition.updatedContext, function(handlerInfo) {
          return handlerEnteredOrUpdated(currentHandlerInfos, handlerInfo, false, transition);
        });

        forEach(partition.entered, function(handlerInfo) {
          return handlerEnteredOrUpdated(currentHandlerInfos, handlerInfo, true, transition);
        });
      } catch(e) {
        router.state = oldState;
        router.currentHandlerInfos = oldState.handlerInfos;
        throw e;
      }

      router.state.queryParams = finalizeQueryParamChange(router, currentHandlerInfos, newState.queryParams, transition);
    }


    /**
      @private

      Helper method used by setupContexts. Handles errors or redirects
      that may happen in enter/setup.
    */
    function handlerEnteredOrUpdated(currentHandlerInfos, handlerInfo, enter, transition) {

      var handler = handlerInfo.handler,
          context = handlerInfo.context;

      if (enter && handler.enter) { handler.enter(transition); }
      if (transition && transition.isAborted) {
        throw new TransitionAborted();
      }

      handler.context = context;
      if (handler.contextDidChange) { handler.contextDidChange(); }

      if (handler.setup) { handler.setup(context, transition); }
      if (transition && transition.isAborted) {
        throw new TransitionAborted();
      }

      currentHandlerInfos.push(handlerInfo);

      return true;
    }


    /**
      @private

      This function is called when transitioning from one URL to
      another to determine which handlers are no longer active,
      which handlers are newly active, and which handlers remain
      active but have their context changed.

      Take a list of old handlers and new handlers and partition
      them into four buckets:

      * unchanged: the handler was active in both the old and
        new URL, and its context remains the same
      * updated context: the handler was active in both the
        old and new URL, but its context changed. The handler's
        `setup` method, if any, will be called with the new
        context.
      * exited: the handler was active in the old URL, but is
        no longer active.
      * entered: the handler was not active in the old URL, but
        is now active.

      The PartitionedHandlers structure has four fields:

      * `updatedContext`: a list of `HandlerInfo` objects that
        represent handlers that remain active but have a changed
        context
      * `entered`: a list of `HandlerInfo` objects that represent
        handlers that are newly active
      * `exited`: a list of `HandlerInfo` objects that are no
        longer active.
      * `unchanged`: a list of `HanderInfo` objects that remain active.

      @param {Array[HandlerInfo]} oldHandlers a list of the handler
        information for the previous URL (or `[]` if this is the
        first handled transition)
      @param {Array[HandlerInfo]} newHandlers a list of the handler
        information for the new URL

      @return {Partition}
    */
    function partitionHandlers(oldState, newState) {
      var oldHandlers = oldState.handlerInfos;
      var newHandlers = newState.handlerInfos;

      var handlers = {
            updatedContext: [],
            exited: [],
            entered: [],
            unchanged: []
          };

      var handlerChanged, contextChanged, queryParamsChanged, i, l;

      for (i=0, l=newHandlers.length; i<l; i++) {
        var oldHandler = oldHandlers[i], newHandler = newHandlers[i];

        if (!oldHandler || oldHandler.handler !== newHandler.handler) {
          handlerChanged = true;
        }

        if (handlerChanged) {
          handlers.entered.push(newHandler);
          if (oldHandler) { handlers.exited.unshift(oldHandler); }
        } else if (contextChanged || oldHandler.context !== newHandler.context || queryParamsChanged) {
          contextChanged = true;
          handlers.updatedContext.push(newHandler);
        } else {
          handlers.unchanged.push(oldHandler);
        }
      }

      for (i=newHandlers.length, l=oldHandlers.length; i<l; i++) {
        handlers.exited.unshift(oldHandlers[i]);
      }

      return handlers;
    }

    function updateURL(transition, state, inputUrl) {
      var urlMethod = transition.urlMethod;

      if (!urlMethod) {
        return;
      }

      var router = transition.router,
          handlerInfos = state.handlerInfos,
          handlerName = handlerInfos[handlerInfos.length - 1].name,
          params = {};

      for (var i = handlerInfos.length - 1; i >= 0; --i) {
        var handlerInfo = handlerInfos[i];
        merge(params, handlerInfo.params);
        if (handlerInfo.handler.inaccessibleByURL) {
          urlMethod = null;
        }
      }

      if (urlMethod) {
        params.queryParams = transition._visibleQueryParams || state.queryParams;
        var url = router.recognizer.generate(handlerName, params);

        if (urlMethod === 'replace') {
          router.replaceURL(url);
        } else {
          router.updateURL(url);
        }
      }
    }

    /**
      @private

      Updates the URL (if necessary) and calls `setupContexts`
      to update the router's array of `currentHandlerInfos`.
     */
    function finalizeTransition(transition, newState) {

      try {
        log(transition.router, transition.sequence, "Resolved all models on destination route; finalizing transition.");

        var router = transition.router,
            handlerInfos = newState.handlerInfos,
            seq = transition.sequence;

        // Run all the necessary enter/setup/exit hooks
        setupContexts(router, newState, transition);

        // Check if a redirect occurred in enter/setup
        if (transition.isAborted) {
          // TODO: cleaner way? distinguish b/w targetHandlerInfos?
          router.state.handlerInfos = router.currentHandlerInfos;
          return Promise.reject(logAbort(transition));
        }

        updateURL(transition, newState, transition.intent.url);

        transition.isActive = false;
        router.activeTransition = null;

        trigger(router, router.currentHandlerInfos, true, ['didTransition']);

        if (router.didTransition) {
          router.didTransition(router.currentHandlerInfos);
        }

        log(router, transition.sequence, "TRANSITION COMPLETE.");

        // Resolve with the final handler.
        return handlerInfos[handlerInfos.length - 1].handler;
      } catch(e) {
        if (!(e instanceof TransitionAborted)) {
          //var erroneousHandler = handlerInfos.pop();
          var infos = transition.state.handlerInfos;
          transition.trigger(true, 'error', e, transition, infos[infos.length-1].handler);
          transition.abort();
        }

        throw e;
      }
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
    function doTransition(router, args, isIntermediate) {
      // Normalize blank transitions to root URL transitions.
      var name = args[0] || '/';

      var lastArg = args[args.length-1];
      var queryParams = {};
      if (lastArg && lastArg.hasOwnProperty('queryParams')) {
        queryParams = pop.call(args).queryParams;
      }

      var intent;
      if (args.length === 0) {

        log(router, "Updating query params");

        // A query param update is really just a transition
        // into the route you're already on.
        var handlerInfos = router.state.handlerInfos;
        intent = new NamedTransitionIntent({
          name: handlerInfos[handlerInfos.length - 1].name,
          contexts: [],
          queryParams: queryParams
        });

      } else if (name.charAt(0) === '/') {

        log(router, "Attempting URL transition to " + name);
        intent = new URLTransitionIntent({ url: name });

      } else {

        log(router, "Attempting transition to " + name);
        intent = new NamedTransitionIntent({
          name: args[0],
          contexts: slice.call(args, 1),
          queryParams: queryParams
        });
      }

      return router.transitionByIntent(intent, isIntermediate);
    }

    function handlerInfosEqual(handlerInfos, otherHandlerInfos) {
      if (handlerInfos.length !== otherHandlerInfos.length) {
        return false;
      }

      for (var i = 0, len = handlerInfos.length; i < len; ++i) {
        if (handlerInfos[i] !== otherHandlerInfos[i]) {
          return false;
        }
      }
      return true;
    }

    function finalizeQueryParamChange(router, resolvedHandlers, newQueryParams, transition) {
      // We fire a finalizeQueryParamChange event which
      // gives the new route hierarchy a chance to tell
      // us which query params it's consuming and what
      // their final values are. If a query param is
      // no longer consumed in the final route hierarchy,
      // its serialized segment will be removed
      // from the URL.

      for (var k in newQueryParams) {
        if (newQueryParams.hasOwnProperty(k) &&
            newQueryParams[k] === null) {
          delete newQueryParams[k];
        }
      }

      var finalQueryParamsArray = [];
      trigger(router, resolvedHandlers, true, ['finalizeQueryParamChange', newQueryParams, finalQueryParamsArray, transition]);

      if (transition) {
        transition._visibleQueryParams = {};
      }

      var finalQueryParams = {};
      for (var i = 0, len = finalQueryParamsArray.length; i < len; ++i) {
        var qp = finalQueryParamsArray[i];
        finalQueryParams[qp.key] = qp.value;
        if (transition && qp.visible !== false) {
          transition._visibleQueryParams[qp.key] = qp.value;
        }
      }
      return finalQueryParams;
    }

    __exports__["default"] = Router;
  });
define("router/transition-intent", 
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var merge = __dependency1__.merge;

    function TransitionIntent(props) {
      if (props) {
        merge(this, props);
      }
      this.data = this.data || {};
    }

    TransitionIntent.prototype.applyToState = function(oldState) {
      // Default TransitionIntent is a no-op.
      return oldState;
    };

    __exports__["default"] = TransitionIntent;
  });
define("router/transition-intent/named-transition-intent", 
  ["../transition-intent","../transition-state","../handler-info","../utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var TransitionIntent = __dependency1__["default"];
    var TransitionState = __dependency2__["default"];
    var UnresolvedHandlerInfoByParam = __dependency3__.UnresolvedHandlerInfoByParam;
    var UnresolvedHandlerInfoByObject = __dependency3__.UnresolvedHandlerInfoByObject;
    var isParam = __dependency4__.isParam;
    var forEach = __dependency4__.forEach;
    var extractQueryParams = __dependency4__.extractQueryParams;
    var oCreate = __dependency4__.oCreate;
    var merge = __dependency4__.merge;

    function NamedTransitionIntent(props) {
      TransitionIntent.call(this, props);
    }

    NamedTransitionIntent.prototype = oCreate(TransitionIntent.prototype);
    NamedTransitionIntent.prototype.applyToState = function(oldState, recognizer, getHandler, isIntermediate) {

      var partitionedArgs     = extractQueryParams([this.name].concat(this.contexts)),
        pureArgs              = partitionedArgs[0],
        queryParams           = partitionedArgs[1],
        handlers              = recognizer.handlersFor(pureArgs[0]);

      var targetRouteName = handlers[handlers.length-1].handler;

      return this.applyToHandlers(oldState, handlers, getHandler, targetRouteName, isIntermediate);
    };

    NamedTransitionIntent.prototype.applyToHandlers = function(oldState, handlers, getHandler, targetRouteName, isIntermediate, checkingIfActive) {

      var i;
      var newState = new TransitionState();
      var objects = this.contexts.slice(0);

      var invalidateIndex = handlers.length;

      // Pivot handlers are provided for refresh transitions
      if (this.pivotHandler) {
        for (i = 0; i < handlers.length; ++i) {
          if (getHandler(handlers[i].handler) === this.pivotHandler) {
            invalidateIndex = i;
            break;
          }
        }
      }

      var pivotHandlerFound = !this.pivotHandler;

      for (i = handlers.length - 1; i >= 0; --i) {
        var result = handlers[i];
        var name = result.handler;
        var handler = getHandler(name);

        var oldHandlerInfo = oldState.handlerInfos[i];
        var newHandlerInfo = null;

        if (result.names.length > 0) {
          if (i >= invalidateIndex) {
            newHandlerInfo = this.createParamHandlerInfo(name, handler, result.names, objects, oldHandlerInfo);
          } else {
            newHandlerInfo = this.getHandlerInfoForDynamicSegment(name, handler, result.names, objects, oldHandlerInfo, targetRouteName);
          }
        } else {
          // This route has no dynamic segment.
          // Therefore treat as a param-based handlerInfo
          // with empty params. This will cause the `model`
          // hook to be called with empty params, which is desirable.
          newHandlerInfo = this.createParamHandlerInfo(name, handler, result.names, objects, oldHandlerInfo);
        }

        if (checkingIfActive) {
          // If we're performing an isActive check, we want to
          // serialize URL params with the provided context, but
          // ignore mismatches between old and new context.
          newHandlerInfo = newHandlerInfo.becomeResolved(null, newHandlerInfo.context);
          var oldContext = oldHandlerInfo && oldHandlerInfo.context;
          if (result.names.length > 0 && newHandlerInfo.context === oldContext) {
            // If contexts match in isActive test, assume params also match.
            // This allows for flexibility in not requiring that every last
            // handler provide a `serialize` method
            newHandlerInfo.params = oldHandlerInfo && oldHandlerInfo.params;
          }
          newHandlerInfo.context = oldContext;
        }

        var handlerToUse = oldHandlerInfo;
        if (i >= invalidateIndex || newHandlerInfo.shouldSupercede(oldHandlerInfo)) {
          invalidateIndex = Math.min(i, invalidateIndex);
          handlerToUse = newHandlerInfo;
        }

        if (isIntermediate && !checkingIfActive) {
          handlerToUse = handlerToUse.becomeResolved(null, handlerToUse.context);
        }

        newState.handlerInfos.unshift(handlerToUse);
      }

      if (objects.length > 0) {
        throw new Error("More context objects were passed than there are dynamic segments for the route: " + targetRouteName);
      }

      if (!isIntermediate) {
        this.invalidateChildren(newState.handlerInfos, invalidateIndex);
      }

      merge(newState.queryParams, oldState.queryParams);
      merge(newState.queryParams, this.queryParams || {});

      return newState;
    };

    NamedTransitionIntent.prototype.invalidateChildren = function(handlerInfos, invalidateIndex) {
      for (var i = invalidateIndex, l = handlerInfos.length; i < l; ++i) {
        var handlerInfo = handlerInfos[i];
        handlerInfos[i] = handlerInfos[i].getUnresolved();
      }
    };

    NamedTransitionIntent.prototype.getHandlerInfoForDynamicSegment = function(name, handler, names, objects, oldHandlerInfo, targetRouteName) {

      var numNames = names.length;
      var objectToUse;
      if (objects.length > 0) {

        // Use the objects provided for this transition.
        objectToUse = objects[objects.length - 1];
        if (isParam(objectToUse)) {
          return this.createParamHandlerInfo(name, handler, names, objects, oldHandlerInfo);
        } else {
          objects.pop();
        }
      } else if (oldHandlerInfo && oldHandlerInfo.name === name) {
        // Reuse the matching oldHandlerInfo
        return oldHandlerInfo;
      } else {
        // Ideally we should throw this error to provide maximal
        // information to the user that not enough context objects
        // were provided, but this proves too cumbersome in Ember
        // in cases where inner template helpers are evaluated
        // before parent helpers un-render, in which cases this
        // error somewhat prematurely fires.
        //throw new Error("Not enough context objects were provided to complete a transition to " + targetRouteName + ". Specifically, the " + name + " route needs an object that can be serialized into its dynamic URL segments [" + names.join(', ') + "]");
        return oldHandlerInfo;
      }

      return new UnresolvedHandlerInfoByObject({
        name: name,
        handler: handler,
        context: objectToUse,
        names: names
      });
    };

    NamedTransitionIntent.prototype.createParamHandlerInfo = function(name, handler, names, objects, oldHandlerInfo) {
      var params = {};

      // Soak up all the provided string/numbers
      var numNames = names.length;
      while (numNames--) {

        // Only use old params if the names match with the new handler
        var oldParams = (oldHandlerInfo && name === oldHandlerInfo.name && oldHandlerInfo.params) || {};

        var peek = objects[objects.length - 1];
        var paramName = names[numNames];
        if (isParam(peek)) {
          params[paramName] = "" + objects.pop();
        } else {
          // If we're here, this means only some of the params
          // were string/number params, so try and use a param
          // value from a previous handler.
          if (oldParams.hasOwnProperty(paramName)) {
            params[paramName] = oldParams[paramName];
          } else {
            throw new Error("You didn't provide enough string/numeric parameters to satisfy all of the dynamic segments for route " + name);
          }
        }
      }

      return new UnresolvedHandlerInfoByParam({
        name: name,
        handler: handler,
        params: params
      });
    };

    __exports__["default"] = NamedTransitionIntent;
  });
define("router/transition-intent/url-transition-intent", 
  ["../transition-intent","../transition-state","../handler-info","../utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var TransitionIntent = __dependency1__["default"];
    var TransitionState = __dependency2__["default"];
    var UnresolvedHandlerInfoByParam = __dependency3__.UnresolvedHandlerInfoByParam;
    var oCreate = __dependency4__.oCreate;
    var merge = __dependency4__.merge;

    function URLTransitionIntent(props) {
      TransitionIntent.call(this, props);
    }

    URLTransitionIntent.prototype = oCreate(TransitionIntent.prototype);
    URLTransitionIntent.prototype.applyToState = function(oldState, recognizer, getHandler) {
      var newState = new TransitionState();

      var results = recognizer.recognize(this.url),
          queryParams = {},
          i, len;

      if (!results) {
        throw new UnrecognizedURLError(this.url);
      }

      var statesDiffer = false;

      for (i = 0, len = results.length; i < len; ++i) {
        var result = results[i];
        var name = result.handler;
        var handler = getHandler(name);

        if (handler.inaccessibleByURL) {
          throw new UnrecognizedURLError(this.url);
        }

        var newHandlerInfo = new UnresolvedHandlerInfoByParam({
          name: name,
          handler: handler,
          params: result.params
        });

        var oldHandlerInfo = oldState.handlerInfos[i];
        if (statesDiffer || newHandlerInfo.shouldSupercede(oldHandlerInfo)) {
          statesDiffer = true;
          newState.handlerInfos[i] = newHandlerInfo;
        } else {
          newState.handlerInfos[i] = oldHandlerInfo;
        }
      }

      merge(newState.queryParams, results.queryParams);

      return newState;
    };

    /**
      Promise reject reasons passed to promise rejection
      handlers for failed transitions.
     */
    function UnrecognizedURLError(message) {
      this.message = (message || "UnrecognizedURLError");
      this.name = "UnrecognizedURLError";
    }

    __exports__["default"] = URLTransitionIntent;
  });
define("router/transition-state", 
  ["./handler-info","./utils","rsvp/promise","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var ResolvedHandlerInfo = __dependency1__.ResolvedHandlerInfo;
    var forEach = __dependency2__.forEach;
    var promiseLabel = __dependency2__.promiseLabel;
    var Promise = __dependency3__["default"];

    function TransitionState(other) {
      this.handlerInfos = [];
      this.queryParams = {};
      this.params = {};
    }

    TransitionState.prototype = {
      handlerInfos: null,
      queryParams: null,
      params: null,

      promiseLabel: function(label) {
        var targetName = '';
        forEach(this.handlerInfos, function(handlerInfo) {
          if (targetName !== '') {
            targetName += '.';
          }
          targetName += handlerInfo.name;
        });
        return promiseLabel("'" + targetName + "': " + label);
      },

      resolve: function(async, shouldContinue, payload) {
        var self = this;
        // First, calculate params for this state. This is useful
        // information to provide to the various route hooks.
        var params = this.params;
        forEach(this.handlerInfos, function(handlerInfo) {
          params[handlerInfo.name] = handlerInfo.params || {};
        });

        payload = payload || {};
        payload.resolveIndex = 0;

        var currentState = this;
        var wasAborted = false;

        // The prelude RSVP.resolve() asyncs us into the promise land.
        return Promise.resolve(null, this.promiseLabel("Start transition"))
        .then(resolveOneHandlerInfo, null, this.promiseLabel('Resolve handler'))['catch'](handleError, this.promiseLabel('Handle error'));

        function innerShouldContinue() {
          return Promise.resolve(shouldContinue(), promiseLabel("Check if should continue"))['catch'](function(reason) {
            // We distinguish between errors that occurred
            // during resolution (e.g. beforeModel/model/afterModel),
            // and aborts due to a rejecting promise from shouldContinue().
            wasAborted = true;
            return Promise.reject(reason);
          }, promiseLabel("Handle abort"));
        }

        function handleError(error) {
          // This is the only possible
          // reject value of TransitionState#resolve
          var handlerInfos = currentState.handlerInfos;
          var errorHandlerIndex = payload.resolveIndex >= handlerInfos.length ?
                                  handlerInfos.length - 1 : payload.resolveIndex;
          return Promise.reject({
            error: error,
            handlerWithError: currentState.handlerInfos[errorHandlerIndex].handler,
            wasAborted: wasAborted,
            state: currentState
          });
        }

        function proceed(resolvedHandlerInfo) {
          // Swap the previously unresolved handlerInfo with
          // the resolved handlerInfo
          currentState.handlerInfos[payload.resolveIndex++] = resolvedHandlerInfo;

          // Call the redirect hook. The reason we call it here
          // vs. afterModel is so that redirects into child
          // routes don't re-run the model hooks for this
          // already-resolved route.
          var handler = resolvedHandlerInfo.handler;
          if (handler && handler.redirect) {
            handler.redirect(resolvedHandlerInfo.context, payload);
          }

          // Proceed after ensuring that the redirect hook
          // didn't abort this transition by transitioning elsewhere.
          return innerShouldContinue().then(resolveOneHandlerInfo, null, promiseLabel('Resolve handler'));
        }

        function resolveOneHandlerInfo() {
          if (payload.resolveIndex === currentState.handlerInfos.length) {
            // This is is the only possible
            // fulfill value of TransitionState#resolve
            return {
              error: null,
              state: currentState
            };
          }

          var handlerInfo = currentState.handlerInfos[payload.resolveIndex];

          return handlerInfo.resolve(async, innerShouldContinue, payload)
                            .then(proceed, null, promiseLabel('Proceed'));
        }
      }
    };

    __exports__["default"] = TransitionState;
  });
define("router/transition", 
  ["rsvp/promise","./handler-info","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Promise = __dependency1__["default"];
    var ResolvedHandlerInfo = __dependency2__.ResolvedHandlerInfo;
    var trigger = __dependency3__.trigger;
    var slice = __dependency3__.slice;
    var log = __dependency3__.log;
    var promiseLabel = __dependency3__.promiseLabel;

    /**
      @private

      A Transition is a thennable (a promise-like object) that represents
      an attempt to transition to another route. It can be aborted, either
      explicitly via `abort` or by attempting another transition while a
      previous one is still underway. An aborted transition can also
      be `retry()`d later.
     */
    function Transition(router, intent, state, error) {
      var transition = this;
      this.state = state || router.state;
      this.intent = intent;
      this.router = router;
      this.data = this.intent && this.intent.data || {};
      this.resolvedModels = {};
      this.queryParams = {};

      if (error) {
        this.promise = Promise.reject(error);
        return;
      }

      if (state) {
        this.params = state.params;
        this.queryParams = state.queryParams;

        var len = state.handlerInfos.length;
        if (len) {
          this.targetName = state.handlerInfos[state.handlerInfos.length-1].name;
        }

        for (var i = 0; i < len; ++i) {
          var handlerInfo = state.handlerInfos[i];
          if (!(handlerInfo instanceof ResolvedHandlerInfo)) {
            break;
          }
          this.pivotHandler = handlerInfo.handler;
        }

        this.sequence = Transition.currentSequence++;
        this.promise = state.resolve(router.async, checkForAbort, this)['catch'](function(result) {
          if (result.wasAborted) {
            return Promise.reject(logAbort(transition));
          } else {
            transition.trigger('error', result.error, transition, result.handlerWithError);
            transition.abort();
            return Promise.reject(result.error);
          }
        }, promiseLabel('Handle Abort'));
      } else {
        this.promise = Promise.resolve(this.state);
        this.params = {};
      }

      function checkForAbort() {
        if (transition.isAborted) {
          return Promise.reject(undefined, promiseLabel("Transition aborted - reject"));
        }
      }
    }

    Transition.currentSequence = 0;

    Transition.prototype = {
      targetName: null,
      urlMethod: 'update',
      intent: null,
      params: null,
      pivotHandler: null,
      resolveIndex: 0,
      handlerInfos: null,
      resolvedModels: null,
      isActive: true,
      state: null,

      /**
        @public

        The Transition's internal promise. Calling `.then` on this property
        is that same as calling `.then` on the Transition object itself, but
        this property is exposed for when you want to pass around a
        Transition's promise, but not the Transition object itself, since
        Transition object can be externally `abort`ed, while the promise
        cannot.
       */
      promise: null,

      /**
        @public

        Custom state can be stored on a Transition's `data` object.
        This can be useful for decorating a Transition within an earlier
        hook and shared with a later hook. Properties set on `data` will
        be copied to new transitions generated by calling `retry` on this
        transition.
       */
      data: null,

      /**
        @public

        A standard promise hook that resolves if the transition
        succeeds and rejects if it fails/redirects/aborts.

        Forwards to the internal `promise` property which you can
        use in situations where you want to pass around a thennable,
        but not the Transition itself.

        @param {Function} success
        @param {Function} failure
       */
      then: function(success, failure) {
        return this.promise.then(success, failure);
      },

      /**
        @public

        Aborts the Transition. Note you can also implicitly abort a transition
        by initiating another transition while a previous one is underway.
       */
      abort: function() {
        if (this.isAborted) { return this; }
        log(this.router, this.sequence, this.targetName + ": transition was aborted");
        this.isAborted = true;
        this.isActive = false;
        this.router.activeTransition = null;
        return this;
      },

      /**
        @public

        Retries a previously-aborted transition (making sure to abort the
        transition if it's still active). Returns a new transition that
        represents the new attempt to transition.
       */
      retry: function() {
        // TODO: add tests for merged state retry()s
        this.abort();
        return this.router.transitionByIntent(this.intent, false);
      },

      /**
        @public

        Sets the URL-changing method to be employed at the end of a
        successful transition. By default, a new Transition will just
        use `updateURL`, but passing 'replace' to this method will
        cause the URL to update using 'replaceWith' instead. Omitting
        a parameter will disable the URL change, allowing for transitions
        that don't update the URL at completion (this is also used for
        handleURL, since the URL has already changed before the
        transition took place).

        @param {String} method the type of URL-changing method to use
          at the end of a transition. Accepted values are 'replace',
          falsy values, or any other non-falsy value (which is
          interpreted as an updateURL transition).

        @return {Transition} this transition
       */
      method: function(method) {
        this.urlMethod = method;
        return this;
      },

      /**
        @public

        Fires an event on the current list of resolved/resolving
        handlers within this transition. Useful for firing events
        on route hierarchies that haven't fully been entered yet.

        Note: This method is also aliased as `send`

        @param {Boolean} [ignoreFailure=false] a boolean specifying whether unhandled events throw an error
        @param {String} name the name of the event to fire
       */
      trigger: function (ignoreFailure) {
        var args = slice.call(arguments);
        if (typeof ignoreFailure === 'boolean') {
          args.shift();
        } else {
          // Throw errors on unhandled trigger events by default
          ignoreFailure = false;
        }
        trigger(this.router, this.state.handlerInfos.slice(0, this.resolveIndex + 1), ignoreFailure, args);
      },

      /**
        @public

        Transitions are aborted and their promises rejected
        when redirects occur; this method returns a promise
        that will follow any redirects that occur and fulfill
        with the value fulfilled by any redirecting transitions
        that occur.

        @return {Promise} a promise that fulfills with the same
          value that the final redirecting transition fulfills with
       */
      followRedirects: function() {
        var router = this.router;
        return this.promise['catch'](function(reason) {
          if (router.activeTransition) {
            return router.activeTransition.followRedirects();
          }
          return Promise.reject(reason);
        });
      },

      toString: function() {
        return "Transition (sequence " + this.sequence + ")";
      },

      /**
        @private
       */
      log: function(message) {
        log(this.router, this.sequence, message);
      }
    };

    // Alias 'trigger' as 'send'
    Transition.prototype.send = Transition.prototype.trigger;

    /**
      @private

      Logs and returns a TransitionAborted error.
     */
    function logAbort(transition) {
      log(transition.router, transition.sequence, "detected abort.");
      return new TransitionAborted();
    }

    function TransitionAborted(message) {
      this.message = (message || "TransitionAborted");
      this.name = "TransitionAborted";
    }

    __exports__.Transition = Transition;
    __exports__.logAbort = logAbort;
    __exports__.TransitionAborted = TransitionAborted;
  });
define("router/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var slice = Array.prototype.slice;

    var _isArray;
    if (!Array.isArray) {
      _isArray = function (x) {
        return Object.prototype.toString.call(x) === "[object Array]";
      };
    } else {
      _isArray = Array.isArray;
    }

    var isArray = _isArray;
    __exports__.isArray = isArray;
    function merge(hash, other) {
      for (var prop in other) {
        if (other.hasOwnProperty(prop)) { hash[prop] = other[prop]; }
      }
    }

    var oCreate = Object.create || function(proto) {
      function F() {}
      F.prototype = proto;
      return new F();
    };
    __exports__.oCreate = oCreate;
    /**
      @private

      Extracts query params from the end of an array
    **/
    function extractQueryParams(array) {
      var len = (array && array.length), head, queryParams;

      if(len && len > 0 && array[len - 1] && array[len - 1].hasOwnProperty('queryParams')) {
        queryParams = array[len - 1].queryParams;
        head = slice.call(array, 0, len - 1);
        return [head, queryParams];
      } else {
        return [array, null];
      }
    }

    __exports__.extractQueryParams = extractQueryParams;/**
      @private

      Coerces query param properties and array elements into strings.
    **/
    function coerceQueryParamsToString(queryParams) {
      for (var key in queryParams) {
        if (typeof queryParams[key] === 'number') {
          queryParams[key] = '' + queryParams[key];
        } else if (isArray(queryParams[key])) {
          for (var i = 0, l = queryParams[key].length; i < l; i++) {
            queryParams[key][i] = '' + queryParams[key][i];
          }
        }
      }
    }
    /**
      @private
     */
    function log(router, sequence, msg) {
      if (!router.log) { return; }

      if (arguments.length === 3) {
        router.log("Transition #" + sequence + ": " + msg);
      } else {
        msg = sequence;
        router.log(msg);
      }
    }

    __exports__.log = log;function bind(fn, context) {
      var boundArgs = arguments;
      return function(value) {
        var args = slice.call(boundArgs, 2);
        args.push(value);
        return fn.apply(context, args);
      };
    }

    __exports__.bind = bind;function isParam(object) {
      return (typeof object === "string" || object instanceof String || typeof object === "number" || object instanceof Number);
    }


    function forEach(array, callback) {
      for (var i=0, l=array.length; i<l && false !== callback(array[i]); i++) { }
    }

    __exports__.forEach = forEach;/**
      @private

      Serializes a handler using its custom `serialize` method or
      by a default that looks up the expected property name from
      the dynamic segment.

      @param {Object} handler a router handler
      @param {Object} model the model to be serialized for this handler
      @param {Array[Object]} names the names array attached to an
        handler object returned from router.recognizer.handlersFor()
    */
    function serialize(handler, model, names) {
      var object = {};
      if (isParam(model)) {
        object[names[0]] = model;
        return object;
      }

      // Use custom serialize if it exists.
      if (handler.serialize) {
        return handler.serialize(model, names);
      }

      if (names.length !== 1) { return; }

      var name = names[0];

      if (/_id$/.test(name)) {
        object[name] = model.id;
      } else {
        object[name] = model;
      }
      return object;
    }

    __exports__.serialize = serialize;function trigger(router, handlerInfos, ignoreFailure, args) {
      if (router.triggerEvent) {
        router.triggerEvent(handlerInfos, ignoreFailure, args);
        return;
      }

      var name = args.shift();

      if (!handlerInfos) {
        if (ignoreFailure) { return; }
        throw new Error("Could not trigger event '" + name + "'. There are no active handlers");
      }

      var eventWasHandled = false;

      for (var i=handlerInfos.length-1; i>=0; i--) {
        var handlerInfo = handlerInfos[i],
            handler = handlerInfo.handler;

        if (handler.events && handler.events[name]) {
          if (handler.events[name].apply(handler, args) === true) {
            eventWasHandled = true;
          } else {
            return;
          }
        }
      }

      if (!eventWasHandled && !ignoreFailure) {
        throw new Error("Nothing handled the event '" + name + "'.");
      }
    }

    __exports__.trigger = trigger;function getChangelist(oldObject, newObject) {
      var key;
      var results = {
        all: {},
        changed: {},
        removed: {}
      };

      merge(results.all, newObject);

      var didChange = false;
      coerceQueryParamsToString(oldObject);
      coerceQueryParamsToString(newObject);

      // Calculate removals
      for (key in oldObject) {
        if (oldObject.hasOwnProperty(key)) {
          if (!newObject.hasOwnProperty(key)) {
            didChange = true;
            results.removed[key] = oldObject[key];
          }
        }
      }

      // Calculate changes
      for (key in newObject) {
        if (newObject.hasOwnProperty(key)) {
          if (isArray(oldObject[key]) && isArray(newObject[key])) {
            if (oldObject[key].length !== newObject[key].length) {
              results.changed[key] = newObject[key];
              didChange = true;
            } else {
              for (var i = 0, l = oldObject[key].length; i < l; i++) {
                if (oldObject[key][i] !== newObject[key][i]) {
                  results.changed[key] = newObject[key];
                  didChange = true;
                }
              }
            }
          }
          else {
            if (oldObject[key] !== newObject[key]) {
              results.changed[key] = newObject[key];
              didChange = true;
            }
          }
        }
      }

      return didChange && results;
    }

    __exports__.getChangelist = getChangelist;function promiseLabel(label) {
      return 'Router: ' + label;
    }

    __exports__.promiseLabel = promiseLabel;__exports__.merge = merge;
    __exports__.slice = slice;
    __exports__.isParam = isParam;
    __exports__.coerceQueryParamsToString = coerceQueryParamsToString;
  });
define("router", 
  ["./router/router","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var Router = __dependency1__["default"];

    __exports__["default"] = Router;
  });