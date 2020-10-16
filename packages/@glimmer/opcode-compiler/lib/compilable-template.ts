import {
  Option,
  LayoutWithContext,
  ContainingMetadata,
  SerializedInlineBlock,
  WireFormat,
  SymbolTable,
  CompilableTemplate,
  Statement,
  CompileTimeCompilationContext,
  CompilableBlock,
  CompilableProgram,
  HandleResult,
  BlockSymbolTable,
  SerializedBlock,
  BuilderOp,
  HighLevelOp,
} from '@glimmer/interfaces';
import { meta } from './opcode-builder/helpers/shared';
import { EMPTY_ARRAY } from '@glimmer/util';
import { templateCompilationContext } from './opcode-builder/context';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { debugCompiler } from './compiler';
import { STATEMENTS } from './syntax/statements';
import { HighLevelStatementOp } from './syntax/compilers';
import { encodeOp } from './opcode-builder/encoder';

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
  compile(context: CompileTimeCompilationContext): HandleResult {
    return maybeCompile(this, context);
  }
}

export function compilable(layout: LayoutWithContext): CompilableProgram {
  let [statements, symbols, hasEval] = layout.block;
  return new CompilableTemplateImpl(statements, meta(layout), {
    symbols,
    hasEval,
  });
}

function maybeCompile(
  compilable: CompilableTemplateImpl<SymbolTable>,
  context: CompileTimeCompilationContext
): HandleResult {
  if (compilable.compiled !== null) return compilable.compiled!;

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

  for (let i = 0; i < statements.length; i++) {
    sCompiler.compile(pushOp, statements[i]);
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
