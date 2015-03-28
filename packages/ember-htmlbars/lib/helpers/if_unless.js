/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.assert
import conditional from "ember-metal/streams/conditional";
import shouldDisplay from "ember-views/streams/should_display";
import { get } from "ember-metal/property_get";
import { isStream } from "ember-metal/streams/utils";
import BoundIfView from "ember-views/views/bound_if_view";
import emptyTemplate from "ember-htmlbars/templates/empty";

/**
  @method if
  @for Ember.Handlebars.helpers
*/
function ifHelper(params, hash, options, env) {
  var helperName = options.helperName || 'if';
  return appendConditional(false, helperName, params, hash, options, env);
}

/**
  @method unless
  @for Ember.Handlebars.helpers
*/
function unlessHelper(params, hash, options, env) {
  var helperName = options.helperName || 'unless';
  return appendConditional(true, helperName, params, hash, options, env);
}


function assertInlineIfNotEnabled() {
  Ember.assert(
    "To use the inline forms of the `if` and `unless` helpers you must " +
    "enable the `ember-htmlbars-inline-if-helper` feature flag."
  );
}

function appendConditional(inverted, helperName, params, hash, options, env) {
  var view = env.data.view;

  if (options.isBlock) {
    return appendBlockConditional(view, inverted, helperName, params, hash, options, env);
  } else {
    if (Ember.FEATURES.isEnabled('ember-htmlbars-inline-if-helper')) {
      return appendInlineConditional(view, inverted, helperName, params, hash, options, env);
    } else {
      assertInlineIfNotEnabled();
    }
  }
}

function appendBlockConditional(view, inverted, helperName, params, hash, options, env) {
  Ember.assert(
    "The block form of the `if` and `unless` helpers expect exactly one " +
    "argument, e.g. `{{#if newMessages}} You have new messages. {{/if}}.`",
    params.length === 1
  );

  var condition = shouldDisplay(params[0]);
  var truthyTemplate = (inverted ? options.inverse : options.template) || emptyTemplate;
  var falsyTemplate = (inverted ? options.template : options.inverse) || emptyTemplate;

  if (isStream(condition)) {
    view.appendChild(BoundIfView, {
      _morph: options.morph,
      _context: get(view, 'context'),
      conditionStream: condition,
      truthyTemplate: truthyTemplate,
      falsyTemplate: falsyTemplate,
      helperName: helperName
    });
  } else {
    var template = condition ? truthyTemplate : falsyTemplate;
    if (template) {
      return template.render(view, env, options.morph.contextualElement);
    }
  }
}

function appendInlineConditional(view, inverted, helperName, params) {
  Ember.assert(
    "The inline form of the `if` and `unless` helpers expect two or " +
    "three arguments, e.g. `{{if trialExpired 'Expired' expiryDate}}` " +
    "or `{{unless isFirstLogin 'Welcome back!'}}`.",
    params.length === 2 || params.length === 3
  );

  return conditional(
    shouldDisplay(params[0]),
    inverted ? params[2] : params[1],
    inverted ? params[1] : params[2]
  );
}

export {
  ifHelper,
  unlessHelper
};
