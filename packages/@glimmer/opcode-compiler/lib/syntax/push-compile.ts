import {
  HighLevelCompileOp,
  HighLevelCompileOpcode,
  StatementCompileActions,
  DynamicComponentOp,
  IfResolvedComponentOp,
  TemplateCompilationContext,
} from '@glimmer/interfaces';
import { compilableBlock } from '../compilable-template';
import { InvokeDynamicComponent } from '../opcode-builder/helpers/components';
import { resolveLayoutForTag } from '../resolver';
import { exhausted } from '@glimmer/util';
import { concatStatements, isHandled } from './concat';
import { compileInline, compileBlock } from '../compiler';
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
    case HighLevelCompileOpcode.DynamicComponent:
      return DynamicComponent(context, action);
    case HighLevelCompileOpcode.IfResolvedComponent:
      return IfResolvedComponent(context, action);

    default:
      return exhausted(action);
  }
}

function CompileBlockOp(
  context: TemplateCompilationContext,
  op: import('@glimmer/interfaces').CompileBlockOp
) {
  return compileBlock(op.op1, context);
}

function CompileInlineOp(
  context: TemplateCompilationContext,
  op: import('@glimmer/interfaces').CompileInlineOp
): StatementCompileActions {
  let { inline, ifUnhandled } = op.op1;

  let returned = compileInline(inline, context);

  if (isHandled(returned)) {
    return returned;
  } else {
    return ifUnhandled(inline);
  }
}

function DynamicComponent(
  context: TemplateCompilationContext,
  action: DynamicComponentOp
): StatementCompileActions {
  let { definition, attrs, params, args, blocks, atNames, curried } = action.op1;

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
    curried,
  });
}

function IfResolvedComponent(
  context: TemplateCompilationContext,
  action: IfResolvedComponentOp
): StatementCompileActions {
  let { name, attrs, blocks, staticTemplate, dynamicTemplate, orElse } = action.op1;
  let component = resolveLayoutForTag(name, {
    resolver: context.syntax.program.resolver,
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
