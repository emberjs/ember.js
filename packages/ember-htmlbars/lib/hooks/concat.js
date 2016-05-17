/**
@module ember
@submodule ember-htmlbars
*/

import {
  concat as streamConcat
} from '../streams/utils';

export default function concat(env, parts) {
  return streamConcat(parts, '');
}
