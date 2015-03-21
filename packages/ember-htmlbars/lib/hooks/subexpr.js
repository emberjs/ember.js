/**
@module ember
@submodule ember-htmlbars
*/

import lookupHelper from "ember-htmlbars/system/lookup-helper";
import merge from "ember-metal/merge";
import Stream from "ember-metal/streams/stream";
import create from "ember-metal/platform/create";
import { subscribe, addDependency, read, labelsFor, labelFor } from "ember-metal/streams/utils";

export default function subexpr(env, scope, helperName, params, hash) {
  var helper = lookupHelper(helperName, scope.self, env);
  var invoker = function(params, hash) {
    return env.hooks.invokeHelper(null, env, scope, null, params, hash, helper, { template: {}, inverse: {} }, undefined).value;
  };

  //Ember.assert("A helper named '"+helperName+"' could not be found", typeof helper === 'function');

  var label = labelForSubexpr(params, hash, helperName);
  return new SubexprStream(params, hash, invoker, label);
}

function SubexprStream(params, hash, helper, label) {
  this.init(label);
  this.source = { params: params, hash: hash };
  this.helper = helper;
  this.subscribed = false;
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

SubexprStream.prototype = create(Stream.prototype);

merge(SubexprStream.prototype, {
  compute() {
    var sourceParams = this.source.params;
    var sourceHash = this.source.hash;

    var params = new Array(sourceParams.length);
    var hash = {};

    for (var i=0, l=sourceParams.length; i<l; i++) {
      params[i] = read(sourceParams[i]);
    }

    for (var prop in hash) {
      hash[prop] = read(sourceHash[prop]);
    }

    return this.helper(params, hash);
  },

  _super$subscribe: Stream.prototype.subscribe,

  subscribe() {
    if (!this.subscribed) {
      var sourceParams = this.source.params;
      var sourceHash = this.source.hash;

      for (var i=0, l=sourceParams.length; i<l; i++) {
        addDependency(this, subscribe(sourceParams[i], this._didChange, this));
      }

      for (var prop in sourceHash) {
        addDependency(subscribe(sourceHash[prop], this._didChange, this));
      }

      this.subscribed = true;
    }

    return this._super$subscribe.apply(this, arguments);
  },

  _didChange() {
    this.notify();
  },

  _super$destroy: Stream.prototype.destroy,

  destroy(prune) {
    if (this._super$destroy(prune)) {
      this.source = undefined;
      return true;
    }
  }
});
