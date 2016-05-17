import BasicStream from './stream';
import {
  getArrayValues,
  getHashValues
} from './utils';

let HelperInstanceStream = BasicStream.extend({
  init(helper, params, hash, label) {
    this.helper = helper;
    this.params = params;
    this.hash = hash;
    this.linkable = true;
    this.label = label;
  },

  compute() {
    return this.helper.compute(getArrayValues(this.params), getHashValues(this.hash));
  }
});

export default HelperInstanceStream;
