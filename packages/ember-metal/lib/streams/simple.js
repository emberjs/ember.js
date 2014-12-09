import merge from "ember-metal/merge";
import Stream from "ember-metal/streams/stream";
import { create } from "ember-metal/platform";
import { read } from "ember-metal/streams/read";

function SimpleStream(source) {
  this.source = source;

  if (source && source.isStream) {
    source.subscribe(this._didChange, this);
  }
}

SimpleStream.prototype = create(Stream.prototype);

merge(SimpleStream.prototype, {
  valueFn: function() {
    return read(this.source);
  },

  setValue: function(value) {
    var source = this.source;

    if (source && source.isStream) {
      source.setValue(value);
    }
  },

  setSource: function(nextSource) {
    var prevSource = this.source;
    if (nextSource !== prevSource) {
      if (prevSource && prevSource.isStream) {
        prevSource.unsubscribe(this._didChange, this);
      }

      if (nextSource && nextSource.isStream) {
        nextSource.subscribe(this._didChange, this);
      }

      this.source = nextSource;
      this.notify();
    }
  },

  _didChange: function() {
    this.notify();
  },

  destroy: function() {
    if (this.source && this.source.isStream) {
      this.source.unsubscribe(this._didChange, this);
    }

    this.source = undefined;
    Stream.prototype.destroy.call(this);
  }
});

export default SimpleStream;
