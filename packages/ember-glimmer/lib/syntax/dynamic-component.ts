import {
  Arguments,
  Environment,
  isComponentDefinition,
  VM
} from '@glimmer/runtime';
import { assert } from 'ember-debug';
import { hashToArgs } from './utils';

function dynamicComponentFor(vm: VM, args: Arguments, meta: any) {
  let env     = vm.env;
  let nameRef = args.positional.at(0);

  return new DynamicComponentReference({ nameRef, env, meta, args: null });
}

export function dynamicComponentMacro(params: any[], hash: any, _default: any, _inverse: any, builder: any) {
  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [params.slice(1), hashToArgs(hash), null, null];
  builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
  return true;
}

export function blockComponentMacro(params: any[], hash: any, _default: any, inverse: any, builder: any) {
  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [params.slice(1), hashToArgs(hash), _default, inverse];
  builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
  return true;
}

export function inlineComponentMacro(_name: string, params: any[], hash: any, builder: any) {
  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [params.slice(1), hashToArgs(hash), null, null];
  builder.component.dynamic(definitionArgs, dynamicComponentFor, args);
  return true;
}

class DynamicComponentReference {
  public tag: any;
  public nameRef: any;
  public env: Environment;
  public meta: any;
  public args: Arguments;

  constructor({ nameRef, env, meta, args }: any) {
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

      // tslint:disable-next-line:max-line-length
      assert(`Could not find component named "${nameOrDef}" (no component or template with that name was found)`, !!definition);

      return definition;
    } else if (isComponentDefinition(nameOrDef)) {
      return nameOrDef;
    } else {
      return null;
    }
  }

  get() { /* NOOP */ }
}
