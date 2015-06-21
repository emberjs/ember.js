import merge from 'ember-metal/merge';
import Stream from 'ember-metal/streams/stream';

function ProxyStream(source, label) {
  this.init(label);
  this.sourceDep = this.addMutableDependency(source);
}

ProxyStream.prototype = Object.create(Stream.prototype);

merge(ProxyStream.prototype, {
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

export default ProxyStream;
