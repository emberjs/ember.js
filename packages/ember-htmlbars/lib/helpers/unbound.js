import EmberError from "ember-metal/error";
import { IS_BINDING } from "ember-metal/mixin";
import { read } from "ember-metal/streams/utils";
import lookupHelper from "ember-htmlbars/system/lookup-helper";

/**
@module ember
@submodule ember-htmlbars
*/

/**
  `unbound` allows you to output a property without binding. *Important:* The
  output will not be updated if the property changes. Use with caution.

  ```handlebars
  <div>{{unbound somePropertyThatDoesntChange}}</div>
  ```

  `unbound` can also be used in conjunction with a bound helper to
  render it in its unbound form:

  ```handlebars
  <div>{{unbound helperName somePropertyThatDoesntChange}}</div>
  ```

  @method unbound
  @for Ember.Handlebars.helpers
  @param {String} property
  @return {String} HTML string
*/
export function unboundHelper(params, hash, options, env) {
  Ember.assert(
    "The `unbound` helper expects at least one argument, " +
    "e.g. `{{unbound user.name}}`.",
    params.length > 0
  );

  if (params.length === 1) {
    return read(params[0]);
  } else {
    options.helperName = options.helperName || 'unbound';

    var view = env.data.view;
    var helperName = params[0]._label;
    var helper = lookupHelper(helperName, view, env);

    if (!helper) {
      throw new EmberError('HTMLBars error: Could not find component or helper named ' + helperName + '.');
    }

    return helper.helperFunction.call(this, readParams(params), readHash(hash, view), options, env);
  }
}

function readParams(params) {
  var l = params.length;
  var unboundParams = new Array(l - 1);

  for (var i = 1; i < l; i++) {
    unboundParams[i-1] = read(params[i]);
  }

  return unboundParams;
}

function readHash(hash, view) {
  var unboundHash = {};

  for (var prop in hash) {
    if (IS_BINDING.test(prop)) {
      var value = hash[prop];
      if (typeof value === 'string') {
        value = view.getStream(value);
      }

      unboundHash[prop.slice(0, -7)] = read(value);
    } else {
      unboundHash[prop] = read(hash[prop]);
    }
  }

  return unboundHash;
}
