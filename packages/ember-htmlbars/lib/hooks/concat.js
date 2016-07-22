/**
@module ember
@submodule ember-htmlbars
*/

import streamConcat from '../streams/concat';

export default function concat(env, parts) {
  return streamConcat(parts, '');
}
