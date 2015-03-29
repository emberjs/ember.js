/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.FEATURES, Ember.assert, Ember.Handlebars, Ember.lookup
import { IS_BINDING } from "ember-metal/mixin";
import Helper from "ember-htmlbars/system/helper";

import Stream from "ember-metal/streams/stream";
import {
  readArray,
  scanArray,
  scanHash,
  readHash,
  isStream
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
  @deprecated
*/
export default function makeBoundHelper(fn, ...dependentKeys) {
  function helperFunc(params, hash, options, env) {
    var view = env.data.view;
    var numParams = params.length;
    var param;

    Ember.assert("registerBoundHelper-generated helpers do not support use with Handlebars blocks.", !options.template);

    for (var prop in hash) {
      if (IS_BINDING.test(prop)) {
        hash[prop.slice(0, -7)] = view.getStream(hash[prop]);
        delete hash[prop];
      }
    }

    function valueFn() {
      var args = readArray(params);
      var properties = new Array(params.length);
      for (var i = 0, l = params.length; i < l; i++) {
        param = params[i];

        if (isStream(param)) {
          properties[i] = param._label;
        } else {
          properties[i] = param;
        }
      }

      args.push({
        hash: readHash(hash),
        data: { properties: properties }
      });
      return fn.apply(view, args);
    }

    // If none of the hash parameters are bound, act as an unbound helper.
    // This prevents views from being unnecessarily created
    var hasStream = scanArray(params) || scanHash(hash);
    if (hasStream) {
      var lazyValue = new Stream(valueFn);

      for (var i = 0; i < numParams; i++) {
        param = params[i];
        if (isStream(param)) {
          param.subscribe(lazyValue.notify, lazyValue);
        }
      }

      for (prop in hash) {
        param = hash[prop];
        if (isStream(param)) {
          param.subscribe(lazyValue.notify, lazyValue);
        }
      }

      if (numParams > 0) {
        var firstParam = params[0];
        // Only bother with subscriptions if the first argument
        // is a stream itself, and not a primitive.
        if (isStream(firstParam)) {
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

      return lazyValue;
    } else {
      return valueFn();
    }
  }

  return new Helper(helperFunc);
}
