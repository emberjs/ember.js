/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.FEATURES, Ember.assert, Ember.Handlebars, Ember.lookup
import Helper from "ember-htmlbars/system/helper";

import Stream from "ember-metal/streams/stream";
import {
  readArray,
  readHash,
  subscribe,
  scanHash,
  scanArray
} from "ember-metal/streams/utils";

/**
  Create a bound helper. Accepts a function that receives the ordered and hash parameters
  from the template. If a bound property was provided in the template it will be resolved to its
  value and any changes to the bound property cause the helper function to be re-run with the updated
  values.

  * `params` - An array of resolved ordered parameters.
  * `hash` - An object containing the hash parameters.

  For example:

  * With an unquoted ordered parameter:

    ```javascript
    {{x-capitalize foo}}
    ```

    Assuming `foo` was set to `"bar"`, the bound helper would receive `["bar"]` as its first argument, and
    an empty hash as its second.

  * With a quoted ordered parameter:

    ```javascript
    {{x-capitalize "foo"}}
    ```

    The bound helper would receive `["foo"]` as its first argument, and an empty hash as its second.

  * With an unquoted hash parameter:

    ```javascript
    {{x-repeat "foo" count=repeatCount}}
    ```

    Assuming that `repeatCount` resolved to 2, the bound helper would receive `["foo"]` as its first argument,
    and { count: 2 } as its second.

  @private
  @method makeBoundHelper
  @for Ember.HTMLBars
  @param {Function} function
  @since 1.10.0
*/
export default function makeBoundHelper(fn) {
  function helperFunc(params, hash, options, env) {
    var view = this;
    var numParams = params.length;
    var param, prop;

    Ember.assert("makeBoundHelper generated helpers do not support use with blocks", !options.template);

    function valueFn() {
      return fn.call(view, readArray(params), readHash(hash), options, env);
    }

    // If none of the hash parameters are bound, act as an unbound helper.
    // This prevents views from being unnecessarily created
    var hasStream = scanArray(params) || scanHash(hash);
    if (hasStream) {
      var lazyValue = new Stream(valueFn);

      for (var i = 0; i < numParams; i++) {
        param = params[i];
        subscribe(param, lazyValue.notify, lazyValue);
      }

      for (prop in hash) {
        param = hash[prop];
        subscribe(param, lazyValue.notify, lazyValue);
      }

      return lazyValue;
    } else {
      return valueFn();
    }
  }

  return new Helper(helperFunc);
}
