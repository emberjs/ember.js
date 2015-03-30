import merge from "ember-metal/merge";
import Stream from "ember-metal/streams/stream";
import create from "ember-metal/platform/create";
import { read, isStream } from "ember-metal/streams/utils";

function SimpleStream(source, label) {
  this.init(label);
  this.source = source;
  this.dependency = this.addDependency(this.source);
}

SimpleStream.prototype = create(Stream.prototype);

merge(SimpleStream.prototype, {
  compute() {
    return read(this.source);
  },

  setValue(value) {
    var source = this.source;

    if (isStream(source)) {
      source.setValue(value);
    }
  },

  setSource(nextSource) {
    var prevSource = this.source;
    if (nextSource !== prevSource) {
      this.replaceDependency(nextSource);
      this.source = nextSource;
      this.notify();
    }
  },

  replaceDependency(nextSource) {
    if (this.dependency) {
      this.dependency = this.dependency.replace(nextSource);
    } else {
      this.dependency = this.addDependency(nextSource);
    }
  },

  _super$destroy: Stream.prototype.destroy,

  destroy() {
    if (this._super$destroy()) {
      this.source = undefined;
      return true;
    }
  }
});

export default SimpleStream;
