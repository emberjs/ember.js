import { CONSTANT_TAG } from 'glimmer-reference';
import { assert } from 'ember-metal/debug';
import EmptyObject from 'ember-metal/empty_object';
import { ARGS } from '../component';

export default function processArgs(args, positionalParamsDefinition) {
  if (!positionalParamsDefinition || positionalParamsDefinition.length === 0 || args.positional.length === 0) {
    return SimpleArgs.create(args);
  } else if (typeof positionalParamsDefinition === 'string') {
    return RestArgs.create(args, positionalParamsDefinition);
  } else {
    return PositionalArgs.create(args, positionalParamsDefinition);
  }
}

const EMPTY_ARGS = {
  tag: CONSTANT_TAG,

  value() {
    return { attrs: {}, props: { attrs: {}, [ARGS]: {} } };
  }
};

class SimpleArgs {
  static create({ named }) {
    if (named.keys.length === 0) {
      return EMPTY_ARGS;
    } else {
      return new SimpleArgs(named);
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
    let props = new EmptyObject();
    let args = new EmptyObject();

    props.attrs = attrs;
    props[ARGS] = args;

    for (let i = 0, l = keys.length; i < l; i++) {
      let name = keys[i];
      let value = attrs[name];

      args[name] = namedArgs.get(name);
      props[name] = value;
    }

    return { attrs, props };
  }
}

class RestArgs {
  static create(args, restArgName) {
    assert(`You cannot specify positional parameters and the hash argument \`${restArgName}\`.`, !args.named.has(restArgName));

    return new RestArgs(args, restArgName);
  }

  constructor(args, restArgName) {
    this.tag = args.tag;
    this.simpleArgs = SimpleArgs.create(args);
    this.positionalArgs = args.positional;
    this.restArgName = restArgName;
  }

  value() {
    let { simpleArgs, positionalArgs, restArgName } = this;

    let result = simpleArgs.value();

    result.props[ARGS] = positionalArgs;
    result.attrs[restArgName] = result.props[restArgName] = positionalArgs.value();

    return result;
  }
}


class PositionalArgs {
  static create(args, positionalParamNames) {
    if (args.positional.length < positionalParamNames.length) {
      positionalParamNames = positionalParamNames.slice(0, args.positional.length);
    }

    for (let i = 0; i < positionalParamNames.length; i++) {
      let name = positionalParamNames[i];

      assert(
        `You cannot specify both a positional param (at position ${i}) and the hash argument \`${name}\`.`,
        !args.named.has(name)
      );
    }

    return new PositionalArgs(args, positionalParamNames);
  }

  constructor(args, positionalParamNames) {
    this.tag = args.tag;
    this.simpleArgs = SimpleArgs.create(args);
    this.positionalArgs = args.positional;
    this.positionalParamNames = positionalParamNames;
  }

  value() {
    let { simpleArgs, positionalArgs, positionalParamNames } = this;

    let result = simpleArgs.value();

    for (let i = 0; i < positionalParamNames.length; i++) {
      let name = positionalParamNames[i];
      let reference = result.props[ARGS][name] = positionalArgs.at(i);
      result.attrs[name] = result.props[name] = reference.value();
    }

    return result;
  }
}
