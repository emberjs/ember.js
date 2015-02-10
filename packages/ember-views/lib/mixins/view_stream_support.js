import { Mixin } from "ember-metal/mixin";
import StreamBinding from "ember-metal/streams/stream_binding";
import KeyStream from "ember-views/streams/key_stream";
import ContextStream from "ember-views/streams/context_stream";
import create from 'ember-metal/platform/create';
import { isStream } from "ember-metal/streams/utils";

var ViewStreamSupport = Mixin.create({
  init: function() {
    this._baseContext = undefined;
    this._contextStream = undefined;
    this._streamBindings = undefined;
    this._super.apply(this, arguments);
  },

  getStream: function(path) {
    var stream = this._getContextStream().get(path);

    stream._label = path;

    return stream;
  },

  _willDestroyElement: function() {
    if (this._streamBindings) {
      this._destroyStreamBindings();
    }
    if (this._contextStream) {
      this._destroyContextStream();
    }
  },

  _getBindingForStream: function(pathOrStream) {
    if (this._streamBindings === undefined) {
      this._streamBindings = create(null);
    }

    var path = pathOrStream;
    if (isStream(pathOrStream)) {
      path = pathOrStream._label;

      if (!path) {
        // if no _label is present on the provided stream
        // it is likely a subexpr and cannot be set (so it
        // does not need a StreamBinding)
        return pathOrStream;
      }
    }

    if (this._streamBindings[path] !== undefined) {
      return this._streamBindings[path];
    } else {
      var stream = this._getContextStream().get(path);
      var streamBinding = new StreamBinding(stream);

      streamBinding._label = path;

      return this._streamBindings[path] = streamBinding;
    }
  },

  _destroyStreamBindings: function() {
    var streamBindings = this._streamBindings;
    for (var path in streamBindings) {
      streamBindings[path].destroy();
    }
    this._streamBindings = undefined;
  },

  _getContextStream: function() {
    if (this._contextStream === undefined) {
      this._baseContext = new KeyStream(this, 'context');
      this._contextStream = new ContextStream(this);
    }

    return this._contextStream;
  },

  _destroyContextStream: function() {
    this._baseContext.destroy();
    this._baseContext = undefined;
    this._contextStream.destroy();
    this._contextStream = undefined;
  },

  _unsubscribeFromStreamBindings: function() {
    for (var key in this._streamBindingSubscriptions) {
      var streamBinding = this[key + 'Binding'];
      var callback = this._streamBindingSubscriptions[key];
      streamBinding.unsubscribe(callback);
    }
  }
});

export default ViewStreamSupport;
