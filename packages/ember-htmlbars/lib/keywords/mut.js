import merge from 'ember-metal/merge';
import { symbol } from 'ember-metal/utils';
import ProxyStream from 'ember-metal/streams/proxy-stream';
import { isStream } from 'ember-metal/streams/utils';
import Stream from 'ember-metal/streams/stream';
import { MUTABLE_CELL } from 'ember-views/compat/attrs-proxy';
import { INVOKE, ACTION } from 'ember-routing-htmlbars/keywords/closure-action';

export let MUTABLE_REFERENCE = symbol('MUTABLE_REFERENCE');

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
  if (internal) {
    if (!isStream(stream)) {
      let literal = stream;
      stream = new Stream(function() { return literal; }, `(literal ${literal})`);
      stream.setValue = function(newValue) {
        literal = newValue;
        stream.notify();
      };
    }
  } else {
    Ember.assert('You can only pass a path to mut', isStream(stream));
  }

  if (stream[MUTABLE_REFERENCE]) {
    return stream;
  }

  return new MutStream(stream);
}

function MutStream(stream) {
  this.init(`(mut ${stream.label})`);
  this.path = stream.path;
  this.sourceDep = this.addMutableDependency(stream);
  this[MUTABLE_REFERENCE] = true;
}

MutStream.prototype = Object.create(ProxyStream.prototype);

merge(MutStream.prototype, {
  cell() {
    let source = this;
    let value = source.value();

    if (value && value[ACTION]) {
      return value;
    }

    let val = {
      value,
      update(val) {
        source.setValue(val);
      }
    };

    val[MUTABLE_CELL] = true;
    return val;
  },
  [INVOKE](val) {
    this.setValue(val);
  }
});
