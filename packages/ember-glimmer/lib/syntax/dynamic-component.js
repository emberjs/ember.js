import {
  isComponentDefinition
} from '@glimmer/runtime';
import { UNDEFINED_REFERENCE } from '@glimmer/reference';
import { assert } from 'ember-debug';

function dynamicComponentFor(vm, symbolTable) {
  let env     = vm.env;
  let args    = vm.getArgs();
  let nameRef = args.positional.at(0);

  return new DynamicComponentReference({ nameRef, env, symbolTable });
}

export function closureComponentMacro(path, params, hash, _default, inverse, builder) {
  let definitionArgs = [[['get', path]], hash, _default, inverse];
  let args = [params, hash, _default, inverse];
  builder.component.dynamic(definitionArgs, dynamicComponentFor, args, builder.symbolTable);
  return true;
}

export function dynamicComponentMacro(params, hash, _default, inverse, builder) {
  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [params.slice(1), hash, null, null];
  builder.component.dynamic(definitionArgs, dynamicComponentFor, args, builder.symbolTable);
  return true;
}

export function blockComponentMacro(sexp, builder) {
  let [, , params, hash, _default, inverse] = sexp;
  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [params.slice(1), hash, _default, inverse];
  builder.component.dynamic(definitionArgs, dynamicComponentFor, args, builder.symbolTable);
  return true;
}

export function inlineComponentMacro(path, params, hash, builder) {
  let definitionArgs = [params.slice(0, 1), null, null, null];
  let args = [params.slice(1), hash, null, null];
  builder.component.dynamic(definitionArgs, dynamicComponentFor, args, builder.symbolTable);
  return true;
}

class DynamicComponentReference {
  constructor({ nameRef, env, symbolTable, args }) {
    this.tag = nameRef.tag;
    this.nameRef = nameRef;
    this.env = env;
    this.symbolTable = symbolTable;
    this.args = args;
  }

  value() {
    let { env, nameRef, symbolTable } = this;
    let nameOrDef = nameRef.value();

    if (typeof nameOrDef === 'string') {
      let definition = env.getComponentDefinition([nameOrDef], symbolTable);

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
