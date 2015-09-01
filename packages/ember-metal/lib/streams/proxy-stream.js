import EmberObject from 'ember-runtime/system/object';
import BasicStream from 'ember-metal/streams/stream';

let ProxyStream = BasicStream.extend({
  init(source, label) {
    this.label = label;
    this.sourceDep = this.addMutableDependency(source);
  },

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

ProxyStream.extend = BasicStream.extend;

export default ProxyStream;
