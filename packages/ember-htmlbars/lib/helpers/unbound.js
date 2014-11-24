import lookupHelper from 'ember-htmlbars/system/lookup-helper';
import { read } from 'ember-metal/streams/read';
import EmberError from "ember-metal/error";
import merge from "ember-metal/merge";

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
  var length = params.length;
  var result;

  options.helperName = options.helperName || 'unbound';

  if (length === 1) {
    result = params[0].value();
  } else if (length >= 2) {
    env.data.isUnbound = true;

    var helperName = options._raw.params[0];
    var args = [];

    for (var i = 1, l = params.length; i < l; i++) {
      var value = read(params[i]);

      args.push(value);
    }

    var helper = lookupHelper(helperName, this, env);

    if (!helper) {
      throw new EmberError('HTMLBars error: Could not find component or helper named ' + helperName + '.');
    }

    result = helper.helperFunction.call(this, args, hash, options, env);

    delete env.data.isUnbound;
  }

  return result;
}

export function preprocessArgumentsForUnbound(view, params, hash, options, env) {
  options._raw = {
    params: params.slice(),
    hash:   merge({}, hash)
  };
}
