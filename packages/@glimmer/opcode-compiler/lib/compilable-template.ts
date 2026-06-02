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

import { VM_CLONE_BIND_ALL_OP, VM_CLONE_TEMPLATE_OP } from '@glimmer/constants/lib/syscall-ops';

import { expr } from './opcode-builder/helpers/expr';
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
    readonly moduleName = 'plain block',
    // SPIKE: build-time clone descriptor for this block, if clonable.
    readonly clone?: WireFormat.SerializedCloneTemplate
  ) {}

  // Part of CompilableTemplate
  compile(context: EvaluationContext): HandleResult {
    return maybeCompile(this, context);
  }
}

export function compilable(layout: LayoutWithContext, moduleName: string): CompilableProgram {
  let [statements, symbols, , clone] = layout.block;
  return new CompilableTemplateImpl(
    statements,
    meta(layout),
    {
      symbols,
    },
    moduleName,
    clone
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

  let { statements, meta, clone } = compilable;

  let result = compileStatements(statements, meta, context, clone);
  compilable.compiled.set(context, result);

  return result;
}

export function compileStatements(
  statements: Statement[],
  meta: BlockMetadata,
  syntaxContext: EvaluationContext,
  clone?: WireFormat.SerializedCloneTemplate
): HandleResult {
  let sCompiler = STATEMENTS;
  let context = templateCompilationContext(syntaxContext, meta);

  let { encoder, evaluation } = context;

  function pushOp(...op: BuilderOp | HighLevelOp | HighLevelStatementOp) {
    encodeOp(encoder, evaluation, meta, op as BuilderOp | HighLevelOp);
  }

  // SPIKE: clone-based rendering. The precompiler (build time) already
  // determined whether this block is a clonable static-shape element tree and,
  // if so, attached a descriptor (skeleton HTML + positional dynamic parts).
  // Emit the clone-and-patch sequence: clone the skeleton once per instance,
  // push each dynamic part's value reference, then bind them all + register a
  // single composite item-updater in one op — instead of node-by-node element
  // opcodes + a navigate/dynamic/updating opcode per part.
  if (clone) {
    pushOp(VM_CLONE_TEMPLATE_OP, clone.h);

    for (const part of clone.p) {
      expr(pushOp, part.e);
    }

    const meta = clone.p.map((part) =>
      part.k === 'a'
        ? { k: 'a', p: part.p.join('.'), n: part.n, t: part.t }
        : { k: 'c', p: part.p.join('.') }
    );

    pushOp(VM_CLONE_BIND_ALL_OP as never, JSON.stringify(meta));
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
  return new CompilableTemplateImpl<BlockSymbolTable>(
    block[0],
    containing,
    {
      parameters: (block as SerializedInlineBlock)[1] || (EMPTY_ARRAY as number[]),
    },
    'plain block',
    (block as SerializedInlineBlock)[2]
  );
}
