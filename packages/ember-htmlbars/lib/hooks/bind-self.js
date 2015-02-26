/**
@module ember
@submodule ember-htmlbars
*/

import SimpleStream from "ember-metal/streams/simple";
import { readHash } from "ember-metal/streams/utils";
import { selfSymbol, componentSymbol } from "ember-htmlbars/system/symbols";
import { get } from "ember-metal/property_get";
import subscribe from "ember-htmlbars/utils/subscribe";

export default function bindSelf(scope, self) {
  var innerSelf = self[selfSymbol];
  var component = self[componentSymbol];

  if (component) {
    scope.component = component;
    scope.view = component;
    updateScope(scope.locals, 'view', component, component.renderNode);
    updateScope(scope, 'attrs', readHash(innerSelf.attrs), component.renderNode);
  }

  self = innerSelf || self;

  if (self.isView) {
    scope.view = self;
    updateScope(scope.locals, 'view', self, null);
    updateScope(scope, 'self', get(self, 'context'), null);
  } else {
    updateScope(scope, 'self', self, null);
  }
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
