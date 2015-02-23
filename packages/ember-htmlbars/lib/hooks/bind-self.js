/**
@module ember
@submodule ember-htmlbars
*/

import SimpleStream from "ember-metal/streams/simple";
import { componentSymbol } from "ember-htmlbars/hooks/component";

export default function bindSelf(scope, self) {
  var component = self[componentSymbol];

  if (component) {
    scope.self = self;
    scope.component = component;
    scope.view = scope.locals.view = new SimpleStream(component);
    self[componentSymbol] = undefined;
    self.attrs = new AttrStream(self.attrs);
    return;
  }

  var selfStream = scope.self = new SimpleStream(self);

  if (self.isView) {
    scope.locals.view = selfStream;
    scope.view = selfStream;
    scope.self = selfStream.getKey('context');
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
