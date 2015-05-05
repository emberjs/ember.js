import create from "ember-metal/platform/create";
import merge from "ember-metal/merge";
import { symbol } from "ember-metal/utils";
import ProxyStream from "ember-metal/streams/proxy-stream";
import { MUTABLE_CELL } from "ember-views/compat/attrs-proxy";

export let MUTABLE_REFERENCE = symbol("MUTABLE_REFERENCE");

export default function mut(morph, env, scope, originalParams, hash, template, inverse) {
  // If `morph` is `null` the keyword is being invoked as a subexpression.
  if (morph === null) {
    var valueStream = originalParams[0];
    return mutParam(env.hooks.getValue, valueStream);
  }

  return true;
}

export function privateMut(morph, env, scope, originalParams, hash, template, inverse) {
  // If `morph` is `null` the keyword is being invoked as a subexpression.
  if (morph === null) {
    var valueStream = originalParams[0];
    return mutParam(env.hooks.getValue, valueStream, true);
  }

  return true;
}

function mutParam(read, stream, internal) {
  if (stream[MUTABLE_REFERENCE]) {
    return stream;
  }

  Ember.assert("You can only pass a path to mut", internal || typeof stream.setValue === 'function');

  return new MutStream(stream);
}

function MutStream(stream) {
  this.init(`(mut ${stream.label})`);
  this.path = stream.path;
  this.sourceDep = this.addMutableDependency(stream);
  this[MUTABLE_REFERENCE] = true;
}

MutStream.prototype = create(ProxyStream.prototype);

merge(MutStream.prototype, {
  cell() {
    let source = this;

    let val = {
      value: source.value(),
      update(val) {
        source.sourceDep.setValue(val);
      }
    };

    val[MUTABLE_CELL] = true;
    return val;
  }
});
