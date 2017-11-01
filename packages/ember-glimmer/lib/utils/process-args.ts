import { symbol } from 'ember-utils';
import { MUTABLE_CELL } from 'ember-views';
import { CapturedNamedArguments } from '@glimmer/runtime';
import { ARGS } from '../component';
import { ACTION } from '../helpers/action';
import { UPDATE } from './references';

// ComponentArgs takes EvaluatedNamedArgs and converts them into the
// inputs needed by CurlyComponents (attrs and props, with mutable
// cells, etc).
export function processComponentArgs(namedArgs: CapturedNamedArguments) {
  let keys = namedArgs.names;
  let attrs = namedArgs.value();
  let props = Object.create(null);
  let args = Object.create(null);

  props[ARGS] = args;

  for (let i = 0; i < keys.length; i++) {
    let name = keys[i];
    let ref = namedArgs.get(name);
    let value = attrs[name];

    if (typeof value === 'function' && value[ACTION]) {
      attrs[name] = value;
    } else if (ref[UPDATE]) {
      attrs[name] = new MutableCell(ref, value);
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
    this[REF][UPDATE](val);
  }
}
