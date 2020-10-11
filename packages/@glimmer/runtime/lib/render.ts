import {
  Dict,
  DynamicScope,
  Environment,
  Invocation,
  RenderResult,
  RichIteratorResult,
  TemplateIterator,
  ComponentDefinition,
  RuntimeContext,
  ElementBuilder,
  CompilableProgram,
  CompileTimeCompilationContext,
} from '@glimmer/interfaces';
import { Reference } from '@glimmer/reference';
import { unwrapHandle } from '@glimmer/util';
import { ARGS } from './symbols';
import VM, { InternalVM } from './vm/append';
import { DynamicScopeImpl } from './scope';
import { inTransaction } from './environment';
import { DEBUG } from '@glimmer/env';
import { runInTrackingTransaction } from '@glimmer/validator';

class TemplateIteratorImpl implements TemplateIterator {
  constructor(private vm: InternalVM) {}
  next(): RichIteratorResult<null, RenderResult> {
    return this.vm.next();
  }

  sync(): RenderResult {
    if (DEBUG) {
      return runInTrackingTransaction!(() => this.vm.execute(), '- While rendering:');
    } else {
      return this.vm.execute();
    }
  }
}

export function renderSync(env: Environment, iterator: TemplateIterator): RenderResult {
  let result: RenderResult;

  inTransaction(env, () => (result = iterator.sync()));

  return result!;
}

export function renderMain(
  runtime: RuntimeContext,
  context: CompileTimeCompilationContext,
  self: Reference,
  treeBuilder: ElementBuilder,
  handle: number,
  dynamicScope: DynamicScope = new DynamicScopeImpl()
): TemplateIterator {
  let vm = VM.initial(runtime, context, { self, dynamicScope, treeBuilder, handle });
  return new TemplateIteratorImpl(vm);
}

export type RenderComponentArgs = Dict<Reference>;

function renderInvocation(
  vm: InternalVM,
  invocation: Invocation,
  definition: ComponentDefinition,
  args: RenderComponentArgs
): TemplateIterator {
  // Get a list of tuples of argument names and references, like
  // [['title', reference], ['name', reference]]
  const argList = Object.keys(args).map((key) => [key, args[key]]);

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

export function renderComponent(
  runtime: RuntimeContext,
  treeBuilder: ElementBuilder,
  context: CompileTimeCompilationContext,
  definition: ComponentDefinition,
  layout: CompilableProgram,
  args: RenderComponentArgs = {},
  dynamicScope: DynamicScope = new DynamicScopeImpl()
): TemplateIterator {
  const handle = unwrapHandle(layout.compile(context));
  const invocation = { handle, symbolTable: layout.symbolTable };
  let vm = VM.empty(runtime, { treeBuilder, handle: context.stdlib.main, dynamicScope }, context);
  return renderInvocation(vm, invocation, definition, args);
}
