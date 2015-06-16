import Stream from 'ember-metal/streams/stream';
import merge from 'ember-metal/merge';

export default function CompatHelperStream(helper, params, hash, templates, env, scope, label) {
  this.init(label);
  this.helper = helper.helperFunction;
  this.params = params;
  this.templates = templates;
  this.env = env;
  this.scope = scope;
  this.hash = hash;
}

CompatHelperStream.prototype = Object.create(Stream.prototype);

merge(CompatHelperStream.prototype, {
  compute() {
    // Using call and undefined is probably not needed, these are only internal
    return this.helper.call(undefined, this.params, this.hash, this.templates, this.env, this.scope);
  }
});
