import {
  Dict,
  DynamicScope,
  Environment,
  Invocation,
  JitOrAotBlock,
  RenderResult,
  RichIteratorResult,
  SyntaxCompilationContext,
  WithAotStaticLayout,
  TemplateIterator,
  Cursor,
  ComponentDefinition,
  JitRuntimeContext,
  AotRuntimeContext,
  ElementBuilder,
  CompilableProgram,
} from '@glimmer/interfaces';
import { Reference, UNDEFINED_REFERENCE } from '@glimmer/reference';
import { expect, unwrapHandle } from '@glimmer/util';
import { capabilityFlagsFrom } from './capabilities';
import { hasStaticLayoutCapability } from './compiled/opcodes/component';
import { resolveComponent } from './component/resolve';
import { ARGS } from './symbols';
import { AotVM, InternalVM, JitVM } from './vm/append';
import { NewElementBuilder } from './vm/element-builder';
import { DynamicScopeImpl } from './scope';
import { inTransaction } from './environment';

class TemplateIteratorImpl<C extends JitOrAotBlock> implements TemplateIterator {
  constructor(private vm: InternalVM<C>) {}
  next(): RichIteratorResult<null, RenderResult> {
    return this.vm.next();
  }

  sync(): RenderResult {
    return this.vm.execute();
  }
}

export function renderSync(env: Environment, iterator: TemplateIterator): RenderResult {
  let result: RenderResult;

  inTransaction(env, () => (result = iterator.sync()));

  return result!;
}

export function renderAotMain(
  runtime: AotRuntimeContext,
  self: Reference,
  treeBuilder: ElementBuilder,
  handle: number,
  dynamicScope: DynamicScope = new DynamicScopeImpl()
): TemplateIterator {
  let vm = AotVM.initial(runtime, { self, dynamicScope, treeBuilder, handle });
  return new TemplateIteratorImpl(vm);
}

export function renderAot(
  runtime: AotRuntimeContext,
  handle: number,
  cursor: Cursor,
  self: Reference = UNDEFINED_REFERENCE
): TemplateIterator {
  let treeBuilder = NewElementBuilder.forInitialRender(runtime.env, cursor);
  let dynamicScope = new DynamicScopeImpl();
  let vm = AotVM.initial(runtime, { self, dynamicScope, treeBuilder, handle });
  return new TemplateIteratorImpl(vm);
}

export function renderJitMain(
  runtime: JitRuntimeContext,
  context: SyntaxCompilationContext,
  self: Reference,
  treeBuilder: ElementBuilder,
  handle: number,
  dynamicScope: DynamicScope = new DynamicScopeImpl()
): TemplateIterator {
  let vm = JitVM.initial(runtime, context, { self, dynamicScope, treeBuilder, handle });
  return new TemplateIteratorImpl(vm);
}

export type RenderComponentArgs = Dict<Reference>;

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
    vm.stack.pushNull();
  }

  vm.stack.pushNull();

  // For each argument, push its backing reference on to the stack
  argList.forEach(([, reference]) => {
    vm.stack.pushJs(reference);
  });

  // Configure VM based on blocks and args just pushed on to the stack.
  vm[ARGS].setup(vm.stack, argNames, blockNames, 0, true);

  // Needed for the Op.Main opcode: arguments, component invocation object, and
  // component definition.
  vm.stack.pushJs(vm[ARGS]);
  vm.stack.pushJs(invocation);
  vm.stack.pushJs(definition);

  return new TemplateIteratorImpl(vm);
}

export function renderAotComponent<R>(
  runtime: AotRuntimeContext<R>,
  treeBuilder: ElementBuilder,
  main: number,
  name: string,
  args: RenderComponentArgs = {},
  dynamicScope: DynamicScope = new DynamicScopeImpl()
): TemplateIterator {
  let vm = AotVM.empty(runtime, { treeBuilder, handle: main, dynamicScope });

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
  runtime: JitRuntimeContext,
  treeBuilder: ElementBuilder,
  context: SyntaxCompilationContext,
  definition: ComponentDefinition,
  layout: CompilableProgram,
  args: RenderComponentArgs = {},
  dynamicScope: DynamicScope = new DynamicScopeImpl()
): TemplateIterator {
  const handle = unwrapHandle(layout.compile(context));
  const invocation = { handle, symbolTable: layout.symbolTable };
  let vm = JitVM.empty(
    runtime,
    { treeBuilder, handle: context.program.stdlib.main, dynamicScope },
    context
  );
  return renderInvocation(vm, invocation, definition, args);
}
