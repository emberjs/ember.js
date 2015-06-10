import Stream from "ember-metal/streams/stream";
import create from "ember-metal/platform/create";
import merge from "ember-metal/merge";
import {
  getArrayValues,
  getHashValues
} from "ember-htmlbars/streams/utils";

export default function BuiltInHelperStream(helper, params, hash, templates, env, scope, context, label) {
  this.init(label);
  this.helper = helper;
  this.params = params;
  this.templates = templates;
  this.env = env;
  this.scope = scope;
  this.hash = hash;
  this.context = context;
}

BuiltInHelperStream.prototype = create(Stream.prototype);

merge(BuiltInHelperStream.prototype, {
  compute() {
    // Using call and undefined is probably not needed, these are only internal
    return this.helper.call(this.context, getArrayValues(this.params), getHashValues(this.hash), this.templates, this.env, this.scope);
  }
});
