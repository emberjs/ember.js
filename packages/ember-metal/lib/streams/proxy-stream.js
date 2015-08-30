import merge from 'ember-metal/merge';
import Stream from 'ember-metal/streams/stream';
import EmberObject from 'ember-runtime/system/object';

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
    let didChange = this.sourceDep.replace(source);
    if (didChange || !(source instanceof EmberObject)) {
      // If the source changed, we must notify. If the source is not
      // an Ember.Object, we must also notify, because it could have
      // interior mutability that is otherwise not being observed.
      this.notify();
    }
  }
});

export default ProxyStream;
