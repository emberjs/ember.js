/**
@module ember
@submodule ember-htmlbars
*/

import Ember from "ember-metal/core"; // Ember.assert
import shouldDisplay from "ember-views/streams/should_display";

/**
  @method if
  @for Ember.Handlebars.helpers
*/
function ifHelper(params, hash, options) {
  return ifUnless(params, hash, options, shouldDisplay(params[0]));
}

/**
  @method unless
  @for Ember.Handlebars.helpers
*/
function unlessHelper(params, hash, options) {
  return ifUnless(params, hash, options, !shouldDisplay(params[0]));
}

function ifUnless(params, hash, options, truthy) {
  Ember.assert(
    "The block form of the `if` and `unless` helpers expect exactly one " +
    "argument, e.g. `{{#if newMessages}} You have new messages. {{/if}}.`",
    !options.template.yield || params.length === 1
  );

  Ember.assert(
    "The inline form of the `if` and `unless` helpers expect two or " +
    "three arguments, e.g. `{{if trialExpired 'Expired' expiryDate}}` " +
    "or `{{unless isFirstLogin 'Welcome back!'}}`.",
    !!options.template.yield || params.length === 2 || params.length === 3
  );

  if (truthy) {
    if (options.template.yield) {
      options.template.yield();
    } else {
      return params[1];
    }
  } else {
    if (options.inverse.yield) {
      options.inverse.yield();
    } else {
      return params[2];
    }
  }
}

export {
  ifHelper,
  unlessHelper
};
