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
import { LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';
import { EMPTY_ARRAY } from '@glimmer/util/lib/array-utils';

import type { HighLevelStatementOp } from './syntax/compilers';

import {
  VM_CLONE_NAVIGATE_ELEMENT_OP,
  VM_CLONE_NAVIGATE_INTO_OP,
  VM_CLONE_POP_OP,
  VM_CLONE_TEMPLATE_OP,
} from '@glimmer/constants/lib/syscall-ops';

import { analyzeClonable } from './clone/analyze';
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

  // SPIKE: if the block is a clonable static-shape element tree, emit a
  // clone-and-patch sequence (build the skeleton once, clone per instance, run
  // only the dynamic parts) instead of the node-by-node element opcodes.
  const clonable = analyzeClonable(statements as unknown[]);

  if (clonable) {
    pushOp(VM_CLONE_TEMPLATE_OP as never, clonable.html as never);

    for (const part of clonable.parts) {
      const path = part.path.join('.') as never;

      if (part.kind === 'attr') {
        pushOp(VM_CLONE_NAVIGATE_ELEMENT_OP as never, path);
        sCompiler.compile(pushOp, part.statement as Statement);
      } else {
        pushOp(VM_CLONE_NAVIGATE_INTO_OP as never, path);
        sCompiler.compile(pushOp, part.statement as Statement);
        pushOp(VM_CLONE_POP_OP as never);
      }
    }
  } else {
    for (const statement of statements) {
      sCompiler.compile(pushOp, statement);
    }
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
