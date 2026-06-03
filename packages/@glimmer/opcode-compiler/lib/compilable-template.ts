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
  VM_CLONE_BIND_ATTRS_OP,
  VM_CLONE_ENTER_SLOT_OP,
  VM_CLONE_EXIT_SLOT_OP,
  VM_CLONE_GUARD_OP,
  VM_CLONE_TEMPLATE_OP,
} from '@glimmer/constants/lib/syscall-ops';
import {
  VM_INVOKE_STATIC_OP,
  VM_JUMP_OP,
  VM_POP_FRAME_OP,
  VM_PUSH_FRAME_OP,
} from '@glimmer/constants/lib/vm-ops';

import { expr } from './opcode-builder/helpers/expr';
import { debugCompiler } from './compiler';
import { templateCompilationContext } from './opcode-builder/context';
import { encodeOp } from './opcode-builder/encoder';
import { HighLevelBuilderOpcodes } from './opcode-builder/opcodes';
import { labelOperand, stdlibOperand } from './opcode-builder/operands';
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
  //
  // Emit BOTH paths behind a runtime guard, because cloning only works on a real
  // browser document (serialization and rehydration must run the normal
  // node-by-node opcodes to adopt/produce server DOM):
  //
  //   CLONE_GUARD -> ELSE          // jump to normal path if !canCloneInto()
  //   CLONE_TEMPLATE + exprs + CLONE_BIND_ALL
  //   JUMP -> END
  //   ELSE: <normal statement opcodes>
  //   END:
  //
  // In the browser the guard falls through to the fast clone+bind path; nothing
  // changes for any other builder.
  if (clone) {
    const attrParts = clone.p.filter((p) => p.k === 'a');
    const contentParts = clone.p.filter((p) => p.k === 'c');

    pushOp(HighLevelBuilderOpcodes.StartLabels);
    pushOp(VM_CLONE_GUARD_OP as never, labelOperand('CLONE_ELSE'));

    pushOp(VM_CLONE_TEMPLATE_OP, clone.h);

    // Dynamic attributes: push every value reference, then bind them all to
    // their clone nodes + register one composite updater, in a single op.
    if (attrParts.length > 0) {
      for (const part of attrParts) {
        expr(pushOp, part.e);
      }
      const attrMeta = attrParts.map((part) => ({ p: part.p.join('.'), n: part.n, t: part.t }));
      pushOp(VM_CLONE_BIND_ATTRS_OP as never, JSON.stringify(attrMeta));
    }

    // Dynamic content: enter the cloned slot element and run the normal content
    // append (content-type aware, handles text / safe HTML / node / fragment and
    // type-changing updates) so cloned content matches normal rendering exactly.
    for (const part of contentParts) {
      pushOp(VM_CLONE_ENTER_SLOT_OP as never, part.p.join('.'));
      pushOp(VM_PUSH_FRAME_OP);
      expr(pushOp, part.e);
      pushOp(VM_INVOKE_STATIC_OP, stdlibOperand('cautious-append'));
      pushOp(VM_POP_FRAME_OP);
      pushOp(VM_CLONE_EXIT_SLOT_OP as never);
    }

    pushOp(VM_JUMP_OP, labelOperand('CLONE_END'));

    pushOp(HighLevelBuilderOpcodes.Label, 'CLONE_ELSE');
    for (const statement of statements) {
      sCompiler.compile(pushOp, statement);
    }

    pushOp(HighLevelBuilderOpcodes.Label, 'CLONE_END');
    pushOp(HighLevelBuilderOpcodes.StopLabels);
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
