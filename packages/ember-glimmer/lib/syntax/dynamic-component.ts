import {
  isComponentDefinition
} from '@glimmer/runtime';
import { UNDEFINED_REFERENCE } from '@glimmer/reference';
import { assert } from 'ember-debug';
import { hashToArgs } from './utils';

function dynamicComponentFor(vm, args, meta) {
  let env     = vm.env;
  let nameRef = args.positional.at(0);

  return new DynamicComponentReference({ nameRef, env, meta, args: null });
}

export function dynamicComponentMacro(params, hash, _default, inverse, builder) {
  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [params.slice(1), hashToArgs(hash), null, null];
  builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
  return true;
}

export function blockComponentMacro(params, hash, _default, inverse, builder) {
  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [params.slice(1), hashToArgs(hash), _default, inverse];
  builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
  return true;
}

export function inlineComponentMacro(name, params, hash, builder) {
  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [params.slice(1), hashToArgs(hash), null, null];
  builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
  return true;
}

class DynamicComponentReference {
  public tag: any;
  public nameRef: any;
  public env: any;
  public meta: any;
  public args: any;

  constructor({ nameRef, env, meta, args }) {
    this.tag = nameRef.tag;
    this.nameRef = nameRef;
    this.env = env;
    this.meta = meta;
    this.args = args;
  }

  value() {
    let { env, nameRef, meta } = this;
    let nameOrDef = nameRef.value();

    if (typeof nameOrDef === 'string') {
      let definition = env.getComponentDefinition(nameOrDef, meta);

      assert(`Could not find component named "${nameOrDef}" (no component or template with that name was found)`, definition);

      return definition;
    } else if (isComponentDefinition(nameOrDef)) {
      return nameOrDef;
    } else {
      return null;
    }
  }

  get() {
    return UNDEFINED_REFERENCE;
  }
}
