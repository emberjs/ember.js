import merge from "ember-metal/merge";
import Stream from "ember-metal/streams/stream";
import { create } from "ember-metal/platform";
import { read } from "ember-metal/streams/utils";

function SimpleStream(source) {
  this.init();
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

  _super$destroy: Stream.prototype.destroy,

  destroy: function() {
    if (this._super$destroy()) {
      if (this.source && this.source.isStream) {
        this.source.unsubscribe(this._didChange, this);
      }
      this.source = undefined;
      return true;
    }
  }
});

export default SimpleStream;
