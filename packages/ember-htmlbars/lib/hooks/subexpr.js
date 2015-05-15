/**
@module ember
@submodule ember-htmlbars
*/

import lookupHelper from "ember-htmlbars/system/lookup-helper";
import merge from "ember-metal/merge";
import Stream from "ember-metal/streams/stream";
import create from "ember-metal/platform/create";
import {
  labelsFor,
  labelFor
} from "ember-metal/streams/utils";

export default function subexpr(env, scope, helperName, params, hash) {
  // TODO: Keywords and helper invocation should be integrated into
  // the subexpr hook upstream in HTMLBars.
  var keyword = env.hooks.keywords[helperName];
  if (keyword) {
    return keyword(null, env, scope, params, hash, null, null);
  }

  var helper = lookupHelper(helperName, scope.self, env);
  var invoker = function(params, hash) {
    return env.hooks.invokeHelper(null, env, scope, null, params, hash, helper, { template: {}, inverse: {} }, undefined).value;
  };

  //Ember.assert("A helper named '"+helperName+"' could not be found", typeof helper === 'function');

  var label = labelForSubexpr(params, hash, helperName);
  return new SubexprStream(params, hash, invoker, label);
}

function labelForSubexpr(params, hash, helperName) {
  return function() {
    var paramsLabels = labelsForParams(params);
    var hashLabels = labelsForHash(hash);
    var label = `(${helperName}`;
    if (paramsLabels) { label += ` ${paramsLabels}`; }
    if (hashLabels) { label += ` ${hashLabels}`; }
    return `${label})`;
  };
}

function labelsForParams(params) {
  return labelsFor(params).join(" ");
}

function labelsForHash(hash) {
  var out = [];

  for (var prop in hash) {
    out.push(`${prop}=${labelFor(hash[prop])}`);
  }

  return out.join(" ");
}

function SubexprStream(params, hash, helper, label) {
  this.init(label);
  this.params = params;
  this.hash = hash;
  this.helper = helper;

  for (var i = 0, l = params.length; i < l; i++) {
    this.addDependency(params[i]);
  }

  for (var key in hash) {
    this.addDependency(hash[key]);
  }
}

SubexprStream.prototype = create(Stream.prototype);

merge(SubexprStream.prototype, {
  compute() {
    return this.helper(this.params, this.hash);
  }
});
