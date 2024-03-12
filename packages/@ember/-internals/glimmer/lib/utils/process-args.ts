import { MUTABLE_CELL } from '@ember/-internals/views';
import type { CapturedNamedArguments } from '@glimmer/interfaces';
import type { Reactive } from '@glimmer/reference';
import { isUpdatableRef, updateRef, unwrapReactive } from '@glimmer/reference';
import { assert } from '@ember/debug';
import { ARGS } from '../component-managers/curly';
import { ACTIONS } from '../helpers/action';

// ComponentArgs takes EvaluatedNamedArgs and converts them into the
// inputs needed by CurlyComponents (attrs and props, with mutable
// cells, etc).
export function processComponentArgs(namedArgs: CapturedNamedArguments) {
  let attrs = Object.create(null);
  let props = Object.create(null);

  props[ARGS] = namedArgs;

  for (let name in namedArgs) {
    let ref = namedArgs[name];
    assert('expected ref', ref);
    let value = unwrapReactive(ref);

    let isAction = typeof value === 'function' && ACTIONS.has(value);

    if (isUpdatableRef(ref) && !isAction) {
      attrs[name] = new MutableCell(ref, value);
    } else {
      attrs[name] = value;
    }

    props[name] = value;
  }

  props.attrs = attrs;

  return props;
}

const REF = Symbol('REF');

class MutableCell {
  public value: any;
  [MUTABLE_CELL]: boolean;
  [REF]: Reactive<unknown>;

  constructor(ref: Reactive<unknown>, value: any) {
    this[MUTABLE_CELL] = true;
    this[REF] = ref;
    this.value = value;
  }

  update(val: any) {
    updateRef(this[REF], val);
  }
}
