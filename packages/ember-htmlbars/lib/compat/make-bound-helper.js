/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.FEATURES, Ember.assert, Ember.Handlebars, Ember.lookup
import { IS_BINDING } from "ember-metal/mixin";
import { appendSimpleBoundView } from "ember-views/views/simple_bound_view";
import merge from "ember-metal/merge";
import Helper from "ember-htmlbars/system/helper";

import Stream from "ember-metal/streams/stream";
import {
  readArray,
  readHash
} from "ember-metal/streams/utils";

/**
  A helper function used by `registerBoundHelper`. Takes the
  provided Handlebars helper function fn and returns it in wrapped
  bound helper form.

  The main use case for using this outside of `registerBoundHelper`
  is for registering helpers on the container:

  ```js
  var boundHelperFn = Ember.Handlebars.makeBoundHelper(function(word) {
    return word.toUpperCase();
  });

  container.register('helper:my-bound-helper', boundHelperFn);
  ```

  In the above example, if the helper function hadn't been wrapped in
  `makeBoundHelper`, the registered helper would be unbound.

  @method makeBoundHelper
  @for Ember.Handlebars
  @param {Function} function
  @param {String} dependentKeys*
  @since 1.2.0
*/
export default function makeBoundHelper(fn, compatMode) {
  var dependentKeys = [];
  for (var i = 1; i < arguments.length; i++) {
    dependentKeys.push(arguments[i]);
  }

  function helperFunc(params, hash, options, env) {
    var view = this;
    var numParams = params.length;

    Ember.assert("registerBoundHelper-generated helpers do not support use with Handlebars blocks.", !options.render);

    for (var prop in hash) {
      if (IS_BINDING.test(prop)) {
        hash[prop.slice(0, -7)] = view._getBindingForStream(hash[prop]);
        delete hash[prop];
      }
    }

    function valueFn() {
      var args = readArray(params);

      args.push({
        hash: readHash(hash),
        data: { properties: options._raw.params }
      });
      return fn.apply(view, args);
    }

    if (env.data.isUnbound) {
      return valueFn();
    } else {
      var lazyValue = new Stream(valueFn);

      appendSimpleBoundView(this, options.morph, lazyValue);

      var param;

      for (i = 0; i < numParams; i++) {
        param = params[i];
        if (param && param.isStream) {
          param.subscribe(lazyValue.notify, lazyValue);
        }
      }

      for (prop in hash) {
        param = hash[prop];
        if (param && param.isStream) {
          param.subscribe(lazyValue.notify, lazyValue);
        }
      }

      if (numParams > 0) {
        var firstParam = params[0];
        // Only bother with subscriptions if the first argument
        // is a stream itself, and not a primitive.
        if (firstParam && firstParam.isStream) {
          var onDependentKeyNotify = function onDependentKeyNotify(stream) {
            stream.value();
            lazyValue.notify();
          };
          for (i = 0; i < dependentKeys.length; i++) {
            var childParam = firstParam.get(dependentKeys[i]);
            childParam.value();
            childParam.subscribe(onDependentKeyNotify);
          }
        }
      }
    }
  }

  function preprocessArguments(view, params, hash, options, env) {
    options._raw = {
      params: params.slice(),
      hash: merge({}, hash)
    };
  }

  return new Helper(helperFunc, preprocessArguments);
}
