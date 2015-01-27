import Ember from 'ember-metal/core';

import merge from "ember-metal/merge";
import create from 'ember-metal/platform/create';
import { isGlobal } from "ember-metal/path_cache";
import Stream from "ember-metal/streams/stream";
import SimpleStream from "ember-metal/streams/simple";

function ContextStream(view) {
  Ember.assert("ContextStream error: the argument is not a view", view && view.isView);

  this.init();
  this.view = view;
}

ContextStream.prototype = create(Stream.prototype);

merge(ContextStream.prototype, {
  value: function() {},

  _makeChildStream: function(key, _fullPath) {
    var stream;

    if (key === '' || key === 'this') {
      stream = this.view._baseContext;
    } else if (isGlobal(key) && Ember.lookup[key]) {
      Ember.deprecate("Global lookup of " + _fullPath + " from a Handlebars template is deprecated.");
      stream = new SimpleStream(Ember.lookup[key]);
      stream._isGlobal = true;
    } else if (key in this.view._keywords) {
      stream = new SimpleStream(this.view._keywords[key]);
    } else {
      stream = new SimpleStream(this.view._baseContext.get(key));
    }

    stream._isRoot = true;

    if (key === 'controller') {
      stream._isController = true;
    }

    return stream;
  }
});

export default ContextStream;
