/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.assert
import conditional from "ember-metal/streams/conditional";
import shouldDisplay from "ember-views/streams/should_display";
import { read } from "ember-metal/streams/utils";
import { get } from "ember-metal/property_get";
import { isStream } from "ember-metal/streams/utils";
import BoundIfView from "ember-views/views/bound_if_view";
import emptyTemplate from "ember-htmlbars/templates/empty";


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
  var property = params[0];
  var stream = isStream(property) ? property : this.getStream(property);

  var viewOptions = {
    _morph: options.morph,
    _context: get(this, 'context'),
    conditionStream: shouldDisplay(stream),
    truthyTemplate: options.template,
    falsyTemplate: options.inverse,
    helperName: options.helperName
  };

  this.appendChild(BoundIfView, viewOptions);
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
  var template = options.template;
  var value = params[0];

  if (!read(shouldDisplay(value))) {
    template = options.inverse;
  }

  return template.render(this, env, options.morph.contextualElement);
}

function _inlineIfAssertion(params) {
  Ember.assert("If helper in inline form expects between two and three arguments", params.length === 2 || params.length === 3);
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
  Ember.assert("If helper in block form expect exactly one argument", !options.template || params.length === 1);
  if (Ember.FEATURES.isEnabled('ember-htmlbars-inline-if-helper')) {
    if (!options.template) {
      _inlineIfAssertion(params);
      var condition = params[0];
      var truthy = params[1];
      var falsy = params[2];
      return conditional(shouldDisplay(condition), truthy, falsy);
    }
  }

  options.inverse = options.inverse || emptyTemplate;

  options.helperName = options.helperName || ('if ');

  if (env.data.isUnbound) {
    env.data.isUnbound = false;
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
  Ember.assert("You must pass a block to the unless helper", !!options.template);

  var template = options.template;
  var inverse = options.inverse || emptyTemplate;
  var helperName = 'unless';

  options.template = inverse;
  options.inverse = template;

  options.helperName = options.helperName || helperName;

  if (env.data.isUnbound) {
    env.data.isUnbound = false;
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
