import {
  CompilableProgram,
  CompileTimeComponent,
  HighLevelBuilderOpcode,
  LayoutWithContext,
  MachineOp,
  NamedBlocks,
  WireFormat,
  Option,
  Op,
  InternalComponentCapability,
} from '@glimmer/interfaces';
import { hasCapability } from '@glimmer/manager';
import { $s0, $s1, $sp, $v0, SavedRegister } from '@glimmer/vm';
import { EMPTY_STRING_ARRAY } from '@glimmer/util';
import { PushExpressionOp, PushStatementOp } from '../../syntax/compilers';
import { namedBlocks } from '../../utils';
import {
  labelOperand,
  layoutOperand,
  symbolTableOperand,
  ownerOperand,
  isStrictMode,
} from '../operands';
import { InvokeStaticBlock, PushYieldableBlock, YieldBlock } from './blocks';
import { Replayable } from './conditional';
import { expr } from './expr';
import { CompileArgs, CompilePositional, SimpleArgs } from './shared';

export const ATTRS_BLOCK = '&attrs';

interface AnyComponent {
  elementBlock: Option<WireFormat.SerializedInlineBlock>;
  positional: WireFormat.Core.Params;
  named: WireFormat.Core.Hash;
  blocks: NamedBlocks;
}

// {{component}}
export interface DynamicComponent extends AnyComponent {
  definition: WireFormat.Expression;
  atNames: boolean;
  curried: boolean;
}

// (component)
export interface CurryComponent {
  definition: WireFormat.Expression;
  positional: WireFormat.Core.Params;
  named: WireFormat.Core.Hash;
  atNames: boolean;
}

// <Component>
export interface StaticComponent extends AnyComponent {
  capabilities: InternalComponentCapability;
  layout: CompilableProgram;
}

// chokepoint
export interface Component extends AnyComponent {
  // either we know the capabilities statically or we need to be conservative and assume
  // that the component requires all capabilities
  capabilities: InternalComponentCapability | true;

  // are the arguments supplied as atNames?
  atNames: boolean;

  // do we have the layout statically or will we need to look it up at runtime?
  layout?: CompilableProgram;
}

export function InvokeComponent(
  op: PushStatementOp,
  component: CompileTimeComponent,
  _elementBlock: WireFormat.Core.ElementParameters,
  positional: WireFormat.Core.Params,
  named: WireFormat.Core.Hash,
  _blocks: WireFormat.Core.Blocks
): void {
  let { compilable, capabilities, handle } = component;

  let elementBlock = _elementBlock
    ? ([_elementBlock, []] as WireFormat.SerializedInlineBlock)
    : null;
  let blocks = Array.isArray(_blocks) || _blocks === null ? namedBlocks(_blocks) : _blocks;

  if (compilable) {
    op(Op.PushComponentDefinition, handle);
    InvokeStaticComponent(op, {
      capabilities: capabilities,
      layout: compilable,
      elementBlock,
      positional,
      named,
      blocks,
    });
  } else {
    op(Op.PushComponentDefinition, handle);
    InvokeNonStaticComponent(op, {
      capabilities: capabilities,
      elementBlock,
      positional,
      named,
      atNames: true,
      blocks,
    });
  }
}

export function InvokeDynamicComponent(
  op: PushStatementOp,
  definition: WireFormat.Core.Expression,
  _elementBlock: WireFormat.Core.ElementParameters,
  positional: WireFormat.Core.Params,
  named: WireFormat.Core.Hash,
  _blocks: WireFormat.Core.Blocks,
  atNames: boolean,
  curried: boolean
): void {
  let elementBlock = _elementBlock
    ? ([_elementBlock, []] as WireFormat.SerializedInlineBlock)
    : null;
  let blocks = Array.isArray(_blocks) || _blocks === null ? namedBlocks(_blocks) : _blocks;

  Replayable(
    op,

    () => {
      expr(op, definition);
      op(Op.Dup, $sp, 0);
      return 2;
    },

    () => {
      op(Op.JumpUnless, labelOperand('ELSE'));

      if (curried) {
        op(Op.ResolveCurriedComponent, ownerOperand());
      } else {
        op(Op.ResolveDynamicComponent, ownerOperand(), isStrictMode());
      }

      op(Op.PushDynamicComponentInstance);
      InvokeNonStaticComponent(op, {
        capabilities: true,
        elementBlock,
        positional,
        named,
        atNames,
        blocks,
      });
      op(HighLevelBuilderOpcode.Label, 'ELSE');
    }
  );
}

function InvokeStaticComponent(
  op: PushStatementOp,
  { capabilities, layout, elementBlock, positional, named, blocks }: StaticComponent
): void {
  let { symbolTable } = layout;

  let bailOut =
    symbolTable.hasEval || hasCapability(capabilities, InternalComponentCapability.PrepareArgs);

  if (bailOut) {
    InvokeNonStaticComponent(op, {
      capabilities,
      elementBlock,
      positional,
      named,
      atNames: true,
      blocks,
      layout,
    });

    return;
  }

  op(Op.Fetch, $s0);
  op(Op.Dup, $sp, 1);
  op(Op.Load, $s0);
  op(MachineOp.PushFrame);

  // Setup arguments
  let { symbols } = symbolTable;

  // As we push values onto the stack, we store the symbols associated  with them
  // so that we can set them on the scope later on with SetVariable and SetBlock
  let blockSymbols: number[] = [];
  let argSymbols: number[] = [];
  let argNames: string[] = [];

  // First we push the blocks onto the stack
  let blockNames = blocks.names;

  // Starting with the attrs block, if it exists and is referenced in the component
  if (elementBlock !== null) {
    let symbol = symbols.indexOf(ATTRS_BLOCK);

    if (symbol !== -1) {
      PushYieldableBlock(op, elementBlock);
      blockSymbols.push(symbol);
    }
  }

  // Followed by the other blocks, if they exist and are referenced in the component.
  // Also store the index of the associated symbol.
  for (let i = 0; i < blockNames.length; i++) {
    let name = blockNames[i];
    let symbol = symbols.indexOf(`&${name}`);

    if (symbol !== -1) {
      PushYieldableBlock(op, blocks.get(name));
      blockSymbols.push(symbol);
    }
  }

  // Next up we have arguments. If the component has the `createArgs` capability,
  // then it wants access to the arguments in JavaScript. We can't know whether
  // or not an argument is used, so we have to give access to all of them.
  if (hasCapability(capabilities, InternalComponentCapability.CreateArgs)) {
    // First we push positional arguments
    let count = CompilePositional(op, positional);

    // setup the flags with the count of positionals, and to indicate that atNames
    // are used
    let flags = count << 4;
    flags |= 0b1000;

    let names: string[] = EMPTY_STRING_ARRAY as string[];

    // Next, if named args exist, push them all. If they have an associated symbol
    // in the invoked component (e.g. they are used within its template), we push
    // that symbol. If not, we still push the expression as it may be used, and
    // we store the symbol as -1 (this is used later).
    if (named !== null) {
      names = named[0];
      let val = named[1];

      for (let i = 0; i < val.length; i++) {
        let symbol = symbols.indexOf(names[i]);

        expr(op, val[i]);
        argSymbols.push(symbol);
      }
    }

    // Finally, push the VM arguments themselves. These args won't need access
    // to blocks (they aren't accessible from userland anyways), so we push an
    // empty array instead of the actual block names.
    op(Op.PushArgs, names, EMPTY_STRING_ARRAY, flags);

    // And push an extra pop operation to remove the args before we begin setting
    // variables on the local context
    argSymbols.push(-1);
  } else if (named !== null) {
    // If the component does not have the `createArgs` capability, then the only
    // expressions we need to push onto the stack are those that are actually
    // referenced in the template of the invoked component (e.g. have symbols).
    let names = named[0];
    let val = named[1];

    for (let i = 0; i < val.length; i++) {
      let name = names[i];
      let symbol = symbols.indexOf(name);

      if (symbol !== -1) {
        expr(op, val[i]);
        argSymbols.push(symbol);
        argNames.push(name);
      }
    }
  }

  op(Op.BeginComponentTransaction, $s0);

  if (hasCapability(capabilities, InternalComponentCapability.DynamicScope)) {
    op(Op.PushDynamicScope);
  }

  if (hasCapability(capabilities, InternalComponentCapability.CreateInstance)) {
    op(Op.CreateComponent, (blocks.has('default') as any) | 0, $s0);
  }

  op(Op.RegisterComponentDestructor, $s0);

  if (hasCapability(capabilities, InternalComponentCapability.CreateArgs)) {
    op(Op.GetComponentSelf, $s0);
  } else {
    op(Op.GetComponentSelf, $s0, argNames);
  }

  // Setup the new root scope for the component
  op(Op.RootScope, symbols.length + 1, Object.keys(blocks).length > 0 ? 1 : 0);

  // Pop the self reference off the stack and set it to the symbol for `this`
  // in the new scope. This is why all subsequent symbols are increased by one.
  op(Op.SetVariable, 0);

  // Going in reverse, now we pop the args/blocks off the stack, starting with
  // arguments, and assign them to their symbols in the new scope.
  for (let i = argSymbols.length - 1; i >= 0; i--) {
    let symbol = argSymbols[i];

    if (symbol === -1) {
      // The expression was not bound to a local symbol, it was only pushed to be
      // used with VM args in the javascript side
      op(Op.Pop, 1);
    } else {
      op(Op.SetVariable, symbol + 1);
    }
  }

  // if any positional params exist, pop them off the stack as well
  if (positional !== null) {
    op(Op.Pop, positional.length);
  }

  // Finish up by popping off and assigning blocks
  for (let i = blockSymbols.length - 1; i >= 0; i--) {
    let symbol = blockSymbols[i];

    op(Op.SetBlock, symbol + 1);
  }

  op(Op.Constant, layoutOperand(layout));
  op(Op.CompileBlock);
  op(MachineOp.InvokeVirtual);
  op(Op.DidRenderLayout, $s0);

  op(MachineOp.PopFrame);
  op(Op.PopScope);

  if (hasCapability(capabilities, InternalComponentCapability.DynamicScope)) {
    op(Op.PopDynamicScope);
  }

  op(Op.CommitComponentTransaction);
  op(Op.Load, $s0);
}

function InvokeNonStaticComponent(
  op: PushStatementOp,
  { capabilities, elementBlock, positional, named, atNames, blocks: namedBlocks, layout }: Component
): void {
  let bindableBlocks = !!namedBlocks;
  let bindableAtNames =
    capabilities === true ||
    hasCapability(capabilities, InternalComponentCapability.PrepareArgs) ||
    !!(named && named[0].length !== 0);

  let blocks = namedBlocks.with('attrs', elementBlock);

  op(Op.Fetch, $s0);
  op(Op.Dup, $sp, 1);
  op(Op.Load, $s0);

  op(MachineOp.PushFrame);
  CompileArgs(op, positional, named, blocks, atNames);
  op(Op.PrepareArgs, $s0);

  invokePreparedComponent(op, blocks.has('default'), bindableBlocks, bindableAtNames, () => {
    if (layout) {
      op(Op.PushSymbolTable, symbolTableOperand(layout.symbolTable));
      op(Op.Constant, layoutOperand(layout));
      op(Op.CompileBlock);
    } else {
      op(Op.GetComponentLayout, $s0);
    }

    op(Op.PopulateLayout, $s0);
  });

  op(Op.Load, $s0);
}

export function WrappedComponent(
  op: PushStatementOp,
  layout: LayoutWithContext,
  attrsBlockNumber: number
): void {
  op(HighLevelBuilderOpcode.StartLabels);
  WithSavedRegister(op, $s1, () => {
    op(Op.GetComponentTagName, $s0);
    op(Op.PrimitiveReference);
    op(Op.Dup, $sp, 0);
  });
  op(Op.JumpUnless, labelOperand('BODY'));
  op(Op.Fetch, $s1);
  op(Op.PutComponentOperations);
  op(Op.OpenDynamicElement);
  op(Op.DidCreateElement, $s0);
  YieldBlock(op, attrsBlockNumber, null);
  op(Op.FlushElement);
  op(HighLevelBuilderOpcode.Label, 'BODY');
  InvokeStaticBlock(op, [layout.block[0], []]);
  op(Op.Fetch, $s1);
  op(Op.JumpUnless, labelOperand('END'));
  op(Op.CloseElement);
  op(HighLevelBuilderOpcode.Label, 'END');
  op(Op.Load, $s1);
  op(HighLevelBuilderOpcode.StopLabels);
}

export function invokePreparedComponent(
  op: PushStatementOp,
  hasBlock: boolean,
  bindableBlocks: boolean,
  bindableAtNames: boolean,
  populateLayout: Option<() => void> = null
): void {
  op(Op.BeginComponentTransaction, $s0);
  op(Op.PushDynamicScope);

  op(Op.CreateComponent, (hasBlock as any) | 0, $s0);

  // this has to run after createComponent to allow
  // for late-bound layouts, but a caller is free
  // to populate the layout earlier if it wants to
  // and do nothing here.
  if (populateLayout) {
    populateLayout();
  }

  op(Op.RegisterComponentDestructor, $s0);
  op(Op.GetComponentSelf, $s0);

  op(Op.VirtualRootScope, $s0);
  op(Op.SetVariable, 0);
  op(Op.SetupForEval, $s0);

  if (bindableAtNames) op(Op.SetNamedVariables, $s0);
  if (bindableBlocks) op(Op.SetBlocks, $s0);

  op(Op.Pop, 1);
  op(Op.InvokeComponentLayout, $s0);
  op(Op.DidRenderLayout, $s0);
  op(MachineOp.PopFrame);

  op(Op.PopScope);
  op(Op.PopDynamicScope);
  op(Op.CommitComponentTransaction);
}

export function InvokeBareComponent(op: PushStatementOp): void {
  op(Op.Fetch, $s0);
  op(Op.Dup, $sp, 1);
  op(Op.Load, $s0);

  op(MachineOp.PushFrame);
  op(Op.PushEmptyArgs);
  op(Op.PrepareArgs, $s0);
  invokePreparedComponent(op, false, false, true, () => {
    op(Op.GetComponentLayout, $s0);
    op(Op.PopulateLayout, $s0);
  });
  op(Op.Load, $s0);
}

export function CurryComponent(
  op: PushExpressionOp,
  definition: WireFormat.Expression,
  positional: WireFormat.Core.Params,
  named: WireFormat.Core.Hash
): void {
  op(MachineOp.PushFrame);
  SimpleArgs(op, positional, named, false);
  op(Op.CaptureArgs);
  expr(op, definition);
  op(Op.CurryComponent, ownerOperand(), isStrictMode());
  op(MachineOp.PopFrame);
  op(Op.Fetch, $v0);
}

export function WithSavedRegister(
  op: PushExpressionOp,
  register: SavedRegister,
  block: () => void
): void {
  op(Op.Fetch, register);
  block();
  op(Op.Load, register);
}
