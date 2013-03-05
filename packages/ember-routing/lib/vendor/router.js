define("router",
  ["route-recognizer"],
  function(RouteRecognizer) {
    "use strict";
    /**
      @private

      This file references several internal structures:

      ## `RecognizedHandler`

      * `{String} handler`: A handler name
      * `{Object} params`: A hash of recognized parameters

      ## `UnresolvedHandlerInfo`

      * `{Boolean} isDynamic`: whether a handler has any dynamic segments
      * `{String} name`: the name of a handler
      * `{Object} context`: the active context for the handler

      ## `HandlerInfo`

      * `{Boolean} isDynamic`: whether a handler has any dynamic segments
      * `{String} name`: the original unresolved handler name
      * `{Object} handler`: a handler object
      * `{Object} context`: the active context for the handler
    */


    function Router() {
      this.recognizer = new RouteRecognizer();
    }


    Router.prototype = {
      loader: function(handler, done) {
        done();
      },
      /**
        The main entry point into the router. The API is essentially
        the same as the `map` method in `route-recognizer`.

        This method extracts the String handler at the last `.to()`
        call and uses it as the name of the whole route.

        @param {Function} callback
      */
      map: function(callback) {
        this.recognizer.delegate = this.delegate;

        this.recognizer.map(callback, function(recognizer, route) {
          var lastHandler = route[route.length - 1].handler;
          var args = [route, { as: lastHandler }];
          recognizer.add.apply(recognizer, args);
        });
      },

      hasRoute: function(route) {
        return this.recognizer.hasRoute(route);
      },

      /**
        The entry point for handling a change to the URL (usually
        via the back and forward button).

        Returns an Array of handlers and the parameters associated
        with those parameters.

        @param {String} url a URL to process

        @return {Array} an Array of `[handler, parameter]` tuples
      */
      handleURL: function(url) {
        var results = this.recognizer.recognize(url),
            objects = [];

        if (!results) {
          throw new Error("No route matched the URL '" + url + "'");
        }

        collectObjects(this, results, 0, []);
      },

      /**
        Hook point for updating the URL.

        @param {String} url a URL to update to
      */
      updateURL: function() {
        throw "updateURL is not implemented";
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
        var args = Array.prototype.slice.call(arguments, 1);
        doTransition(this, name, this.updateURL, args);
      },

      /**
        Identical to `transitionTo` except that the current URL will be replaced
        if possible.

        This method is intended primarily for use with `replaceState`.

        @param {String} name the name of the route
      */
      replaceWith: function(name) {
        var args = Array.prototype.slice.call(arguments, 1);
        doTransition(this, name, this.replaceURL, args);
      },

      /**
        @private

        This method takes a handler name and a list of contexts and returns
        a serialized parameter hash suitable to pass to `recognizer.generate()`.

        @param {String} handlerName
        @param {Array[Object]} contexts
        @return {Object} a serialized parameter hash
      */
      paramsForHandler: function(handlerName, callback) {
        var output = this._paramsForHandler(handlerName, [].slice.call(arguments, 1));
        return output.params;
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
        var params = this.paramsForHandler.apply(this, arguments);
        return this.recognizer.generate(handlerName, params);
      },

      /**
        @private

        Used internally by `generate` and `transitionTo`.
      */
      _paramsForHandler: function(handlerName, objects, doUpdate) {
        var handlers = this.recognizer.handlersFor(handlerName),
            params = {},
            toSetup = [],
            startIdx = handlers.length,
            objectsToMatch = objects.length,
            object, objectChanged, handlerObj, handler, names, i, len;

        // Find out which handler to start matching at
        for (i=handlers.length-1; i>=0 && objectsToMatch>0; i--) {
          if (handlers[i].names.length) {
            objectsToMatch--;
            startIdx = i;
          }
        }

        if (objectsToMatch > 0) {
          throw "More objects were passed than dynamic segments";
        }

        // Connect the objects to the routes
        for (i=0, len=handlers.length; i<len; i++) {
          handlerObj = handlers[i];
          handler = this.getHandler(handlerObj.handler);
          names = handlerObj.names;
          objectChanged = false;

          // If it's a dynamic segment
          if (names.length) {
            // If we have objects, use them
            if (i >= startIdx) {
              object = objects.shift();
              objectChanged = true;
            // Otherwise use existing context
            } else {
              object = handler.context;
            }

            // Serialize to generate params
            if (handler.serialize) {
              merge(params, handler.serialize(object, names));
            }
          // If it's not a dynamic segment and we're updating
          } else if (doUpdate) {
            // If we've passed the match point we need to deserialize again
            // or if we never had a context
            if (i > startIdx || !handler.hasOwnProperty('context')) {
              if (handler.deserialize) {
                object = handler.deserialize({});
                objectChanged = true;
              }
            // Otherwise use existing context
            } else {
              object = handler.context;
            }
          }

          // Make sure that we update the context here so it's available to
          // subsequent deserialize calls
          if (doUpdate && objectChanged) {
            // TODO: It's a bit awkward to set the context twice, see if we can DRY things up
            setContext(handler, object);
          }

          toSetup.push({
            isDynamic: !!handlerObj.names.length,
            handler: handlerObj.handler,
            name: handlerObj.name,
            context: object
          });
        }

        return { params: params, toSetup: toSetup };
      },

      isActive: function(handlerName) {
        var contexts = [].slice.call(arguments, 1);

        var currentHandlerInfos = this.currentHandlerInfos,
            found = false, names, object, handlerInfo, handlerObj;

        for (var i=currentHandlerInfos.length-1; i>=0; i--) {
          handlerInfo = currentHandlerInfos[i];
          if (handlerInfo.name === handlerName) { found = true; }

          if (found) {
            if (contexts.length === 0) { break; }

            if (handlerInfo.isDynamic) {
              object = contexts.pop();
              if (handlerInfo.context !== object) { return false; }
            }
          }
        }

        return contexts.length === 0 && found;
      },

      trigger: function(name) {
        var args = [].slice.call(arguments);
        trigger(this, args);
      }
    };

    function merge(hash, other) {
      for (var prop in other) {
        if (other.hasOwnProperty(prop)) { hash[prop] = other[prop]; }
      }
    }

    function isCurrent(currentHandlerInfos, handlerName) {
      return currentHandlerInfos[currentHandlerInfos.length - 1].name === handlerName;
    }

    /**
      @private

      This function is called the first time the `collectObjects`
      function encounters a promise while converting URL parameters
      into objects.

      It triggers the `enter` and `setup` methods on the `loading`
      handler.

      @param {Router} router
    */
    function loading(router) {
      if (!router.isLoading) {
        router.isLoading = true;
        var handler = router.getHandler('loading');

        if (handler) {
          if (handler.enter) { handler.enter(); }
          if (handler.setup) { handler.setup(); }
        }
      }
    }

    /**
      @private

      This function is called if a promise was previously
      encountered once all promises are resolved.

      It triggers the `exit` method on the `loading` handler.

      @param {Router} router
    */
    function loaded(router) {
      router.isLoading = false;
      var handler = router.getHandler('loading');
      if (handler && handler.exit) { handler.exit(); }
    }

    /**
      @private

      This function is called if any encountered promise
      is rejected.

      It triggers the `exit` method on the `loading` handler,
      the `enter` method on the `failure` handler, and the
      `setup` method on the `failure` handler with the
      `error`.

      @param {Router} router
      @param {Object} error the reason for the promise
        rejection, to pass into the failure handler's
        `setup` method.
    */
    function failure(router, error) {
      loaded(router);
      var handler = router.getHandler('failure');
      if (handler && handler.setup) { handler.setup(error); }
    }

    /**
      @private
    */
    function doTransition(router, name, method, args) {
      var output = router._paramsForHandler(name, args, true);
      var params = output.params, toSetup = output.toSetup;

      var url = router.recognizer.generate(name, params);
      method.call(router, url);

      setupContexts(router, toSetup);
    }

    /**
      @private

      This function is called after a URL change has been handled
      by `router.handleURL`.

      Takes an Array of `RecognizedHandler`s, and converts the raw
      params hashes into deserialized objects by calling deserialize
      on the handlers. This process builds up an Array of
      `HandlerInfo`s. It then calls `setupContexts` with the Array.

      If the `deserialize` method on a handler returns a promise
      (i.e. has a method called `then`), this function will pause
      building up the `HandlerInfo` Array until the promise is
      resolved. It will use the resolved value as the context of
      `HandlerInfo`.
    */
    function collectObjects(router, results, index, objects) {
      if (results.length === index) {
        loaded(router);
        setupContexts(router, objects);
        return;
      }

      var result = results[index];
      var handler = router.getHandler(result.handler);
      var object = handler.deserialize && handler.deserialize(result.params);

      if (object && typeof object.then === 'function') {
        loading(router);

        // The chained `then` means that we can also catch errors that happen in `proceed`
        object.then(proceed).then(null, function(error) {
          failure(router, error);
        });
      } else {
        proceed(object);
      }

      function proceed(value) {
        if (handler.context !== object) {
          setContext(handler, object);
        }

        var updatedObjects = objects.concat([{
          context: value,
          handler: result.handler,
          isDynamic: result.isDynamic
        }]);
        router.loader(result, function() {
          collectObjects(router, results, index + 1, updatedObjects);
        });
      }
    }

    /**
      @private

      Takes an Array of `UnresolvedHandlerInfo`s, resolves the handler names
      into handlers, and then figures out what to do with each of the handlers.

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
         1. Triggers the `deserialize` callback on the
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

      @param {Router} router
      @param {Array[UnresolvedHandlerInfo]} handlerInfos
    */
    function setupContexts(router, handlerInfos) {
      resolveHandlers(router, handlerInfos);

      var partition =
        partitionHandlers(router.currentHandlerInfos || [], handlerInfos);

      router.currentHandlerInfos = handlerInfos;

      eachHandler(partition.exited, function(handler, context) {
        delete handler.context;
        if (handler.exit) { handler.exit(); }
      });

      eachHandler(partition.updatedContext, function(handler, context) {
        setContext(handler, context);
        if (handler.setup) { handler.setup(context); }
      });

      var aborted = false;
      eachHandler(partition.entered, function(handler, context) {
        if (aborted) { return; }
        if (handler.enter) { handler.enter(); }
        setContext(handler, context);
        if (handler.setup) {
          if (false === handler.setup(context)) {
            aborted = true;
          }
        }
      });

      if (router.didTransition) {
        router.didTransition(handlerInfos);
      }
    }

    /**
      @private

      Iterates over an array of `HandlerInfo`s, passing the handler
      and context into the callback.

      @param {Array[HandlerInfo]} handlerInfos
      @param {Function(Object, Object)} callback
    */
    function eachHandler(handlerInfos, callback) {
      for (var i=0, l=handlerInfos.length; i<l; i++) {
        var handlerInfo = handlerInfos[i],
            handler = handlerInfo.handler,
            context = handlerInfo.context;

        callback(handler, context);
      }
    }

    /**
      @private

      Updates the `handler` field in each element in an Array of
      `UnresolvedHandlerInfo`s from a handler name to a resolved handler.

      When done, the Array will contain `HandlerInfo` structures.

      @param {Router} router
      @param {Array[UnresolvedHandlerInfo]} handlerInfos
    */
    function resolveHandlers(router, handlerInfos) {
      var handlerInfo;

      for (var i=0, l=handlerInfos.length; i<l; i++) {
        handlerInfo = handlerInfos[i];

        handlerInfo.name = handlerInfo.handler;
        handlerInfo.handler = router.getHandler(handlerInfo.handler);
      }
    }

    /**
      @private

      This function is called when transitioning from one URL to
      another to determine which handlers are not longer active,
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

      The PartitionedHandlers structure has three fields:

      * `updatedContext`: a list of `HandlerInfo` objects that
        represent handlers that remain active but have a changed
        context
      * `entered`: a list of `HandlerInfo` objects that represent
        handlers that are newly active
      * `exited`: a list of `HandlerInfo` objects that are no
        longer active.

      @param {Array[HandlerInfo]} oldHandlers a list of the handler
        information for the previous URL (or `[]` if this is the
        first handled transition)
      @param {Array[HandlerInfo]} newHandlers a list of the handler
        information for the new URL

      @return {Partition}
    */
    function partitionHandlers(oldHandlers, newHandlers) {
      var handlers = {
            updatedContext: [],
            exited: [],
            entered: []
          };

      var handlerChanged, contextChanged, i, l;

      for (i=0, l=newHandlers.length; i<l; i++) {
        var oldHandler = oldHandlers[i], newHandler = newHandlers[i];

        if (!oldHandler || oldHandler.handler !== newHandler.handler) {
          handlerChanged = true;
        }

        if (handlerChanged) {
          handlers.entered.push(newHandler);
          if (oldHandler) { handlers.exited.unshift(oldHandler); }
        } else if (contextChanged || oldHandler.context !== newHandler.context) {
          contextChanged = true;
          handlers.updatedContext.push(newHandler);
        }
      }

      for (i=newHandlers.length, l=oldHandlers.length; i<l; i++) {
        handlers.exited.unshift(oldHandlers[i]);
      }

      return handlers;
    }

    function trigger(router, args) {
      var currentHandlerInfos = router.currentHandlerInfos;

      var name = args.shift();

      if (!currentHandlerInfos) {
        throw new Error("Could not trigger event '" + name + "'. There are no active handlers");
      }

      for (var i=currentHandlerInfos.length-1; i>=0; i--) {
        var handlerInfo = currentHandlerInfos[i],
            handler = handlerInfo.handler;

        if (handler.events && handler.events[name]) {
          handler.events[name].apply(handler, args);
          return;
        }
      }

      throw new Error("Nothing handled the event '" + name + "'.");
    }

    function setContext(handler, context) {
      handler.context = context;
      if (handler.contextDidChange) { handler.contextDidChange(); }
    }
    return Router;
  });
