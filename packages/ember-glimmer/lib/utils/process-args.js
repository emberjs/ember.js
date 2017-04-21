import {
  assign,
  symbol
} from 'ember-utils';
import {
  CONSTANT_TAG
} from '@glimmer/reference';
import { ARGS } from '../component';
import { UPDATE } from './references';
import { MUTABLE_CELL } from 'ember-views';
import { ACTION } from '../helpers/action';
import {
  EvaluatedArgs,
  EvaluatedPositionalArgs
} from '@glimmer/runtime';

// Maps all variants of positional and dynamically scoped arguments
// into the named arguments. Input `args` and return value are both
// `EvaluatedArgs`.
export function gatherArgs(args, definition) {
  let namedMap = gatherNamedMap(args, definition);
  let positionalValues = gatherPositionalValues(args, definition);
  return mergeArgs(namedMap, positionalValues, args.blocks, definition.ComponentClass.class);
}

function gatherNamedMap(args, definition) {
  let namedMap = args.named.map;
  if (definition.args) {
    return assign({}, definition.args.named.map, namedMap);
  } else {
    return namedMap;
  }
}

function gatherPositionalValues(args, definition) {
  let positionalValues = args.positional.values;
  if (definition.args) {
    let oldPositional = definition.args.positional.values;
    let newPositional = [];
    newPositional.push(...oldPositional);
    newPositional.splice(0, positionalValues.length, ...positionalValues);
    return newPositional;
  } else {
    return positionalValues;
  }
}

function mergeArgs(namedMap, positionalValues, blocks, componentClass) {
  let positionalParamsDefinition = componentClass.positionalParams;

  if (positionalParamsDefinition && positionalParamsDefinition.length > 0 && positionalValues.length > 0) {
    if (typeof positionalParamsDefinition === 'string') {
      namedMap = mergeRestArg(namedMap, positionalValues, positionalParamsDefinition);
    } else {
      namedMap = mergePositionalParams(namedMap, positionalValues, positionalParamsDefinition);
    }
  }
  return EvaluatedArgs.named(namedMap, blocks);
}

const EMPTY_ARGS = {
  tag: CONSTANT_TAG,
  value() {
    return { attrs: {}, props: { attrs: {}, [ARGS]: {} } };
  }
};


// ComponentArgs takes EvaluatedNamedArgs and converts them into the
// inputs needed by CurlyComponents (attrs and props, with mutable
// cells, etc).
export class ComponentArgs {
  static create(args) {
    if (args.named.keys.length === 0) {
      return EMPTY_ARGS;
    } else {
      return new ComponentArgs(args.named);
    }
  }

  constructor(namedArgs) {
    this.tag = namedArgs.tag;
    this.namedArgs = namedArgs;
  }

  value() {
    let { namedArgs } = this;
    let keys = namedArgs.keys;
    let attrs = namedArgs.value();
    let props = Object.create(null);
    let args = Object.create(null);

    props[ARGS] = args;

    for (let i = 0, l = keys.length; i < l; i++) {
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

    return { attrs, props };
  }
}

function mergeRestArg(namedMap, positionalValues, restArgName) {
  let mergedNamed = assign({}, namedMap);
  mergedNamed[restArgName] = EvaluatedPositionalArgs.create(positionalValues);
  return mergedNamed;
}

function mergePositionalParams(namedMap, values, positionalParamNames) {
  let mergedNamed = assign({}, namedMap);
  let length = Math.min(values.length, positionalParamNames.length);
  for (let i = 0; i < length; i++) {
    let name = positionalParamNames[i];
    mergedNamed[name] = values[i];
  }
  return mergedNamed;
}

const REF = symbol('REF');

class MutableCell {
  constructor(ref, value) {
    this[MUTABLE_CELL] = true;
    this[REF] = ref;
    this.value = value;
  }

  update(val) {
    this[REF][UPDATE](val);
  }
}
