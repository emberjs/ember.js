import create from "ember-metal/platform/create";
import merge from "ember-metal/merge";
import ProxyStream from "ember-metal/streams/proxy-stream";

export default function mut(morph, env, scope, originalParams, hash, template, inverse) {
  // If `morph` is `null` the keyword is being invoked as a subexpression.
  if (morph === null) {
    var valueStream = originalParams[0];
    return mutParam(env.hooks.getValue, valueStream);
  }

  return true;
}

export let isMutableBinding = +new Date();

function mutParam(read, stream) {
  if (stream.isMutableBinding === isMutableBinding) {
    return stream;
  }

  Ember.assert("You can only pass a path to mut", typeof stream.setValue === 'function');

  return new MutStream(stream);
}

function MutStream(stream, label) {
  this.init(`(mut ${stream.label})`);
  this.source = this.addMutableDependency(stream);
  this.isMutableBinding = isMutableBinding;
}

MutStream.prototype = create(ProxyStream.prototype);

merge(MutStream.prototype, {
  compute() {
    var source = this.source;

    return {
      value() {
        return source.getValue();
      },

      update(val) {
        source.setValue(val);
      }
    };
  }
});
