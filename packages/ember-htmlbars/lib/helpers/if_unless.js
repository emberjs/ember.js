/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.assert
import { bind } from "ember-htmlbars/helpers/binding";

import { get } from "ember-metal/property_get";
import { isArray } from "ember-metal/utils";
import ConditionalStream from "ember-views/streams/conditional_stream";

function shouldDisplayIfHelperContent(result) {
  var truthy = result && get(result, 'isTruthy');
  if (typeof truthy === 'boolean') { return truthy; }

  if (isArray(result)) {
    return get(result, 'length') !== 0;
  } else {
    return !!result;
  }
}

/**
  Use the `boundIf` helper to create a conditional that re-evaluates
  whenever the truthiness of the bound value changes.

  ```handlebars
  {{#boundIf "content.shouldDisplayTitle"}}
    {{content.title}}
  {{/boundIf}}
  ```

  @private
  @method boundIf
  @for Ember.Handlebars.helpers
  @param {String} property Property to bind
  @param {Function} fn Context to provide for rendering
  @return {String} HTML string
*/
function boundIfHelper(params, hash, options, env) {
  options.helperName = options.helperName || 'boundIf';
  return bind.call(this, params[0], hash, options, env, true, shouldDisplayIfHelperContent, shouldDisplayIfHelperContent, [
   'isTruthy',
   'length'
 ]);
}

/**
  @private

  Use the `unboundIf` helper to create a conditional that evaluates once.

  ```handlebars
  {{#unboundIf "content.shouldDisplayTitle"}}
    {{content.title}}
  {{/unboundIf}}
  ```

  @method unboundIf
  @for Ember.Handlebars.helpers
  @param {String} property Property to bind
  @param {Function} fn Context to provide for rendering
  @return {String} HTML string
  @since 1.4.0
*/
function unboundIfHelper(params, hash, options, env) {
  var template = options.render;
  var value = params[0];

  if (params[0].isStream) {
    value = params[0].value();
  }

  if (!shouldDisplayIfHelperContent(value)) {
    template = options.inverse;
  }

  return template(this, env, options.morph.contextualElement);
}

/**
  See [boundIf](/api/classes/Ember.Handlebars.helpers.html#method_boundIf)
  and [unboundIf](/api/classes/Ember.Handlebars.helpers.html#method_unboundIf)

  @method if
  @for Ember.Handlebars.helpers
  @param {Function} context
  @param {Hash} options
  @return {String} HTML string
*/
function ifHelper(params, hash, options, env) {
  Ember.assert("If helper in block form expect exactly one argument", !options.render || params.length === 1);
  if (Ember.FEATURES.isEnabled('ember-htmlbars-inline-if-helper')) {
    if (!options.render) {
      Ember.assert("If helper in inline form expects between two and three arguments", params.length === 2 || params.length === 3);
      var condition = params[0];
      var truthy = params[1];
      var falsy = params[2];
      return new ConditionalStream(condition, truthy, falsy);
    }
  }

  options.inverse = options.inverse || function(){ return ''; };

  options.helperName = options.helperName || ('if ');

  if (env.data.isUnbound) {
    return env.helpers.unboundIf.helperFunction.call(this, params, hash, options, env);
  } else {
    return env.helpers.boundIf.helperFunction.call(this, params, hash, options, env);
  }
}

/**
  @method unless
  @for Ember.Handlebars.helpers
  @param {Function} context
  @param {Hash} options
  @return {String} HTML string
*/
function unlessHelper(params, hash, options, env) {
  Ember.assert("You must pass exactly one argument to the unless helper", params.length === 1);
  Ember.assert("You must pass a block to the unless helper", !!options.render);

  var fn = options.render;
  var inverse = options.inverse || function(){ return ''; };
  var helperName = 'unless';

  options.render = inverse;
  options.inverse = fn;

  options.helperName = options.helperName || helperName;

  if (env.data.isUnbound) {
    return env.helpers.unboundIf.helperFunction.call(this, params, hash, options, env);
  } else {
    return env.helpers.boundIf.helperFunction.call(this, params, hash, options, env);
  }
}

export {
  ifHelper,
  boundIfHelper,
  unboundIfHelper,
  unlessHelper
};
