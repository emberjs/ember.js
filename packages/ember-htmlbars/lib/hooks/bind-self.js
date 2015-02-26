/**
@module ember
@submodule ember-htmlbars
*/

import SimpleStream from "ember-metal/streams/simple";
import { readHash } from "ember-metal/streams/utils";
import { get } from "ember-metal/property_get";
import subscribe from "ember-htmlbars/utils/subscribe";

export default function bindSelf(scope, self) {
  Ember.assert("BUG: scope.attrs and self.isView should not both be true", !(scope.attrs && self.isView));

  if (scope.attrs) {
    updateScope(scope, 'attrsStream', readHash(scope.attrs), scope.renderNode);
    updateScope(scope.locals, 'view', scope.view, null);
  } else if (self.isView) {
    scope.view = self;
    updateScope(scope.locals, 'view', self, null);
    updateScope(scope, 'self', get(self, 'context'), null);
    return;
  } else if (scope.view) {
    updateScope(scope.locals, 'view', scope.view, null);
  }

  updateScope(scope, 'self', self, null);
}

function updateScope(scope, key, newValue, renderNode) {
  var existing = scope[key];

  if (existing) {
    existing.setSource(newValue);
  } else {
    var stream = new SimpleStream(newValue);
    if (renderNode) { subscribe(renderNode, scope, stream); }
    scope[key] = stream;
  }
}

import merge from "ember-metal/merge";
import create from "ember-metal/platform/create";
import Stream from "ember-metal/streams/stream";

function AttrStream(attrs) {
  this.init();
  this.attrs = attrs;
}

AttrStream.prototype = create(Stream.prototype);

merge(AttrStream.prototype, {
  valueFn: function() {
    return this.attrs;
  },

  snapshot: function(env) {
    var snapshot = {};
    var attrs = this.attrs;

    for (var prop in attrs) {
      snapshot[prop] = env.hooks.getValue(attrs[prop]);
    }

    return snapshot;
  },

  setAttrs: function(attrs) {
    var prevAttrs = this.attrs;
    if (attrs !== prevAttrs) {
      this.attrs = attrs;
      this.notify();
    }
  },

  getKey: function(key) {
    return this.attrs[key];
  }
});
