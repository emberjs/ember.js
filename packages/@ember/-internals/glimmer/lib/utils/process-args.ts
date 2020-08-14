import { symbol } from '@ember/-internals/utils';
import { MUTABLE_CELL } from '@ember/-internals/views';
import { CapturedNamedArguments } from '@glimmer/interfaces';
import { UPDATE_REFERENCED_VALUE } from '@glimmer/reference';
import { ARGS } from '../component';
import { ACTION } from '../helpers/action';

// ComponentArgs takes EvaluatedNamedArgs and converts them into the
// inputs needed by CurlyComponents (attrs and props, with mutable
// cells, etc).
export function processComponentArgs(namedArgs: CapturedNamedArguments) {
  let attrs = Object.create(null);
  let props = Object.create(null);
  let args = Object.create(null);

  props[ARGS] = args;

  for (let name in namedArgs) {
    let ref = namedArgs[name];
    let value = ref.value();

    let isAction = typeof value === 'function' && value[ACTION];

    if (ref[UPDATE_REFERENCED_VALUE] && !isAction) {
      attrs[name] = new MutableCell(ref, value);
    } else {
      attrs[name] = value;
    }

    args[name] = ref;
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
    this[REF][UPDATE_REFERENCED_VALUE](val);
  }
}
