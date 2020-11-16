import { debugSlice } from '@glimmer/debug';
import {
  CompilerBuffer,
  CompileTimeHeap,
  Statements,
  StatementCompileActions,
  WireFormat,
  Unhandled,
  TemplateCompilationContext,
  HandleResult,
} from '@glimmer/interfaces';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { extractHandle } from '@glimmer/util';
import { namedBlocks, expectLooseFreeVariable } from './utils';

export function compileInline(
  sexp: Statements.Append,
  context: TemplateCompilationContext
): StatementCompileActions | Unhandled {
  return context.syntax.macros.inlines.compile(sexp, context);
}

export function compileBlock(
  block: WireFormat.Statements.Block,
  context: TemplateCompilationContext
): StatementCompileActions {
  let [, name, params, hash, named] = block;
  let blocks = namedBlocks(named, context.meta);

  let nameOrError = expectLooseFreeVariable(
    name,
    context.meta,
    'Expected block head to be a string'
  );

  if (typeof nameOrError !== 'string') {
    return nameOrError;
  }

  return context.syntax.macros.blocks.compile(nameOrError, params, hash, blocks, context);
}

export function commit(heap: CompileTimeHeap, scopeSize: number, buffer: CompilerBuffer): number {
  let handle = heap.malloc();

  for (let i = 0; i < buffer.length; i++) {
    let value = buffer[i];

    if (typeof value === 'function') {
      heap.pushPlaceholder(value);
    } else if (typeof value === 'object') {
      heap.pushStdlib(value);
    } else {
      heap.push(value);
    }
  }

  heap.finishMalloc(handle, scopeSize);

  return handle;
}

export let debugCompiler: (context: TemplateCompilationContext, handle: HandleResult) => void;

if (LOCAL_SHOULD_LOG) {
  debugCompiler = (context: TemplateCompilationContext, result: HandleResult) => {
    let handle = extractHandle(result);
    let { heap } = context.syntax.program;
    let start = heap.getaddr(handle);
    let end = start + heap.sizeof(handle);

    debugSlice(context, start, end);
  };
}
