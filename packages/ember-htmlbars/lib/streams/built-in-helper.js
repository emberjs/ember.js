import Stream from 'ember-metal/streams/stream';
import merge from 'ember-metal/merge';
import {
  getArrayValues,
  getHashValues
} from 'ember-htmlbars/streams/utils';

export default function BuiltInHelperStream(helper, params, hash, templates, env, scope, label) {
  this.init(label);
  this.helper = helper;
  this.params = params;
  this.templates = templates;
  this.env = env;
  this.scope = scope;
  this.hash = hash;
}

BuiltInHelperStream.prototype = Object.create(Stream.prototype);

merge(BuiltInHelperStream.prototype, {
  compute() {
    return this.helper(getArrayValues(this.params), getHashValues(this.hash), this.templates, this.env, this.scope);
  }
});
