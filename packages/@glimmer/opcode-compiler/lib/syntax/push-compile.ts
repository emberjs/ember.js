import {
  DynamicComponentOp,
  HighLevelCompileOp,
  HighLevelCompileOpcode,
  IfResolvedComponentOp,
  StatementCompileActions,
  TemplateCompilationContext,
} from '@glimmer/interfaces';
import { expect } from '@glimmer/util';
import { compilableBlock } from '../compilable-template';
import { MINIMAL_CAPABILITIES } from '../opcode-builder/delegate';
import { InvokeDynamicComponent } from '../opcode-builder/helpers/components';
import { namedBlocks } from '../utils';
import { concatStatements } from './concat';

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
    case HighLevelCompileOpcode.DynamicComponent:
      return DynamicComponent(context, action);
    case HighLevelCompileOpcode.IfResolvedComponent:
      return IfResolvedComponent(context, action);
  }
}

function DynamicComponent(
  context: TemplateCompilationContext,
  action: DynamicComponentOp
): StatementCompileActions {
  let { definition, elementBlock, params, args, blocks, atNames, curried } = action.op1;

  let elementParamsBlock = elementBlock ? compilableBlock([elementBlock], context.meta) : null;

  let compiled =
    Array.isArray(blocks) || blocks === null ? namedBlocks(blocks, context.meta) : blocks;

  return InvokeDynamicComponent(context.meta, {
    definition,
    elementBlock: elementParamsBlock,
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
  let { name, elementBlock, blocks, staticTemplate, dynamicTemplate, orElse } = action.op1;
  let { program, meta } = context;

  let component = program.resolver.lookupComponent(
    name,
    expect(meta.owner, 'expected owner to exist when looking up component')
  );

  if (component !== null) {
    let { handle, capabilities = MINIMAL_CAPABILITIES, compilable } = component;

    let attrsBlock = elementBlock ? compilableBlock([elementBlock], meta) : null;

    let compilableBlocks = namedBlocks(blocks, meta);

    if (compilable !== null) {
      return staticTemplate(handle, capabilities, compilable, {
        elementBlock: attrsBlock,
        blocks: compilableBlocks,
      });
    } else {
      return dynamicTemplate(handle, capabilities, {
        elementBlock: attrsBlock,
        blocks: compilableBlocks,
      });
    }
  } else if (orElse) {
    return orElse();
  } else {
    throw new Error(`Compile Error: Cannot find component ${name}`);
  }
}
