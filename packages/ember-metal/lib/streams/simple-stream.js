import merge from "ember-metal/merge";
import Stream from "ember-metal/streams/stream";
import create from "ember-metal/platform/create";
import { read, setValue } from "ember-metal/streams/utils";

function SimpleStream(source, label) {
  this.init(label);
  this.source = this.addDependency(source);
}

SimpleStream.prototype = create(Stream.prototype);

merge(SimpleStream.prototype, {
  compute() {
    return read(this.source);
  },

  setValue(value) {
    setValue(this.source, value);
  },

  setSource(source) {
    this.source.replace(source);
    this.notify();
  }
});

export default SimpleStream;
