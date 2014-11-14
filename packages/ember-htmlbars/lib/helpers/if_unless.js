/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.assert
import { bind } from "ember-htmlbars/helpers/binding";

import { get } from "ember-metal/property_get";
import { isArray } from "ember-metal/utils";

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

  if (!shouldDisplayIfHelperContent(params[0].value())) {
    template = options.inverse;
  }

  var result = template(options.context, env, options.morph.contextualElement);
  options.morph.update(result);
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
  Ember.assert("You must pass exactly one argument to the if helper", params.length === 1);
  Ember.assert("You must pass a block to the if helper", !!options.render);

  options.helperName = options.helperName || ('if ');

  options.inverse = options.inverse || function(){ return ''; };

  if (options.isUnbound) {
    return env.helpers.unboundIf.call(this, params, hash, options, env);
  } else {
    return env.helpers.boundIf.call(this, params, hash, options, env);
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

  if (options.isUnbound) {
    return env.helpers.unboundIf.call(this, params, hash, options, env);
  } else {
    return env.helpers.boundIf.call(this, params, hash, options, env);
  }
}

export {
  ifHelper,
  boundIfHelper,
  unboundIfHelper,
  unlessHelper
};
