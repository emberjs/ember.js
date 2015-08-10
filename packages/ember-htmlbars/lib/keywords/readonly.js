/**
@module ember
@submodule ember-templates
*/

import { MUTABLE_REFERENCE } from 'ember-htmlbars/keywords/mut';

export default function readonly(morph, env, scope, originalParams, hash, template, inverse) {
  // If `morph` is `null` the keyword is being invoked as a subexpression.
  if (morph === null) {
    let stream = originalParams[0];
    if (stream && stream[MUTABLE_REFERENCE]) {
      return stream.sourceDep.dependee;
    }
    return stream;
  }

  return true;
}
