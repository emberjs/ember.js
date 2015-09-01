import { assert } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import {
  addObserver,
  removeObserver
} from 'ember-metal/observer';
import BasicStream from 'ember-metal/streams/stream';
import { isStream  } from 'ember-metal/streams/utils';

let KeyStream = BasicStream.extend({
  init(source, key) {
    assert('KeyStream error: source must be a stream', isStream(source)); // TODO: This isn't necessary.
    assert('KeyStream error: key must be a non-empty string', typeof key === 'string' && key.length > 0);
    assert('KeyStream error: key must not have a \'.\'', key.indexOf('.') === -1);

    var label = labelFor(source, key);

    this.path = label;
    this.observedObject = null;
    this.key = key;
    this.sourceDep = this.addMutableDependency(source);
    this.label = label;
  },

  compute() {
    var object = this.sourceDep.getValue();
    if (object) {
      return get(object, this.key);
    }
  },

  setValue(value) {
    var object = this.sourceDep.getValue();
    if (object) {
      set(object, this.key, value);
    }
  },

  setSource(source) {
    this.sourceDep.replace(source);
    this.notify();
  },

  _super$revalidate: BasicStream.prototype.revalidate,

  revalidate(value) {
    this._super$revalidate(value);

    var object = this.sourceDep.getValue();
    if (object !== this.observedObject) {
      this._clearObservedObject();

      if (object && typeof object === 'object') {
        addObserver(object, this.key, this, this.notify);
        this.observedObject = object;
      }
    }
  },

  _super$deactivate: BasicStream.prototype.deactivate,

  _clearObservedObject() {
    if (this.observedObject) {
      removeObserver(this.observedObject, this.key, this, this.notify);
      this.observedObject = null;
    }
  },

  deactivate() {
    this._super$deactivate();
    this._clearObservedObject();
  }
});

function labelFor(source, key) {
  return source.label ? source.label + '.' + key : key;
}

export default KeyStream;
