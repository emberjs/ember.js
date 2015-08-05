import Ember from 'ember-metal/core'; // assert

/**
@module ember
@submodule ember-htmlbars
*/

export default function unbound(morph, env, scope, params, hash, template, inverse, visitor) {
  Ember.assert(
    'unbound helper cannot be called with multiple params or hash params',
    params.length === 1 && Object.keys(hash).length === 0
  );
  Ember.assert(
    'unbound helper cannot be called as a block',
    !template
  );

  if (morph === null) {
    return new VolatileStream(params[0]);
  }

  let stream;
  if (morph.linkedResult) {
    stream = morph.linkedResult;
  } else {
    stream = new VolatileStream(params[0]);
    morph.linkedResult = stream;
  }
  env.hooks.range(morph, env, scope, null, stream, visitor);
  return true;
}

import merge from 'ember-metal/merge';
import Stream from 'ember-metal/streams/stream';
import { read } from 'ember-metal/streams/utils';

function VolatileStream(source) {
  this.init(`(volatile ${source.label})`);
  this.source = source;

  this.addDependency(source);
}

VolatileStream.prototype = Object.create(Stream.prototype);

merge(VolatileStream.prototype, {
  value() {
    return read(this.source);
  },

  notify() {}
});
