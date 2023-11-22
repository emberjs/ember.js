import type {
  BlockSymbolTable,
  BuilderOp,
  CompilableBlock,
  CompilableProgram,
  CompilableTemplate,
  CompileTimeCompilationContext,
  ContainingMetadata,
  HandleResult,
  HighLevelOp,
  LayoutWithContext,
  Nullable,
  SerializedBlock,
  SerializedInlineBlock,
  Statement,
  SymbolTable,
  WireFormat,
} from '@glimmer/interfaces';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { EMPTY_ARRAY } from '@glimmer/util';

import type { HighLevelStatementOp } from './syntax/compilers';

import { debugCompiler } from './compiler';
import { templateCompilationContext } from './opcode-builder/context';
import { encodeOp } from './opcode-builder/encoder';
import { meta } from './opcode-builder/helpers/shared';
import { STATEMENTS } from './syntax/statements';

export const PLACEHOLDER_HANDLE = -1;

class CompilableTemplateImpl<S extends SymbolTable> implements CompilableTemplate<S> {
  compiled: Nullable<HandleResult> = null;

  constructor(
    readonly statements: WireFormat.Statement[],
    readonly meta: ContainingMetadata,
    // Part of CompilableTemplate
    readonly symbolTable: S,
    // Used for debugging
    readonly moduleName = 'plain block'
  ) {}

  // Part of CompilableTemplate
  compile(context: CompileTimeCompilationContext): HandleResult {
    return maybeCompile(this, context);
  }
}

export function compilable(layout: LayoutWithContext, moduleName: string): CompilableProgram {
  let [statements, symbols, hasEval] = layout.block;
  return new CompilableTemplateImpl(
    statements,
    meta(layout),
    {
      symbols,
      hasEval,
    },
    moduleName
  );
}

function maybeCompile(
  compilable: CompilableTemplateImpl<SymbolTable>,
  context: CompileTimeCompilationContext
): HandleResult {
  if (compilable.compiled !== null) return compilable.compiled;

  compilable.compiled = PLACEHOLDER_HANDLE;

  let { statements, meta } = compilable;

  let result = compileStatements(statements, meta, context);
  compilable.compiled = result;

  return result;
}

export function compileStatements(
  statements: Statement[],
  meta: ContainingMetadata,
  syntaxContext: CompileTimeCompilationContext
): HandleResult {
  let sCompiler = STATEMENTS;
  let context = templateCompilationContext(syntaxContext, meta);

  let {
    encoder,
    program: { constants, resolver },
  } = context;

  function pushOp(...op: BuilderOp | HighLevelOp | HighLevelStatementOp) {
    encodeOp(encoder, constants, resolver, meta, op as BuilderOp | HighLevelOp);
  }

  for (const statement of statements) {
    sCompiler.compile(pushOp, statement);
  }

  let handle = context.encoder.commit(meta.size);

  if (LOCAL_SHOULD_LOG) {
    debugCompiler(context, handle);
  }

  return handle;
}

export function compilableBlock(
  block: SerializedInlineBlock | SerializedBlock,
  containing: ContainingMetadata
): CompilableBlock {
  return new CompilableTemplateImpl<BlockSymbolTable>(block[0], containing, {
    parameters: block[1] || (EMPTY_ARRAY as number[]),
  });
}
