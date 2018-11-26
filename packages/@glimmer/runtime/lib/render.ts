import { RenderResult, VM } from './vm';
import { RuntimeProgram } from './vm/append';
import { ElementBuilder } from './vm/element-builder';
import { DynamicScope, Environment } from './environment';
import { PathReference } from '@glimmer/reference';
import { Opaque, Dict, RichIteratorResult } from '@glimmer/interfaces';
import { resolveComponent } from './component/resolve';
import { expect } from '@glimmer/util';
import { capabilityFlagsFrom } from './capabilities';
import { hasStaticLayoutCapability } from './compiled/opcodes/component';
import { CONSTANTS, ARGS } from './symbols';

export interface TemplateIterator {
  next(): RichIteratorResult<null, RenderResult>;
}

class TemplateIteratorImpl<T> implements TemplateIterator {
  constructor(private vm: VM<T>) {}
  next(): RichIteratorResult<null, RenderResult> {
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

/**
 * Returns a TemplateIterator configured to render a root component.
 */
export function renderComponent<T>(
  program: RuntimeProgram<T>,
  env: Environment,
  builder: ElementBuilder,
  main: number,
  name: string,
  args: RenderComponentArgs = {}
): TemplateIterator {
  const vm = VM.empty(program, env, builder, main);
  const { resolver } = vm[CONSTANTS];

  const definition = expect(
    resolveComponent(resolver, name, null),
    `could not find component "${name}"`
  );

  const { manager, state } = definition;
  const capabilities = capabilityFlagsFrom(manager.getCapabilities(state));

  let invocation;

  if (hasStaticLayoutCapability(capabilities, manager)) {
    invocation = manager.getLayout(state, resolver);
  } else {
    throw new Error('Cannot invoke components with dynamic layouts as a root component.');
  }

  // Get a list of tuples of argument names and references, like
  // [['title', reference], ['name', reference]]
  const argList = Object.keys(args).map(key => [key, args[key]]);

  const blockNames = ['main', 'else', 'attrs'];
  // Prefix argument names with `@` symbol
  const argNames = argList.map(([name]) => `@${name}`);

  vm.pushFrame();

  // Push blocks on to the stack, three stack values per block
  for (let i = 0; i < 3 * blockNames.length; i++) {
    vm.stack.push(null);
  }

  vm.stack.push(null);

  // For each argument, push its backing reference on to the stack
  argList.forEach(([, reference]) => {
    vm.stack.push(reference);
  });

  // Configure VM based on blocks and args just pushed on to the stack.
  vm[ARGS].setup(vm.stack, argNames, blockNames, 0, false);

  // Needed for the Op.Main opcode: arguments, component invocation object, and
  // component definition.
  vm.stack.push(vm[ARGS]);
  vm.stack.push(invocation);
  vm.stack.push(definition);

  return new TemplateIteratorImpl(vm);
}
