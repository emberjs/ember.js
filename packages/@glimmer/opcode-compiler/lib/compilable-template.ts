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
import { IS_COMPILABLE_TEMPLATE } from '@glimmer/constants/lib/brand';
import { VM_JUMP_OP } from '@glimmer/constants/lib/vm-ops';
import {
  VM_APPEND_STATIC_TREE_OP,
  VM_ENTER_HOLE_OP,
  VM_EXIT_HOLE_OP,
} from '@glimmer/constants/lib/syscall-ops';
import { LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';
import { EMPTY_ARRAY } from '@glimmer/util/lib/array-utils';

import type { HighLevelStatementOp } from './syntax/compilers';

import { debugCompiler } from './compiler';
import { templateCompilationContext } from './opcode-builder/context';
import { encodeOp } from './opcode-builder/encoder';
import { meta } from './opcode-builder/helpers/shared';
import { STATEMENTS } from './syntax/statements';
import { HighLevelBuilderOpcodes } from './opcode-builder/opcodes';
import { labelOperand } from './opcode-builder/operands';
import { extractStaticTree } from './static-tree';

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

  for (let i = 0; i < statements.length; i++) {
    let run = extractStaticTree(statements, i);

    if (run) {
      // Two paths for the same run, chosen at runtime. Builders that must see
      // every construction step in order (rehydration, SSR) take the fallback
      // and run the original statements: filling holes after the subtree
      // exists would set attributes after their element was flushed, and
      // would look for block markers after enclosing elements were closed.
      let handle = syntaxContext.program.constants.value(run.tree);

      pushOp(HighLevelBuilderOpcodes.StartLabels);
      // the jump target must be op1: label offsets are patched relative to
      // their own slot, and `goto` resolves them against the opcode address
      pushOp(VM_APPEND_STATIC_TREE_OP, labelOperand('STATIC_TREE_FALLBACK'), handle);

      for (let h = 0; h < run.holeStatements.length; h++) {
        pushOp(VM_ENTER_HOLE_OP, h);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- parallel to holes
        sCompiler.compile(pushOp, statements[run.holeStatements[h]!]!);
        pushOp(VM_EXIT_HOLE_OP, h);
      }

      pushOp(VM_JUMP_OP, labelOperand('STATIC_TREE_END'));
      pushOp(HighLevelBuilderOpcodes.Label, 'STATIC_TREE_FALLBACK');

      for (let s = i; s < i + run.length; s++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- bounds checked
        sCompiler.compile(pushOp, statements[s]!);
      }

      pushOp(HighLevelBuilderOpcodes.Label, 'STATIC_TREE_END');
      pushOp(HighLevelBuilderOpcodes.StopLabels);

      i += run.length - 1;
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- bounds checked
    sCompiler.compile(pushOp, statements[i]!);
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
