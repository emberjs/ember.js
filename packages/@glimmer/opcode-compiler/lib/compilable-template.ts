import {
  Option,
  LayoutWithContext,
  ContainingMetadata,
  SerializedInlineBlock,
  WireFormat,
  SymbolTable,
  CompilableTemplate,
  Statement,
  SyntaxCompilationContext,
  CompilableBlock,
  CompilableProgram,
  HandleResult,
} from '@glimmer/interfaces';
import { meta } from './opcode-builder/helpers/shared';
import { EMPTY_ARRAY } from '@glimmer/util';
import { templateCompilationContext } from './opcode-builder/context';
import { concatStatements } from './syntax/concat';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { debugCompiler } from './compiler';
import { patchStdlibs } from '@glimmer/program';
import { STATEMENTS } from './syntax/statements';

export const PLACEHOLDER_HANDLE = -1;

class CompilableTemplateImpl<S extends SymbolTable> implements CompilableTemplate<S> {
  compiled: Option<HandleResult> = null;

  constructor(
    readonly statements: WireFormat.Statement[],
    readonly meta: ContainingMetadata,
    // Part of CompilableTemplate
    readonly symbolTable: S
  ) {}

  // Part of CompilableTemplate
  compile(context: SyntaxCompilationContext): HandleResult {
    return maybeCompile(this, context);
  }
}

export function compilable<R>(layout: LayoutWithContext<R>): CompilableProgram {
  let block = layout.block;
  return new CompilableTemplateImpl(block.statements, meta(layout), {
    symbols: block.symbols,
    hasEval: block.hasEval,
  });
}

function maybeCompile(
  compilable: CompilableTemplateImpl<SymbolTable>,
  context: SyntaxCompilationContext
): HandleResult {
  if (compilable.compiled !== null) return compilable.compiled!;

  compilable.compiled = PLACEHOLDER_HANDLE;

  let { statements, meta } = compilable;

  let result = compileStatements(statements, meta, context);
  patchStdlibs(context.program);
  compilable.compiled = result;

  return result;
}

export function compileStatements(
  statements: Statement[],
  meta: ContainingMetadata,
  syntaxContext: SyntaxCompilationContext
): HandleResult {
  let sCompiler = STATEMENTS;
  let context = templateCompilationContext(syntaxContext, meta);

  for (let i = 0; i < statements.length; i++) {
    concatStatements(context, sCompiler.compile(statements[i], context.meta));
  }

  let handle = context.encoder.commit(syntaxContext.program.heap, meta.size);

  if (LOCAL_SHOULD_LOG) {
    debugCompiler(context, handle);
  }

  return handle;
}

export function compilableBlock(
  overloadBlock: SerializedInlineBlock | WireFormat.Statement[],
  containing: ContainingMetadata
): CompilableBlock {
  let block = Array.isArray(overloadBlock)
    ? { statements: overloadBlock, parameters: EMPTY_ARRAY }
    : overloadBlock;

  return new CompilableTemplateImpl(block.statements, containing, { parameters: block.parameters });
}
