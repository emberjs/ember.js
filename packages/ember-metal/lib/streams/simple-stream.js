import merge from "ember-metal/merge";
import Stream from "ember-metal/streams/stream";
import create from "ember-metal/platform/create";

function SimpleStream(source, label) {
  this.init(label);
  this.sourceDep = this.addDependency(source);
}

SimpleStream.prototype = create(Stream.prototype);

merge(SimpleStream.prototype, {
  compute() {
    return this.sourceDep.getValue();
  },

  setValue(value) {
    this.sourceDep.setValue(value);
  },

  setSource(source) {
    this.sourceDep.replace(source);
    this.notify();
  }
});

export default SimpleStream;
