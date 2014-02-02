// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals jQuery */

sc_require('tasks/task');
SC.LOG_MODULE_LOADING = YES;

/**
  SC.Module is responsible for dynamically loading in JavaScript and other
  resources. These packages of code and resources, called bundles, can be
  loaded by your application once it has finished loading, allowing you to
  reduce the time taken for it to launch.

  You can explicitly load a module by calling SC.Module.loadModule(), or you
  can mark a module as prefetched in your Buildfile. In those cases,
  SproutCore will automatically start to load the bundle once the application
  has loaded and the user has remained idle for more than one second.
*/

SC.Module = SC.Object.create(/** @scope SC.Module */ {

  /**
    Returns YES if the module is ready; NO if it is not loaded or its
    dependencies have not yet loaded.

    @param {String} moduleName the name of the module to check
    @returns {Boolean}
  */
  isModuleReady: function (moduleName) {
    var moduleInfo = SC.MODULE_INFO[moduleName];
    return moduleInfo ? !!moduleInfo.isReady : NO;
  },

  /**
    Asynchronously loads a module if it is not already loaded. If you pass
    a function, or a target and action, it will be called once the module
    has finished loading.

    If the module you request has dependencies (as specified in the Buildfile)
    that are not yet loaded, it will load them first before executing the
    requested module.

    @param moduleName {String}
    @param target {Function}
    @param method {Function}
    @returns {Boolean} YES if already loaded, NO otherwise
  */
  loadModule: function (moduleName, target, method) {
    var module = SC.MODULE_INFO[moduleName], callbacks, targets,
        args   = SC.A(arguments).slice(3),
        log    = SC.LOG_MODULE_LOADING,
        idx, len;

    // Treat the first parameter as the callback if the target is a function and there is
    // no method supplied.
    if (method === undefined && SC.typeOf(target) === SC.T_FUNCTION) {
      method = target;
      target = null;
    }

    if (log) SC.debug("SC.Module: Attempting to load '%@'", moduleName);

    // If we couldn't find anything in the SC.MODULE_INFO hash, we don't have any record of the
    // requested module.
    if (!module) {
      throw new Error("SC.Module: could not find module '%@'".fmt(moduleName));
    }

    // If this module was in the middle of being prefetched, we now need to
    // execute it immediately when it loads.
    module.isPrefetching = NO;

    // If the module is already loaded, execute the callback immediately if SproutCore is loaded,
    // or else as soon as SC has finished loading.
    if (module.isLoaded && !module.isWaitingForRunLoop) {
      if (log) SC.debug("SC.Module: Module '%@' already loaded.", moduleName);

      // we can't just eval it if its dependencies have not been met...
      if (!this._dependenciesMetForModule(moduleName)) {
        // we can't let it return normally here, because we need the module to wait until the end of the run loop.
        // This is because the module may set up bindings.
        this._addCallbackForModule(moduleName, target, method, args);

        this._loadDependenciesForModule(moduleName);

        return NO;
      }

      // If the module has finished loading and we have the string
      // representation, try to evaluate it now.
      if (module.source) {
        if (log) SC.debug("SC.Module: Evaluating JavaScript for module '%@'.", moduleName);
        this._evaluateStringLoadedModule(module);

        // we can't let it return normally here, because we need the module to wait until the end of the run loop.
        // This is because the module may set up bindings.
        this._addCallbackForModule(moduleName, target, method, args);

        this.invokeLast(function () {
          module.isReady = YES;
          this._moduleDidBecomeReady(moduleName);
        });

        return NO;
      }

      if (method) {
        if (SC.isReady) {
          SC.Module._invokeCallback(moduleName, target, method, args);
        } else {
          // Queue callback for when SC has finished loading.
          SC.ready(SC.Module, function () {
            SC.Module._invokeCallback(moduleName, target, method, args);
          });
        }
      }

      return YES;
    }

    // The module has loaded, but is waiting for the end of the run loop before it is "ready";
    // we just need to add the callback.
    else if (module.isWaitingForRunLoop) {
      this._addCallbackForModule(moduleName, target, method, args);
    }
    // The module is not yet loaded, so register the callback and, if necessary, begin loading
    // the code.
    else {
      if (log) SC.debug("SC.Module: Module '%@' is not loaded, loading now.", moduleName);

      // If this method is called more than once for the same module before it is finished
      // loading, we might have multiple callbacks that need to be executed once it loads.
      this._addCallbackForModule(moduleName, target, method, args);

      // If this is the first time the module has been requested, determine its dependencies
      // and begin loading them as well as the JavaScript for this module.
      if (!module.isLoading) {
        this._loadDependenciesForModule(moduleName);
        this._loadCSSForModule(moduleName);
        this._loadJavaScriptForModule(moduleName);
        module.isLoading = YES;
      }

      return NO;
    }
  },

  _addCallbackForModule: function (moduleName, target, method, args) {
    var module = SC.MODULE_INFO[moduleName];

    // Retrieve array of callbacks from MODULE_INFO hash.
    var callbacks = module.callbacks || [];

    if (method) {
      callbacks.push(function () {
        SC.Module._invokeCallback(moduleName, target, method, args);
      });
    }

    module.callbacks = callbacks;
  },

  /**
    @private

    Loads a module in string form. If you prefetch a module, its source will
    be held as a string in memory until SC.Module.loadModule() is called, at
    which time its JavaScript will be evaluated.

    You shouldn't call this method directly; instead, mark modules as
    prefetched in your Buildfile. SproutCore will automatically prefetch those
    modules once your application has loaded and the user is idle.

    @param {String} moduleName the name of the module to prefetch
  */
  prefetchModule: function (moduleName) {
    var module = SC.MODULE_INFO[moduleName];

    if (module.isLoading || module.isLoaded) return;

    if (SC.LOG_MODULE_LOADING) SC.debug("SC.Module: Prefetching module '%@'.", moduleName);
    this._loadDependenciesForModule(moduleName);
    this._loadCSSForModule(moduleName);
    this._loadJavaScriptForModule(moduleName);
    module.isLoading = YES;
    module.isPrefetching = YES;
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    If a module is marked for lazy instantiation, this method will execute the closure and call
    any registered callbacks.
  */
  _executeLazilyInstantiatedModule: function (moduleName, targetName, methodName) {
    var lazyInfo =  SC.LAZY_INSTANTIATION[moduleName];
    var target;
    var method;
    var idx, len;

    if (SC.LOG_MODULE_LOADING) {
      SC.debug("SC.Module: Module '%@' is marked for lazy instantiation, instantiating it now…", moduleName);
    }

    len = lazyInfo.length;
    for (idx = 0; idx < len; idx++) {
      // Iterate through each function associated with this module, and attempt to execute it.
      try {
        lazyInfo[idx]();
      } catch (e) {
        SC.Logger.error("SC.Module: Failed to lazily instatiate entry for  '%@'".fmt(moduleName));
      }
    }

    // Free up memory containing the functions once they have been executed.
    delete SC.LAZY_INSTANTIATION[moduleName];

    // Now that we have executed the functions, try to find the target and action for the callback.
    target = this._targetForTargetName(targetName);
    method = this._methodForMethodNameInTarget(methodName, target);

    if (!method) {
      throw new Error("SC.Module: could not find callback for lazily instantiated module '%@'".fmt(moduleName));
    }
  },

  /**
    Evaluates a module's JavaScript if it is stored in string format, then
    deletes that code from memory.

    @param {Hash} module the module to evaluate
  */
  _evaluateStringLoadedModule: function (module) {
    var moduleSource = module.source;

    // so, force a run loop.
    jQuery.globalEval(moduleSource);

    delete module.source;

    if (module.cssSource) {
      var el = document.createElement('style');
      el.setAttribute('type', 'text/css');
      if (el.styleSheet) {
        el.styleSheet.cssText = module.cssSource;
      } else {
        var content = document.createTextNode(module.cssSource);
        el.appendChild(content);
      }

      document.getElementsByTagName('head')[0].appendChild(el);
    }

    module.isReady = YES;
  },

  /**
    @private

    Creates <link> tags for every CSS resource in a module.

    @param {String} moduleName the name of the module whose CSS should be loaded
  */
  _loadCSSForModule: function (moduleName) {
    var head = document.getElementsByTagName('head')[0];
    var module = SC.MODULE_INFO[moduleName];
    var styles = module.styles || [];
    var len = styles.length;
    var url;
    var el;
    var idx;

    if (!head) head = document.documentElement; // fix for Opera
    len = styles.length;

    for (idx = 0; idx < len; idx++) {
      url = styles[idx];

      if (url.length > 0) {
        if (SC.LOG_MODULE_LOADING) SC.debug("SC.Module: Loading CSS file in '%@' -> '%@'", moduleName, url);

        // if we are on a retina device lets load the retina style sheet instead
        if (window.devicePixelRatio > 1 || window.location.search.indexOf("2x") > -1) {
          url = url.replace('.css', '@2x.css');
        }

        el = document.createElement('link');
        el.setAttribute('href', url);
        el.setAttribute('rel', "stylesheet");
        el.setAttribute('type', "text/css");
        head.appendChild(el);
      }
    }

    el = null;
  },

  _loadJavaScriptForModule: function (moduleName) {
    var module = SC.MODULE_INFO[moduleName];
    var el;
    var url;
    var dependencies = module.dependencies;
    var dependenciesAreLoaded = YES;

    // If this module has dependencies, determine if they are loaded.
    if (dependencies && dependencies.length > 0) {
      dependenciesAreLoaded = this._dependenciesMetForModule(moduleName);
    }

    // If the module is prefetched, always load the string representation.
    if (module.isPrefetched) {
      url = module.stringURL;
    } else {
      if (dependenciesAreLoaded) {
        // Either we have no dependencies or they've all loaded already,
        // so just execute the code immediately once it loads.
        url = module.scriptURL;
      } else {
        // Because the dependencies might load after this module, load the
        // string representation so we can execute it once all dependencies
        // are in place.
        url = module.stringURL;
      }
    }

    if (url.length > 0) {
      if (SC.LOG_MODULE_LOADING) SC.debug("SC.Module: Loading JavaScript file in '%@' -> '%@'", moduleName, url);

      el = document.createElement('script');
      el.setAttribute('type', "text/javascript");
      el.setAttribute('src', url);

      if (el.addEventListener) {
        el.addEventListener('load', function () {
          SC.run(function () {
            SC.Module._moduleDidLoad(moduleName);
          });
        }, false);
      } else if (el.readyState) {
        el.onreadystatechange = function () {
          if (this.readyState === 'complete' || this.readyState === 'loaded') {
            SC.run(function () {
              SC.Module._moduleDidLoad(moduleName);
            });
          }
        };
      }

      document.body.appendChild(el);
    }
  },

  /**
    @private

    Returns YES if all of the dependencies for a module are ready.

    @param {String} moduleName the name of the module being checked
    @returns {Boolean} whether the dependencies are loaded
  */
  _dependenciesMetForModule: function (moduleName) {
    var dependencies = SC.MODULE_INFO[moduleName].dependencies || [];
    var idx, len = dependencies.length;
    var dependencyName;
    var module;

    for (idx = 0; idx < len; idx++) {
      dependencyName = dependencies[idx];
      module = SC.MODULE_INFO[dependencyName];

      if (!module) throw new Error("SC.loadModule: Unable to find dependency %@ for module %@.".fmt(dependencyName, moduleName));

      if (!module.isReady) {
        return NO;
      }
    }

    return YES;
  },

  /**
    Loads all unloaded dependencies for a module, then creates the <script> and <link> tags to
    load the JavaScript and CSS for the module.
  */
  _loadDependenciesForModule: function (moduleName) {
    // Load module's dependencies first.
    var moduleInfo      = SC.MODULE_INFO[moduleName];
    var log             = SC.LOG_MODULE_LOADING;
    var dependencies    = moduleInfo.dependencies || [];
    var dependenciesMet = YES;
    var len             = dependencies.length;
    var idx;
    var requiredModuleName;
    var requiredModule;
    var dependents;

    for (idx = 0; idx < len; idx++) {
      requiredModuleName = dependencies[idx];
      requiredModule = SC.MODULE_INFO[requiredModuleName];

      // Try to find dependent module in MODULE_INFO
      if (!requiredModule) {
        throw new Error("SC.Module: could not find required module '%@' for module '%@'".fmt(requiredModuleName, moduleName));
      } else {

        // Required module has been requested but hasn't loaded yet.
        if (requiredModule.isLoading) {
          dependenciesMet = NO;

          dependents = requiredModule.dependents;
          if (!dependents) requiredModule.dependents = dependents = [];
          dependents.push(moduleName);
        }

        // Required module has already been loaded and evaluated, no need to worry about it.
        else if (requiredModule.isReady) {
          continue;
        }
        // Required module has not been loaded nor requested yet.
        else {
          dependenciesMet = NO;

          // Register this as a dependent module (used by SC._moduleDidLoad()...)
          dependents = requiredModule.dependents;
          if (!dependents) requiredModule.dependents = dependents = [];

          dependents.push(moduleName);

          if (log) SC.debug("SC.Module: '%@' depends on '%@', loading dependency…", moduleName, requiredModuleName);

          // Load dependencies
          SC.Module.loadModule(requiredModuleName);
        }
      }
    }
  },

  /**
    @private

    Calls an action on a target to notify the target that a module has loaded.
  */
  _invokeCallback: function (moduleName, targetName, methodName, args) {
    var method;
    var target;

    target = this._targetForTargetName(targetName);
    method = this._methodForMethodNameInTarget(methodName, target);

    // If we weren't able to find the callback, this module may be lazily instantiated and
    // the callback won't exist until we execute the closure that it is wrapped in.
    if (!method) {
      if (SC.LAZY_INSTANTIATION[moduleName]) {
        this._executeLazilyInstantiatedModule(moduleName, targetName, methodName);

        target = this._targetForTargetName(targetName);
        method = this._methodForMethodNameInTarget(methodName, target);
      } else {
        throw new Error("SC.Module: could not find callback for '%@'".fmt(moduleName));
      }
    }

    if (!args) {
      args = [];
    }

    // The first parameter passed to the callback is the name of the module.
    args.unshift(moduleName);

    // Invoke the callback. Wrap it in a run loop if we are not in a runloop already.
    var needsRunLoop = !!SC.RunLoop.currentRunLoop;
    if (needsRunLoop) {
      SC.run(function () {
        method.apply(target, args);
      });
    } else {
      method.apply(target, args);
    }
  },

  /** @private
    Given a module name, iterates through all registered callbacks and calls them.
  */
  _invokeCallbacksForModule: function (moduleName) {
    var moduleInfo = SC.MODULE_INFO[moduleName], callbacks;
    if (!moduleInfo) return; // shouldn't happen, but recover anyway

    if (SC.LOG_MODULE_LOADING) SC.debug("SC.Module: Module '%@' has completed loading, invoking callbacks.", moduleName);

    callbacks = moduleInfo.callbacks || [];

    for (var idx = 0, len = callbacks.length; idx < len; ++idx) {
      callbacks[idx]();
    }
  },

  _evaluateAndInvokeCallbacks: function (moduleName) {
    var moduleInfo = SC.MODULE_INFO;
    var module = moduleInfo[moduleName];
    var log = SC.LOG_MODULE_LOADING;

    if (log) SC.debug("SC.Module: Evaluating and invoking callbacks for '%@'.", moduleName);

    if (module.source) {
      this._evaluateStringLoadedModule(module);
    }

    // this is ugly, but a module evaluated late like this won't be done instantiating
    // until the end of a run loop. Also, the code here is not structured in a way that makes
    // it easy to "add a step" before saying a module is ready. And finally, invokeLater doesn't
    // accept arguments; hence, the closure.
    module.isWaitingForRunLoop = YES;
    this.invokeLast(function () {
      module.isReady = YES;
      this._moduleDidBecomeReady(moduleName);
    });
  },

  _moduleDidBecomeReady: function (moduleName) {
    var moduleInfo = SC.MODULE_INFO;
    var module = moduleInfo[moduleName];
    var log = SC.LOG_MODULE_LOADING;

    module.isWaitingForRunLoop = NO;

    if (SC.isReady) {
      SC.Module._invokeCallbacksForModule(moduleName);
      delete module.callbacks;
    } else {
      SC.ready(SC, function () {
        SC.Module._invokeCallbacksForModule(moduleName);
        delete module.callbacks;
      });
    }

    // for each dependent module, try and load them again...
    var dependents = module.dependents || [];
    var dependentName, dependent;

    for (var idx = 0, len = dependents.length; idx < len; idx++) {
      dependentName = dependents[idx];
      dependent = moduleInfo[dependentName];
      if (dependent.isLoaded && this._dependenciesMetForModule(dependentName)) {
        if (log) SC.debug("SC.Module: Now that %@ has loaded, all dependencies for a dependent %@ are met.", moduleName, dependentName);
        this._evaluateAndInvokeCallbacks(dependentName);
      }
    }

  },

  /** @private
    Called when the JavaScript for a module finishes loading.

    Any pending callbacks are called (if SC.isReady), and any dependent
    modules which were waiting for this module to load are notified so they
    can continue loading.

    @param moduleName {String} the name of the module that just loaded
  */
  _moduleDidLoad: function (moduleName) {
    var module = SC.MODULE_INFO[moduleName];
    var log    = SC.LOG_MODULE_LOADING;
    var dependenciesMet;
    var callbacks, targets;

    if (log) SC.debug("SC.Module: Module '%@' finished loading.", moduleName);

    if (!module) {
      if (log) SC.debug("SC._moduleDidLoad() called for unknown module '@'.", moduleName);
      module = SC.MODULE_INFO[moduleName] = { isLoaded: YES, isReady: YES };
      return;
    }

    if (module.isLoaded) {
      if (log) SC.debug("SC._moduleDidLoad() called more than once for module '%@'. Skipping.", moduleName);
      return;
    }

    // Remember that we're loaded.
    delete module.isLoading;
    module.isLoaded = YES;

    if (!module.isPrefetching) {
      dependenciesMet = this._dependenciesMetForModule(moduleName);
      if (dependenciesMet) {
        this._evaluateAndInvokeCallbacks(moduleName);
      } else {
        if (log) SC.debug("SC.Module: Dependencies for '%@' not met yet, waiting to evaluate.", moduleName);
      }
    } else {
      delete module.isPrefetching;
      if (log) SC.debug("SC.Module: Module '%@' was prefetched, not evaluating until needed.", moduleName);
    }
  },

  /**
    @private

    If necessary, converts a property path into a target object.

    @param {String|Object} targetName the string or object representing the target
    @returns Object
  */
  _targetForTargetName: function (targetName) {
    if (SC.typeOf(targetName) === SC.T_STRING) {
      return SC.objectForPropertyPath(targetName);
    }

    return targetName;
  },

  /**
    @private

    If necessary, converts a property path into a method object.

    @param {String|Object} methodName the string or object representing the method
    @param {Object} target the target from which to retrieve the method
    @returns Object
  */
  _methodForMethodNameInTarget: function (methodName, target) {
    if (SC.typeOf(methodName) === SC.T_STRING) {
      return SC.objectForPropertyPath(methodName, target);
    }

    return methodName;
  },

  /**
    A list of the methods to temporarily disable (and buffer calls for) when we are suspended.
  */
  methodsForSuspend: "loadModule _moduleDidLoad prefetchModule _moduleDidBecomeReady".w(),

  /**
    Call this in order to prevent expensive tasks from occurring at inopportune times.
  */
  suspend: function () {

    //Increment the suspension count, to support nested suspend()/resume() pairs.
    //We only do anything if the suspend count ends up at 1, as that implies it's
    //the first suspend() call.
    this._suspendCount = (this._suspendCount || 0) + 1;
    if (this._suspendCount !== 1) return;

    //Yummy variables.
    var methods = this.get('methodsForSuspend'),
        replaceKey, saveKey, key, i;

    //Now we go through the list of methods to suspend, and overwrite them with
    //versions that will buffer their calls in a _bufferedCalls array.
    for (i = 0; (key = methods[i]); i++) {
      //jshint loopfunc: true
      //Ensure the replacement function exists at a key where it'll be cached.
      if (!this[replaceKey = "__replacement_" + key + "__"]) {
        (this[replaceKey] = function () {
          (this._bufferedCalls || (this._bufferedCalls = [])).push({
            method: arguments.callee.methodName,
            arguments: arguments
          });
        }).methodName = key;
      }

      //Ensure the original function exists at a key where it'll be cached.
      if (!this[saveKey = "__saved_" + key + "__"]) this[saveKey] = this[key];

      //Ensure that the replacement function exists where the rest of the
      //code expects the original.
      this[key] = this[replaceKey];
    }
  },

  /**
    Call this in order to resume normal behavior of the methods here, and to
    finally perform any calls that may have occurred during suspension. Calls
    will run in the order they were received.
  */
  resume: function () {

    //First, we need to decrement the suspension count, and warn if the suspension
    //count implied that we weren't already suspended. Furthermore, if the suspend
    //count is not zero, then we haven't tackled the last suspend() call with a resume(),
    //and should therefore not resume.
    this._suspendCount = (this._suspendCount || 0) - 1;
    if (this._suspendCount < 0) {
      SC.warn("SC.Module.resume() was called without SC.Module having been in a suspended state. Call aborted.");
      this._suspendCount = 0;
      return;
    }
    if (this._suspendCount > 0) return;

    //Yummy variables.
    var methods = this.get('methodsForSuspend'),
        calls = this._bufferedCalls,
        key, i, method, call;

    //Restore the original methods to where they belong for normal functionality.
    for (i = 0; (key = methods[i]); i++) this[key] = this["__saved_" + key + "__"];

    //Perform any buffered calls that built up during the suspended period.
    for (i = 0; (call = calls) && calls[i]; i++) this[call.method].apply(this, call.arguments);

    //Clear the list of calls, so subsequent resume() calls won't flush them again.
    if (calls) calls.length = 0;
  }
});

/**
Inspect the list of modules and, for every prefetched module, create a
background task to load the module when the user remains idle.
*/
SC.ready(function () {
  var moduleInfo = SC.MODULE_INFO;
  var moduleName;
  var module;
  var task;

  // Iterate through all known modules and look for those that are marked
  // as prefetched.
  for (moduleName in moduleInfo) {
    module = moduleInfo[moduleName];

    if (module.isPrefetched) {
      // Create a task that will load the module, and then register it with
      // the global background task queue.
      task = SC.Module.PrefetchModuleTask.create({ prefetchedModuleName: moduleName });
      SC.backgroundTaskQueue.push(task);
    }
  }
});

SC.Module.PrefetchModuleTask = SC.Task.extend({
  prefetchedModuleName: null,
  run: function () {
    SC.Module.prefetchModule(this.prefetchedModuleName);
  }
});
