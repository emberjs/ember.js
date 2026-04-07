import type {
  BlockMetadata,
  BlockSymbolTable,
  BuilderOp,
  CompilableBlock,
  CompilableProgram,
  CompilableTemplate,
  EvaluationContext,
  HandleResult,
  HighLevelOp,
  LayoutWithContext,
  SerializedBlock,
  SerializedInlineBlock,
  Statement,
  SymbolTable,
  WireFormat,
} from '@glimmer/interfaces';
import { IS_COMPILABLE_TEMPLATE } from '@glimmer/constants';
import { LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';
import { EMPTY_ARRAY } from '@glimmer/util';

import type { HighLevelStatementOp } from './syntax/compilers';

import { debugCompiler } from './compiler';
import { templateCompilationContext } from './opcode-builder/context';
import { encodeOp } from './opcode-builder/encoder';
import { meta } from './opcode-builder/helpers/shared';
import { STATEMENTS } from './syntax/statements';

export const PLACEHOLDER_HANDLE = -1;

class CompilableTemplateImpl<S extends SymbolTable> implements CompilableTemplate<S> {
  static {
    if (LOCAL_TRACE_LOGGING) {
      Reflect.set(this.prototype, IS_COMPILABLE_TEMPLATE, true);
    }
  }

  compiled: WeakMap<EvaluationContext, HandleResult> = new WeakMap();

  constructor(
    readonly statements: WireFormat.Statement[],
    readonly meta: BlockMetadata,
    // Part of CompilableTemplate
    readonly symbolTable: S,
    // Used for debugging
    readonly moduleName = 'plain block'
  ) {}

  // Part of CompilableTemplate
  compile(context: EvaluationContext): HandleResult {
    return maybeCompile(this, context);
  }
}

export function compilable(layout: LayoutWithContext, moduleName: string): CompilableProgram {
  let [statements, symbols] = layout.block;
  return new CompilableTemplateImpl(
    statements,
    meta(layout),
    {
      symbols,
    },
    moduleName
  );
}

function maybeCompile(
  compilable: CompilableTemplateImpl<SymbolTable>,
  context: EvaluationContext
): HandleResult {
  if (compilable.compiled.has(context)) {
    return compilable.compiled.get(context) as HandleResult;
  }

  compilable.compiled.set(context, PLACEHOLDER_HANDLE);

  let { statements, meta } = compilable;

  let result = compileStatements(statements, meta, context);
  compilable.compiled.set(context, result);

  return result;
}

export function compileStatements(
  statements: Statement[],
  meta: BlockMetadata,
  syntaxContext: EvaluationContext
): HandleResult {
  let sCompiler = STATEMENTS;
  let context = templateCompilationContext(syntaxContext, meta);

  let { encoder, evaluation } = context;

  function pushOp(...op: BuilderOp | HighLevelOp | HighLevelStatementOp) {
    encodeOp(encoder, evaluation, meta, op as BuilderOp | HighLevelOp);
  }

  for (const statement of statements) {
    sCompiler.compile(pushOp, statement);
  }

  let handle = context.encoder.commit(meta.size);

  if (LOCAL_TRACE_LOGGING) {
    debugCompiler(context, handle);
  }

  return handle;
}

export function compilableBlock(
  block: SerializedInlineBlock | SerializedBlock,
  containing: BlockMetadata
): CompilableBlock {
  return new CompilableTemplateImpl<BlockSymbolTable>(block[0], containing, {
    parameters: block[1] || (EMPTY_ARRAY as number[]),
  });
}
