import type { CapturedNamedArguments } from '@glimmer/interfaces';
import { valueForRef } from '@glimmer/reference';
import { assert } from '@ember/debug';
import { ARGS } from '../component-managers/curly';

// ComponentArgs takes EvaluatedNamedArgs and converts them into the
// inputs needed by CurlyComponents (attrs and props, with mutable
// cells, etc).
export function processComponentArgs(namedArgs: CapturedNamedArguments) {
  let props = Object.create(null);

  props[ARGS] = namedArgs;

  for (let name in namedArgs) {
    let ref = namedArgs[name];
    assert('expected ref', ref);
    let value = valueForRef(ref);

    props[name] = value;
  }

  return props;
}
