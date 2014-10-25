/**
@module ember
@submodule ember-handlebars
*/

import Ember from "ember-metal/core"; // Ember.assert
import EmberHandlebars from "ember-handlebars-compiler";

import { bind } from "ember-handlebars/helpers/binding";

import { get } from "ember-metal/property_get";
import { isArray } from "ember-metal/utils";

var helpers = EmberHandlebars.helpers;

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
function boundIfHelper(property, fn) {
  var context = (fn.contexts && fn.contexts.length) ? fn.contexts[0] : this;

  fn.helperName = fn.helperName || 'boundIf';

  return bind.call(context, property, fn, true, shouldDisplayIfHelperContent, shouldDisplayIfHelperContent, [
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
function unboundIfHelper(property, fn) {
  var context = (fn.contexts && fn.contexts.length) ? fn.contexts[0] : this;
  var data = fn.data;
  var view = data.view;
  var template = fn.fn;
  var inverse = fn.inverse;

  var propertyValue = view.getStream(property).value();

  if (!shouldDisplayIfHelperContent(propertyValue)) {
    template = inverse;
  }

  template(context, { data: data });
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
function ifHelper(context, options) {
  Ember.assert("You must pass exactly one argument to the if helper", arguments.length === 2);
  Ember.assert("You must pass a block to the if helper", options.fn && options.fn !== Handlebars.VM.noop);

  options.helperName = options.helperName || ('if ' + context);

  if (options.data.isUnbound) {
    return helpers.unboundIf.call(options.contexts[0], context, options);
  } else {
    return helpers.boundIf.call(options.contexts[0], context, options);
  }
}

/**
  @method unless
  @for Ember.Handlebars.helpers
  @param {Function} context
  @param {Hash} options
  @return {String} HTML string
*/
function unlessHelper(context, options) {
  Ember.assert("You must pass exactly one argument to the unless helper", arguments.length === 2);
  Ember.assert("You must pass a block to the unless helper", options.fn && options.fn !== Handlebars.VM.noop);

  var fn = options.fn;
  var inverse = options.inverse;
  var helperName = 'unless';

  if (context) {
    helperName += ' ' + context;
  }

  options.fn = inverse;
  options.inverse = fn;

  options.helperName = options.helperName || helperName;

  if (options.data.isUnbound) {
    return helpers.unboundIf.call(options.contexts[0], context, options);
  } else {
    return helpers.boundIf.call(options.contexts[0], context, options);
  }
}

export {
  ifHelper,
  boundIfHelper,
  unboundIfHelper,
  unlessHelper
};
