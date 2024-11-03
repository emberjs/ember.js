import type {
  CapabilityMask,
  CompilableProgram,
  CompileTimeComponent,
  LayoutWithContext,
  NamedBlocks,
  Nullable,
  WireFormat,
} from '@glimmer/interfaces';
import type { SavedRegister } from '@glimmer/vm';
import {
  VM_BEGIN_COMPONENT_TRANSACTION_OP,
  VM_CLOSE_ELEMENT_OP,
  VM_COMMIT_COMPONENT_TRANSACTION_OP,
  VM_COMPILE_BLOCK_OP,
  VM_CONSTANT_OP,
  VM_CREATE_COMPONENT_OP,
  VM_DID_CREATE_ELEMENT_OP,
  VM_DID_RENDER_LAYOUT_OP,
  VM_DUP_OP,
  VM_FETCH_OP,
  VM_FLUSH_ELEMENT_OP,
  VM_GET_COMPONENT_LAYOUT_OP,
  VM_GET_COMPONENT_SELF_OP,
  VM_GET_COMPONENT_TAG_NAME_OP,
  VM_INVOKE_COMPONENT_LAYOUT_OP,
  VM_INVOKE_VIRTUAL_OP,
  VM_JUMP_UNLESS_OP,
  VM_LOAD_OP,
  VM_OPEN_DYNAMIC_ELEMENT_OP,
  VM_POP_DYNAMIC_SCOPE_OP,
  VM_POP_FRAME_OP,
  VM_POP_OP,
  VM_POP_SCOPE_OP,
  VM_POPULATE_LAYOUT_OP,
  VM_PREPARE_ARGS_OP,
  VM_PRIMITIVE_REFERENCE_OP,
  VM_PUSH_ARGS_OP,
  VM_PUSH_COMPONENT_DEFINITION_OP,
  VM_PUSH_DYNAMIC_COMPONENT_INSTANCE_OP,
  VM_PUSH_DYNAMIC_SCOPE_OP,
  VM_PUSH_EMPTY_ARGS_OP,
  VM_PUSH_FRAME_OP,
  VM_PUSH_SYMBOL_TABLE_OP,
  VM_PUT_COMPONENT_OPERATIONS_OP,
  VM_REGISTER_COMPONENT_DESTRUCTOR_OP,
  VM_RESOLVE_CURRIED_COMPONENT_OP,
  VM_RESOLVE_DYNAMIC_COMPONENT_OP,
  VM_ROOT_SCOPE_OP,
  VM_SET_BLOCK_OP,
  VM_SET_BLOCKS_OP,
  VM_SET_NAMED_VARIABLES_OP,
  VM_SET_VARIABLE_OP,
  VM_SETUP_FOR_EVAL_OP,
  VM_VIRTUAL_ROOT_SCOPE_OP,
} from '@glimmer/constants';
import { unwrap } from '@glimmer/debug-util';
import { hasCapability } from '@glimmer/manager';
import { EMPTY_STRING_ARRAY, reverse } from '@glimmer/util';
import { $s0, $s1, $sp, InternalComponentCapabilities } from '@glimmer/vm';

import type { PushExpressionOp, PushStatementOp } from '../../syntax/compilers';

import { namedBlocks } from '../../utils';
import { HighLevelBuilderOpcodes } from '../opcodes';
import { isStrictMode, labelOperand, layoutOperand, symbolTableOperand } from '../operands';
import { InvokeStaticBlock, PushYieldableBlock, YieldBlock } from './blocks';
import { Replayable } from './conditional';
import { expr } from './expr';
import { CompileArgs, CompilePositional } from './shared';

export const ATTRS_BLOCK = '&attrs';

interface AnyComponent {
  elementBlock: Nullable<WireFormat.SerializedInlineBlock>;
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

// <Component>
export interface StaticComponent extends AnyComponent {
  capabilities: CapabilityMask;
  layout: CompilableProgram;
}

// chokepoint
export interface Component extends AnyComponent {
  // either we know the capabilities statically or we need to be conservative and assume
  // that the component requires all capabilities
  capabilities: CapabilityMask | true;

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
    op(VM_PUSH_COMPONENT_DEFINITION_OP, handle);
    InvokeStaticComponent(op, {
      capabilities: capabilities,
      layout: compilable,
      elementBlock,
      positional,
      named,
      blocks,
    });
  } else {
    op(VM_PUSH_COMPONENT_DEFINITION_OP, handle);
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
      op(VM_DUP_OP, $sp, 0);
      return 2;
    },

    () => {
      op(VM_JUMP_UNLESS_OP, labelOperand('ELSE'));

      if (curried) {
        op(VM_RESOLVE_CURRIED_COMPONENT_OP);
      } else {
        op(VM_RESOLVE_DYNAMIC_COMPONENT_OP, isStrictMode());
      }

      op(VM_PUSH_DYNAMIC_COMPONENT_INSTANCE_OP);
      InvokeNonStaticComponent(op, {
        capabilities: true,
        elementBlock,
        positional,
        named,
        atNames,
        blocks,
      });
      op(HighLevelBuilderOpcodes.Label, 'ELSE');
    }
  );
}

function InvokeStaticComponent(
  op: PushStatementOp,
  { capabilities, layout, elementBlock, positional, named, blocks }: StaticComponent
): void {
  let { symbolTable } = layout;

  let bailOut =
    symbolTable.hasEval || hasCapability(capabilities, InternalComponentCapabilities.prepareArgs);

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

  op(VM_FETCH_OP, $s0);
  op(VM_DUP_OP, $sp, 1);
  op(VM_LOAD_OP, $s0);
  op(VM_PUSH_FRAME_OP);

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
  for (const name of blockNames) {
    let symbol = symbols.indexOf(`&${name}`);

    if (symbol !== -1) {
      PushYieldableBlock(op, blocks.get(name));
      blockSymbols.push(symbol);
    }
  }

  // Next up we have arguments. If the component has the `createArgs` capability,
  // then it wants access to the arguments in JavaScript. We can't know whether
  // or not an argument is used, so we have to give access to all of them.
  if (hasCapability(capabilities, InternalComponentCapabilities.createArgs)) {
    // First we push positional arguments
    let count = CompilePositional(op, positional);

    // setup the flags with the count of positionals, and to indicate that atNames
    // are used
    let flags = count << 4;
    flags |= 0b1000;

    let names: string[] = EMPTY_STRING_ARRAY;

    // Next, if named args exist, push them all. If they have an associated symbol
    // in the invoked component (e.g. they are used within its template), we push
    // that symbol. If not, we still push the expression as it may be used, and
    // we store the symbol as -1 (this is used later).
    if (named !== null) {
      names = named[0];
      let val = named[1];

      for (let i = 0; i < val.length; i++) {
        let symbol = symbols.indexOf(unwrap(names[i]));

        expr(op, val[i]);
        argSymbols.push(symbol);
      }
    }

    // Finally, push the VM arguments themselves. These args won't need access
    // to blocks (they aren't accessible from userland anyways), so we push an
    // empty array instead of the actual block names.
    op(VM_PUSH_ARGS_OP, names, EMPTY_STRING_ARRAY, flags);

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
      let name = unwrap(names[i]);
      let symbol = symbols.indexOf(name);

      if (symbol !== -1) {
        expr(op, val[i]);
        argSymbols.push(symbol);
        argNames.push(name);
      }
    }
  }

  op(VM_BEGIN_COMPONENT_TRANSACTION_OP, $s0);

  if (hasCapability(capabilities, InternalComponentCapabilities.dynamicScope)) {
    op(VM_PUSH_DYNAMIC_SCOPE_OP);
  }

  if (hasCapability(capabilities, InternalComponentCapabilities.createInstance)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    op(VM_CREATE_COMPONENT_OP, (blocks.has('default') as any) | 0, $s0);
  }

  op(VM_REGISTER_COMPONENT_DESTRUCTOR_OP, $s0);

  if (hasCapability(capabilities, InternalComponentCapabilities.createArgs)) {
    op(VM_GET_COMPONENT_SELF_OP, $s0);
  } else {
    op(VM_GET_COMPONENT_SELF_OP, $s0, argNames);
  }

  // Setup the new root scope for the component
  op(VM_ROOT_SCOPE_OP, symbols.length + 1, Object.keys(blocks).length > 0 ? 1 : 0);

  // Pop the self reference off the stack and set it to the symbol for `this`
  // in the new scope. This is why all subsequent symbols are increased by one.
  op(VM_SET_VARIABLE_OP, 0);

  // Going in reverse, now we pop the args/blocks off the stack, starting with
  // arguments, and assign them to their symbols in the new scope.
  for (const symbol of reverse(argSymbols)) {
    // for (let i = argSymbols.length - 1; i >= 0; i--) {
    //   let symbol = argSymbols[i];

    if (symbol === -1) {
      // The expression was not bound to a local symbol, it was only pushed to be
      // used with VM args in the javascript side
      op(VM_POP_OP, 1);
    } else {
      op(VM_SET_VARIABLE_OP, symbol + 1);
    }
  }

  // if any positional params exist, pop them off the stack as well
  if (positional !== null) {
    op(VM_POP_OP, positional.length);
  }

  // Finish up by popping off and assigning blocks
  for (const symbol of reverse(blockSymbols)) {
    op(VM_SET_BLOCK_OP, symbol + 1);
  }

  op(VM_CONSTANT_OP, layoutOperand(layout));
  op(VM_COMPILE_BLOCK_OP);
  op(VM_INVOKE_VIRTUAL_OP);
  op(VM_DID_RENDER_LAYOUT_OP, $s0);

  op(VM_POP_FRAME_OP);
  op(VM_POP_SCOPE_OP);

  if (hasCapability(capabilities, InternalComponentCapabilities.dynamicScope)) {
    op(VM_POP_DYNAMIC_SCOPE_OP);
  }

  op(VM_COMMIT_COMPONENT_TRANSACTION_OP);
  op(VM_LOAD_OP, $s0);
}

export function InvokeNonStaticComponent(
  op: PushStatementOp,
  { capabilities, elementBlock, positional, named, atNames, blocks: namedBlocks, layout }: Component
): void {
  let bindableBlocks = !!namedBlocks;
  let bindableAtNames =
    capabilities === true ||
    hasCapability(capabilities, InternalComponentCapabilities.prepareArgs) ||
    !!(named && named[0].length !== 0);

  let blocks = namedBlocks.with('attrs', elementBlock);

  op(VM_FETCH_OP, $s0);
  op(VM_DUP_OP, $sp, 1);
  op(VM_LOAD_OP, $s0);

  op(VM_PUSH_FRAME_OP);
  CompileArgs(op, positional, named, blocks, atNames);
  op(VM_PREPARE_ARGS_OP, $s0);

  invokePreparedComponent(op, blocks.has('default'), bindableBlocks, bindableAtNames, () => {
    if (layout) {
      op(VM_PUSH_SYMBOL_TABLE_OP, symbolTableOperand(layout.symbolTable));
      op(VM_CONSTANT_OP, layoutOperand(layout));
      op(VM_COMPILE_BLOCK_OP);
    } else {
      op(VM_GET_COMPONENT_LAYOUT_OP, $s0);
    }

    op(VM_POPULATE_LAYOUT_OP, $s0);
  });

  op(VM_LOAD_OP, $s0);
}

export function WrappedComponent(
  op: PushStatementOp,
  layout: LayoutWithContext,
  attrsBlockNumber: number
): void {
  op(HighLevelBuilderOpcodes.StartLabels);
  WithSavedRegister(op, $s1, () => {
    op(VM_GET_COMPONENT_TAG_NAME_OP, $s0);
    op(VM_PRIMITIVE_REFERENCE_OP);
    op(VM_DUP_OP, $sp, 0);
  });
  op(VM_JUMP_UNLESS_OP, labelOperand('BODY'));
  op(VM_FETCH_OP, $s1);
  op(VM_PUT_COMPONENT_OPERATIONS_OP);
  op(VM_OPEN_DYNAMIC_ELEMENT_OP);
  op(VM_DID_CREATE_ELEMENT_OP, $s0);
  YieldBlock(op, attrsBlockNumber, null);
  op(VM_FLUSH_ELEMENT_OP);
  op(HighLevelBuilderOpcodes.Label, 'BODY');
  InvokeStaticBlock(op, [layout.block[0], []]);
  op(VM_FETCH_OP, $s1);
  op(VM_JUMP_UNLESS_OP, labelOperand('END'));
  op(VM_CLOSE_ELEMENT_OP);
  op(HighLevelBuilderOpcodes.Label, 'END');
  op(VM_LOAD_OP, $s1);
  op(HighLevelBuilderOpcodes.StopLabels);
}

export function invokePreparedComponent(
  op: PushStatementOp,
  hasBlock: boolean,
  bindableBlocks: boolean,
  bindableAtNames: boolean,
  populateLayout: Nullable<() => void> = null
): void {
  op(VM_BEGIN_COMPONENT_TRANSACTION_OP, $s0);
  op(VM_PUSH_DYNAMIC_SCOPE_OP);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  op(VM_CREATE_COMPONENT_OP, (hasBlock as any) | 0, $s0);

  // this has to run after createComponent to allow
  // for late-bound layouts, but a caller is free
  // to populate the layout earlier if it wants to
  // and do nothing here.
  if (populateLayout) {
    populateLayout();
  }

  op(VM_REGISTER_COMPONENT_DESTRUCTOR_OP, $s0);
  op(VM_GET_COMPONENT_SELF_OP, $s0);

  op(VM_VIRTUAL_ROOT_SCOPE_OP, $s0);
  op(VM_SET_VARIABLE_OP, 0);
  op(VM_SETUP_FOR_EVAL_OP, $s0);

  if (bindableAtNames) op(VM_SET_NAMED_VARIABLES_OP, $s0);
  if (bindableBlocks) op(VM_SET_BLOCKS_OP, $s0);

  op(VM_POP_OP, 1);
  op(VM_INVOKE_COMPONENT_LAYOUT_OP, $s0);
  op(VM_DID_RENDER_LAYOUT_OP, $s0);
  op(VM_POP_FRAME_OP);

  op(VM_POP_SCOPE_OP);
  op(VM_POP_DYNAMIC_SCOPE_OP);
  op(VM_COMMIT_COMPONENT_TRANSACTION_OP);
}

export function InvokeBareComponent(op: PushStatementOp): void {
  op(VM_FETCH_OP, $s0);
  op(VM_DUP_OP, $sp, 1);
  op(VM_LOAD_OP, $s0);

  op(VM_PUSH_FRAME_OP);
  op(VM_PUSH_EMPTY_ARGS_OP);
  op(VM_PREPARE_ARGS_OP, $s0);
  invokePreparedComponent(op, false, false, true, () => {
    op(VM_GET_COMPONENT_LAYOUT_OP, $s0);
    op(VM_POPULATE_LAYOUT_OP, $s0);
  });
  op(VM_LOAD_OP, $s0);
}

export function WithSavedRegister(
  op: PushExpressionOp,
  register: SavedRegister,
  block: () => void
): void {
  op(VM_FETCH_OP, register);
  block();
  op(VM_LOAD_OP, register);
}
