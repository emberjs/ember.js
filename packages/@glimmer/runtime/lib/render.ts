import { IteratorResult, RenderResult, VM } from './vm';
import { RuntimeProgram } from './vm/append';
import { ElementBuilder } from './vm/element-builder';
import { DynamicScope, Environment } from './environment';
import { PathReference } from '@glimmer/reference';
import { Opaque, Dict } from '@glimmer/interfaces';

export interface TemplateIterator {
  next(): IteratorResult<RenderResult>;
}

class TemplateIteratorImpl<T> implements TemplateIterator {
  constructor(private vm: VM<T>) {}
  next(): IteratorResult<RenderResult> {
    return this.vm.next();
  }
}

export function renderMain<T>(
  program: RuntimeProgram<T>,
  env: Environment,
  self: PathReference<Opaque>,
  dynamicScope: DynamicScope,
  builder: ElementBuilder,
  handle: number
): TemplateIterator {
  let vm = VM.initial(program, env, self, dynamicScope, builder, handle);
  return new TemplateIteratorImpl(vm);
}

export type RenderComponentArgs = Dict<PathReference<Opaque>>;

export function renderComponent<T>(
  program: RuntimeProgram<T>,
  env: Environment,
  builder: ElementBuilder,
  handle: number,
  args: RenderComponentArgs
): TemplateIterator {
  let vm = VM.empty(program, env, builder, handle);

  vm.pushFrame();

  // push three blocks onto the stack; TODO: Optimize
  for (let i = 0; i <= 9; i++) {
    vm.stack.push(null);
  }

  let argEntries = Object.entries(args);

  for (let [, ref] of argEntries) {
    vm.stack.push(ref);
  }

  let argNames = argEntries.map(arg => `@${arg[0]}`);

  vm.args.setup(vm.stack, argNames, ['main', 'else', 'attrs'], 0, false);
  vm.stack.push(vm.args);

  vm.stack.push({
    handle,
    symbolTable: { hasEval: false, symbols: titleBlock.symbols, referrer: null },
  });
  vm.stack.push({ state: null, manager: new BasicManager() });

  return new TemplateIteratorImpl(vm);
}
