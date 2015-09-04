import BasicStream from 'ember-metal/streams/stream';
import {
  getArrayValues,
  getHashValues
} from 'ember-htmlbars/streams/utils';

let BuiltInHelperStream = BasicStream.extend({
  init(helper, params, hash, templates, env, scope, label) {
    this.helper = helper;
    this.params = params;
    this.templates = templates;
    this.env = env;
    this.scope = scope;
    this.hash = hash;
    this.label = label;
  },

  compute() {
    return this.helper(getArrayValues(this.params), getHashValues(this.hash), this.templates, this.env, this.scope);
  }
});

export default BuiltInHelperStream;
