import type {
  CompilableProgram,
  ComponentDefinitionState,
  DynamicScope,
  Environment,
  EvaluationContext,
  Owner,
  RenderResult,
  RichIteratorResult,
  TemplateIterator,
  TreeBuilder,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { dev, expect, unwrapHandle } from '@glimmer/debug-util';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { childRefFor, createConstRef } from '@glimmer/reference';
import { debug } from '@glimmer/validator';

import { inTransaction } from './environment';
import { DynamicScopeImpl } from './scope';
import { VM } from './vm/append';

class TemplateIteratorImpl implements TemplateIterator {
  constructor(private vm: VM) {}
  next(): RichIteratorResult<null, RenderResult> {
    return this.vm.next();
  }

  sync(): RenderResult {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      return debug.runInTrackingTransaction!(() => this.vm.execute(), '- While rendering:');
    } else {
      return this.vm.execute();
    }
  }
}

export function renderSync(env: Environment, iterator: TemplateIterator): RenderResult {
  let result: RenderResult;

  inTransaction(env, () => (result = iterator.sync()));

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
  return result!;
}

export function renderMain(
  context: EvaluationContext,
  owner: Owner,
  self: Reference,
  tree: TreeBuilder,
  layout: CompilableProgram,
  dynamicScope: DynamicScope = new DynamicScopeImpl()
): TemplateIterator {
  let handle = unwrapHandle(layout.compile(context));
  let numSymbols = layout.symbolTable.symbols.length;

  let vm = VM.initial(context, {
    scope: {
      self,
      size: numSymbols,
    },
    dynamicScope,
    tree,
    handle,
    owner,
  });
  return new TemplateIteratorImpl(vm);
}

function renderInvocation(
  vm: VM,
  context: EvaluationContext,
  owner: Owner,
  definition: ComponentDefinitionState,
  args: Record<string, Reference>
): TemplateIterator {
  // Get a list of tuples of argument names and references, like
  // [['title', reference], ['name', reference]]
  const argList = Object.keys(args).map((key) => [key, args[key]] as const);

  const blockNames = ['main', 'else', 'attrs'];
  // Prefix argument names with `@` symbol
  const argNames = argList.map(([name]) => `@${name}`);

  let reified = vm.constants.component(definition, owner, undefined, '{ROOT}');

  vm.lowlevel.pushFrame();

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
  vm.args.setup(vm.stack, argNames, blockNames, 0, true);

  const compilable = expect(
    reified.compilable,
    'BUG: Expected the root component rendered with renderComponent to have an associated template, set with setComponentTemplate'
  );
  const layoutHandle = unwrapHandle(compilable.compile(context));
  const invocation = { handle: layoutHandle, symbolTable: compilable.symbolTable };

  // Needed for the Op.Main opcode: arguments, component invocation object, and
  // component definition.
  vm.stack.push(vm.args);
  vm.stack.push(invocation);
  vm.stack.push(reified);

  if (LOCAL_DEBUG) {
    dev(vm.trace).willCall(invocation.handle);
  }

  return new TemplateIteratorImpl(vm);
}

export function renderComponent(
  context: EvaluationContext,
  tree: TreeBuilder,
  owner: Owner,
  definition: ComponentDefinitionState,
  args: Record<string, unknown> = {},
  dynamicScope: DynamicScope = new DynamicScopeImpl()
): TemplateIterator {
  let vm = VM.initial(context, { tree, handle: context.stdlib.main, dynamicScope, owner });
  return renderInvocation(vm, context, owner, definition, recordToReference(args));
}

function recordToReference(record: Record<string, unknown>): Record<string, Reference> {
  const root = createConstRef(record, 'args');

  return Object.keys(record).reduce<Record<string, Reference>>((acc, key) => {
    acc[key] = childRefFor(root, key);
    return acc;
  }, {});
}
