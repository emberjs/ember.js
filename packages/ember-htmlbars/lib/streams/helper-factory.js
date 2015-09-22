import BasicStream from 'ember-metal/streams/stream';
import {
  getArrayValues,
  getHashValues
} from 'ember-htmlbars/streams/utils';

let HelperFactoryStream = BasicStream.extend({
  init(helperFactory, params, hash, label) {
    this.helperFactory = helperFactory;
    this.params = params;
    this.hash = hash;
    this.linkable = true;
    this.helper = null;
    this.label = label;
  },

  compute() {
    if (!this.helper) {
      this.helper = this.helperFactory.create({ _stream: this });
    }
    return this.helper.compute(getArrayValues(this.params), getHashValues(this.hash));
  },

  deactivate() {
    this.super$deactivate();
    if (this.helper) {
      this.helper.destroy();
      this.helper = null;
    }
  },
  super$deactivate: BasicStream.prototype.deactivate
});

export default HelperFactoryStream;
