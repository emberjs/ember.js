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

      * `{String} name`: the name of a handler
      * `{Object} context`: the active context for the handler

      ## `HandlerInfo`

      * `{Object} handler`: a handler object
      * `{Object} context`: the active context for the handler
    */


    function Router() {
      this.recognizer = new RouteRecognizer();
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
        this.recognizer.map(callback, function(recognizer, route) {
          var lastHandler = route[route.length - 1].handler;
          var args = [route, { as: lastHandler }];
          recognizer.add.apply(recognizer, args);
        });
      },

      /**
        The entry point for handling a change to the URL (usually
        via the back and forward button).

        Returns an Array of handlers and the parameters associated
        with those parameters.

        @param {String} url a URL to process

        @returns {Array} an Array of `[handler, parameter]` tuples
      */
      handleURL: function(url) {
        var results = this.recognizer.recognize(url),
            objects = [];

        collectObjects(this, results, 0, []);
      },

      /**
        Transition into the specified named route.

        If necessary, trigger the exit callback on any handlers
        that are no longer represented by the target route.

        @param {String} name the name of the route
      */
      transitionTo: function(name) {
        var output = this._paramsForHandler(name, [].slice.call(arguments, 1), function(handler) {
          if (handler.hasOwnProperty('context')) { return handler.context; }
          if (handler.deserialize) { return handler.deserialize({}); }
          return null;
        });

        var params = output.params, toSetup = output.toSetup;

        var url = this.recognizer.generate(name, params);
        this.updateURL(url);

        setupContexts(this, toSetup);
      },

      /**
        @private

        This method takes a handler name and a list of contexts and returns
        a serialized parameter hash suitable to pass to `recognizer.generate()`.

        @param {String} handlerName
        @param {Array[Object]} contexts
        @returns {Object} a serialized parameter hash
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

        @returns {String} a URL
      */
      generate: function(handlerName) {
        var params = this.paramsForHandler.apply(this, arguments);
        return this.recognizer.generate(handlerName, params);
      },

      /**
        @private

        Used internally by `generate` and `transitionTo`.
      */
      _paramsForHandler: function(handlerName, objects, callback) {
        var handlers = this.recognizer.handlersFor(handlerName),
            params = {},
            toSetup = [],
            object, handlerObj, handler, names;

        for (var i=handlers.length-1; i>=0; i--) {
          handlerObj = handlers[i];
          handler = this.getHandler(handlerObj.handler);
          names = handlerObj.names;

          if (names.length) {
            if (objects.length) { object = objects.pop(); }
            else { object = handler.context; }

            if (handler.serialize) {
              merge(params, handler.serialize(object, names));
            }
          } else if (callback) {
            object = callback(handler);
          }

          toSetup.unshift({ handler: handlerObj.handler, context: object });
        }

        return { params: params, toSetup: toSetup };
      },

      trigger: function(name, context) {
        trigger(this, name, context);
      }
    };

    function merge(hash, other) {
      for (var prop in other) {
        if (other.hasOwnProperty(prop)) { hash[prop] = other[prop]; }
      }
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

        object.then(proceed, function(error) {
          failure(router, error);
        });
      } else {
        proceed(object);
      }

      function proceed(value) {
        var updatedObjects = objects.concat([{ context: value, handler: result.handler }]);
        collectObjects(router, results, index + 1, updatedObjects);
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
        handler.context = context;
        if (handler.setup) { handler.setup(context); }
      });

      eachHandler(partition.entered, function(handler, context) {
        if (handler.enter) { handler.enter(); }
        handler.context = context;
        if (handler.setup) { handler.setup(context); }
      });
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
      for (var i=0, l=handlerInfos.length; i<l; i++) {
        handlerInfos[i].handler = router.getHandler(handlerInfos[i].handler);
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

      @returns {Partition}
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

    function trigger(router, name, context) {
      var currentHandlerInfos = router.currentHandlerInfos;

      if (!currentHandlerInfos) {
        throw new Error("Could not trigger event. There are no active handlers");
      }

      for (var i=currentHandlerInfos.length-1; i>=0; i--) {
        var handlerInfo = currentHandlerInfos[i],
            handler = handlerInfo.handler;

        if (handler.events && handler.events[name]) {
          handler.events[name](handler, context);
          break;
        }
      }
    }
    return Router;
  });
