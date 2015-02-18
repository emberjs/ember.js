/**
@module ember
@submodule ember-htmlbars
*/

import lookupHelper from "ember-htmlbars/system/lookup-helper";
import merge from "ember-metal/merge";
import Stream from "ember-metal/streams/stream";
import create from "ember-metal/platform/create";
import { subscribe, unsubscribe, read } from "ember-metal/streams/utils";

export default function subexpr(env, scope, helperName, params, hash) {
  var helper = lookupHelper(helperName, scope.self, env);

  Ember.assert("A helper named '"+helperName+"' could not be found", typeof helper === 'function');

  return new SubexprStream(params, hash, helper);
}

function SubexprStream(params, hash, helper) {
  this.init();
  this.source = { params: params, hash: hash };
  this.helper = helper;
  this.subscribed = false;

}

SubexprStream.prototype = create(Stream.prototype);

merge(SubexprStream.prototype, {
  valueFn: function() {
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

    return this.helper.call(undefined, params, hash, {});
  },

  _super$subscribe: Stream.prototype.subscribe,

  subscribe: function() {
    if (!this.subscribed) {
      var sourceParams = this.source.params;
      var sourceHash = this.source.hash;

      for (var i=0, l=sourceParams.length; i<l; i++) {
        subscribe(sourceParams[i], this._didChange, this);
      }

      for (var prop in sourceHash) {
        subscribe(sourceHash[prop], this._didChange, this);
      }

      this.subscribed = true;
    }

    return this._super$subscribe.apply(this, arguments);
  },

  _didChange: function() {
    this.notify();
  },

  _super$destroy: Stream.prototype.destroy,

  destroy: function() {
    if (this._super$destroy()) {
      if (this.subscribed) {
        var params = this.source.params;
        var hash = this.source.hash;

        for (var i=0, l=params.length; i<l; i++) {
          unsubscribe(params[i], this._didChange, this);
        }

        for (var prop in hash) {
          unsubscribe(hash[prop], this._didChange, this);
        }
      }

      this.source = undefined;
      return true;
    }
  }
});
