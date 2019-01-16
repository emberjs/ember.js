import {
  Dict,
  DynamicScope,
  Environment,
  Invocation,
  JitOrAotBlock,
  RenderResult,
  RichIteratorResult,
  SyntaxCompilationContext,
  TemplateMeta,
  WithAotStaticLayout,
  WithJitStaticLayout,
  TemplateIterator,
  Cursor,
  ComponentDefinition,
  JitRuntimeContext,
  AotRuntimeContext,
  ElementBuilder,
} from '@glimmer/interfaces';
import { PathReference } from '@glimmer/reference';
import { expect } from '@glimmer/util';
import { capabilityFlagsFrom } from './capabilities';
import { hasStaticLayoutCapability } from './compiled/opcodes/component';
import { resolveComponent } from './component/resolve';
import { ARGS } from './symbols';
import { AotVM, InternalVM, JitVM } from './vm/append';
import { NewElementBuilder } from './vm/element-builder';
import { DefaultDynamicScope } from './dynamic-scope';
import { UNDEFINED_REFERENCE } from './references';

class TemplateIteratorImpl<C extends JitOrAotBlock> implements TemplateIterator {
  constructor(private vm: InternalVM<C>) {}
  next(): RichIteratorResult<null, RenderResult> {
    return this.vm.next();
  }

  sync(): RenderResult {
    return renderSync(this.vm.runtime.env, this);
  }
}

export function renderSync(env: Environment, iterator: TemplateIterator): RenderResult {
  env.begin();

  let iteratorResult: IteratorResult<RenderResult>;

  do {
    iteratorResult = iterator.next() as IteratorResult<RenderResult>;
  } while (!iteratorResult.done);

  let result = iteratorResult.value;

  env.commit();

  return result;
}

export function renderAotMain(
  runtime: AotRuntimeContext<TemplateMeta>,
  self: PathReference,
  treeBuilder: ElementBuilder,
  handle: number,
  dynamicScope: DynamicScope = new DefaultDynamicScope()
): TemplateIterator {
  let vm = AotVM.initial(runtime, { self, dynamicScope, treeBuilder, handle });
  return new TemplateIteratorImpl(vm);
}

export function renderAot(
  runtime: AotRuntimeContext<TemplateMeta>,
  handle: number,
  cursor: Cursor,
  self: PathReference = UNDEFINED_REFERENCE
): TemplateIterator {
  let treeBuilder = NewElementBuilder.forInitialRender(runtime.env, cursor);
  let dynamicScope = new DefaultDynamicScope();
  let vm = AotVM.initial(runtime, { self, dynamicScope, treeBuilder, handle });
  return new TemplateIteratorImpl(vm);
}

export function renderJitMain(
  runtime: JitRuntimeContext<TemplateMeta>,
  context: SyntaxCompilationContext,
  self: PathReference,
  treeBuilder: ElementBuilder,
  handle: number,
  dynamicScope: DynamicScope = new DefaultDynamicScope()
): TemplateIterator {
  let vm = JitVM.initial(runtime, context, { self, dynamicScope, treeBuilder, handle });
  return new TemplateIteratorImpl(vm);
}

export type RenderComponentArgs = Dict<PathReference>;

function renderInvocation<C extends JitOrAotBlock>(
  vm: InternalVM<C>,
  invocation: Invocation,
  definition: ComponentDefinition,
  args: RenderComponentArgs
): TemplateIterator {
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
  vm[ARGS].setup(vm.stack, argNames, blockNames, 0, true);

  // Needed for the Op.Main opcode: arguments, component invocation object, and
  // component definition.
  vm.stack.push(vm[ARGS]);
  vm.stack.push(invocation);
  vm.stack.push(definition);

  return new TemplateIteratorImpl(vm);
}

export function renderAotComponent<R>(
  runtime: AotRuntimeContext<TemplateMeta<R>>,
  treeBuilder: ElementBuilder,
  main: number,
  name: string,
  args: RenderComponentArgs = {}
): TemplateIterator {
  let vm = AotVM.empty(runtime, { treeBuilder, handle: main });

  const definition = expect(
    resolveComponent(vm.runtime.resolver, name),
    `could not find component "${name}"`
  );

  const { manager, state } = definition;

  const capabilities = capabilityFlagsFrom(manager.getCapabilities(state));

  let invocation;

  if (hasStaticLayoutCapability(capabilities, manager)) {
    invocation = (manager as WithAotStaticLayout).getAotStaticLayout(state, vm.runtime.resolver);
  } else {
    throw new Error('Cannot invoke components with dynamic layouts as a root component.');
  }

  return renderInvocation(vm, invocation, definition, args);
}

export function renderJitComponent(
  runtime: JitRuntimeContext<TemplateMeta>,
  treeBuilder: ElementBuilder,
  context: SyntaxCompilationContext,
  main: number,
  name: string,
  args: RenderComponentArgs = {}
): TemplateIterator {
  let vm = JitVM.empty(runtime, { treeBuilder, handle: main }, context);

  const definition = expect(
    resolveComponent(vm.runtime.resolver, name),
    `could not find component "${name}"`
  );

  const { manager, state } = definition;

  const capabilities = capabilityFlagsFrom(manager.getCapabilities(state));

  let invocation: Invocation;

  if (hasStaticLayoutCapability(capabilities, manager)) {
    let layout = (manager as WithJitStaticLayout).getJitStaticLayout(state, vm.runtime.resolver);
    invocation = { handle: layout.compile(context), symbolTable: layout.symbolTable };
  } else {
    throw new Error('Cannot invoke components with dynamic layouts as a root component.');
  }

  return renderInvocation(vm, invocation, definition, args);
}
