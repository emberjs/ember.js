import { other } from '../opcode-builder/operands';
import {
  HighLevelCompileOp,
  HighLevelCompileOpcode,
  CompileMode,
  Op,
  MachineOp,
  CompileBlockOp,
  CompileInlineOp,
  StatementCompileActions,
  InvokeStaticOp,
  DynamicComponentOp,
  IfResolvedComponentOp,
  SyntaxCompilationContext,
  TemplateCompilationContext,
  Option,
  CompilableTemplate,
  BuilderOp,
  CompileErrorOp,
} from '@glimmer/interfaces';
import { op } from '../opcode-builder/encoder';
import { CompileArgs } from '../opcode-builder/helpers/shared';
import { compilableBlock, PLACEHOLDER_HANDLE } from '../compilable-template';
import { InvokeDynamicComponent } from '../opcode-builder/helpers/components';
import { resolveLayoutForTag } from '../resolver';
import { exhausted } from '@glimmer/util';
import { concatStatements, isHandled } from './concat';
import { compileInline, compileBlock } from '../compiler';
import { PushPrimitive } from '../opcode-builder/helpers/vm';
import { namedBlocks } from '../utils';

export default function pushCompileOp(
  context: TemplateCompilationContext,
  action: HighLevelCompileOp
): void {
  concatStatements(context, compileOp(context, action));
}

function compileOp(
  context: TemplateCompilationContext,
  action: HighLevelCompileOp
): StatementCompileActions {
  switch (action.op) {
    case HighLevelCompileOpcode.CompileBlock:
      return CompileBlockOp(context, action);
    case HighLevelCompileOpcode.CompileInline:
      return CompileInlineOp(context, action);
    case HighLevelCompileOpcode.InvokeStatic:
      return InvokeStatic(context.syntax, action);
    case HighLevelCompileOpcode.Args:
      return CompileArgs(action.op1);
    case HighLevelCompileOpcode.PushCompilable:
      return PushCompilable(action.op1, context.syntax);
    case HighLevelCompileOpcode.DynamicComponent:
      return DynamicComponent(context, action);
    case HighLevelCompileOpcode.IfResolvedComponent:
      return IfResolvedComponent(context, action);

    default:
      return exhausted(action);
  }
}

function CompileBlockOp(context: TemplateCompilationContext, op: CompileBlockOp) {
  return compileBlock(op.op1, context);
}

function CompileInlineOp(
  context: TemplateCompilationContext,
  op: CompileInlineOp
): StatementCompileActions {
  let { inline, ifUnhandled } = op.op1;

  let returned = compileInline(inline, context);

  if (isHandled(returned)) {
    return returned;
  } else {
    return ifUnhandled(inline);
  }
}

function InvokeStatic(
  context: SyntaxCompilationContext,
  action: InvokeStaticOp
): StatementCompileActions {
  let compilable = action.op1;

  if (context.program.mode === CompileMode.aot) {
    let handle = compilable.compile(context);

    if (typeof handle !== 'number') {
      return op('Error', { problem: 'Invalid block', start: 0, end: 0 });
    }

    // If the handle for the invoked component is not yet known (for example,
    // because this is a recursive invocation and we're still compiling), push a
    // function that will produce the correct handle when the heap is
    // serialized.
    if (handle === PLACEHOLDER_HANDLE) {
      return op(MachineOp.InvokeStatic, () => compilable.compile(context));
    } else {
      return op(MachineOp.InvokeStatic, handle);
    }
  } else {
    return [op(Op.Constant, other(action.op1)), op(Op.CompileBlock), op(MachineOp.InvokeVirtual)];
  }
}

function DynamicComponent(
  context: TemplateCompilationContext,
  action: DynamicComponentOp
): StatementCompileActions {
  let { definition, attrs, params, args, blocks, atNames } = action.op1;

  let attrsBlock = attrs && attrs.length > 0 ? compilableBlock(attrs, context.meta) : null;

  let compiled =
    Array.isArray(blocks) || blocks === null ? namedBlocks(blocks, context.meta) : blocks;

  return InvokeDynamicComponent(context.meta, {
    definition,
    attrs: attrsBlock,
    params,
    hash: args,
    atNames,
    blocks: compiled,
  });
}

function IfResolvedComponent(
  context: TemplateCompilationContext,
  action: IfResolvedComponentOp
): StatementCompileActions {
  let { name, attrs, blocks, staticTemplate, dynamicTemplate, orElse } = action.op1;
  let component = resolveLayoutForTag(name, {
    resolver: context.syntax.program.resolverDelegate,
    meta: context.meta,
  });

  let { meta } = context;

  if (component !== null) {
    let { handle, capabilities, compilable } = component;

    let attrsBlock = compilableBlock(attrs, meta);

    let compilableBlocks = namedBlocks(blocks, meta);

    if (compilable !== null) {
      return staticTemplate(handle, capabilities, compilable, {
        attrs: attrsBlock,
        blocks: compilableBlocks,
      });
    } else {
      return dynamicTemplate(handle, capabilities, {
        attrs: attrsBlock,
        blocks: compilableBlocks,
      });
    }
  } else if (orElse) {
    return orElse();
  } else {
    throw new Error(`Compile Error: Cannot find component ${name}`);
  }
}

function PushCompilable(
  block: Option<CompilableTemplate>,
  context: SyntaxCompilationContext
): BuilderOp | CompileErrorOp {
  if (block === null) {
    return PushPrimitive(null);
  } else if (context.program.mode === CompileMode.aot) {
    let compiled = block.compile(context);

    if (typeof compiled !== 'number') {
      return op('Error', {
        problem: 'Compile Error (TODO: thread better)',
        start: 0,
        end: 0,
      });
    }

    return PushPrimitive(compiled);
  } else {
    return op(Op.Constant, other(block));
  }
}
