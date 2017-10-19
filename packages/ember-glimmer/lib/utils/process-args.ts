import { symbol } from 'ember-utils';
import { ARGS } from '../component';
import { UPDATE } from './references';
import { MUTABLE_CELL } from 'ember-views';
import { ACTION } from '../helpers/action';

// ComponentArgs takes EvaluatedNamedArgs and converts them into the
// inputs needed by CurlyComponents (attrs and props, with mutable
// cells, etc).
export function processComponentArgs(namedArgs) {
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
  constructor(ref, value) {
    this[MUTABLE_CELL] = true;
    this[REF] = ref;
    this.value = value;
  }

  update(val) {
    this[REF][UPDATE](val);
  }
}
