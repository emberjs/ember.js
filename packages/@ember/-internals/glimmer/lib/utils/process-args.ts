import { symbol } from '@ember/-internals/utils';
import { MUTABLE_CELL } from '@ember/-internals/views';
import { CapturedNamedArguments } from '@glimmer/interfaces';
import { isUpdatableRef, updateRef, valueForRef } from '@glimmer/reference';
import { ARGS } from '../component';
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
    let value = valueForRef(ref);

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

const REF = symbol('REF');

class MutableCell {
  public value: any;
  constructor(ref: any, value: any) {
    this[MUTABLE_CELL] = true;
    this[REF] = ref;
    this.value = value;
  }

  update(val: any) {
    updateRef(this[REF], val);
  }
}
