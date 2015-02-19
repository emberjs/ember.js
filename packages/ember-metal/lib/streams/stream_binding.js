import create from "ember-metal/platform/create";
import merge from "ember-metal/merge";
import run from "ember-metal/run_loop";
import Stream from "ember-metal/streams/stream";

function StreamBinding(stream) {
  Ember.assert("StreamBinding error: tried to bind to object that is not a stream", stream && stream.isStream);

  this.init();
  this.stream = stream;
  this.senderCallback = undefined;
  this.senderContext = undefined;
  this.senderValue = undefined;

  this.addDependency(stream, this._onNotify, this);
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
    if (this.state === 'destroyed') {
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

    // Force StreamBindings to always notify
    this.state = 'clean';

    this.notifyExcept(senderCallback, senderContext);
  }
});

export default StreamBinding;
