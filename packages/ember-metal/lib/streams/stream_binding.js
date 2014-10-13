import { create } from "ember-metal/platform";
import merge from "ember-metal/merge";
import run from "ember-metal/run_loop";
import Stream from "ember-metal/streams/stream";

function StreamBinding(stream) {
  Ember.assert("StreamBinding error: tried to bind to object that is not a stream", stream && stream.isStream);

  this.stream = stream;
  this.senderCallback = undefined;
  this.senderContext = undefined;
  this.senderValue = undefined;
  this.destroyed = false;

  stream.subscribe(this._onNotify, this);
}

StreamBinding.prototype = create(Stream.prototype);

merge(StreamBinding.prototype, {
  valueFn: function() {
    return this.stream.value();
  },

  _onNotify: function() {
    this._scheduleSync(undefined, undefined, this);
  },

  setValue: function(value, callback, context) {
    this._scheduleSync(value, callback, context);
  },

  _scheduleSync: function(value, callback, context) {
    if (this.senderCallback === undefined && this.senderContext === undefined) {
      this.senderCallback = callback;
      this.senderContext = context;
      this.senderValue = value;
      run.schedule('sync', this, this._sync);
    } else if (this.senderContext !== this) {
      this.senderCallback = callback;
      this.senderContext = context;
      this.senderValue = value;
    }
  },

  _sync: function() {
    if (this.destroyed) {
      return;
    }

    if (this.senderContext !== this) {
      this.stream.setValue(this.senderValue);
    }

    var senderCallback = this.senderCallback;
    var senderContext = this.senderContext;
    this.senderCallback = undefined;
    this.senderContext = undefined;
    this.senderValue = undefined;

    this.notify(senderCallback, senderContext);
  },

  destroy: function() {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.stream.unsubscribe(this._onNotify, this);
  }
});

export default StreamBinding;
