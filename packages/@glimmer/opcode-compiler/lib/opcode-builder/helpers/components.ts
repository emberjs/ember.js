import {
  ContainingMetadata,
  Option,
  CompilableBlock,
  LayoutWithContext,
  WireFormat,
  Op,
  MachineOp,
  CompileActions,
  StatementCompileActions,
  NestedStatementCompileActions,
  ExpressionCompileActions,
  Unhandled,
  NamedBlocks,
  ComponentCapabilities,
  CompilableProgram,
  CompileTimeComponent,
  Owner,
} from '@glimmer/interfaces';

import { label, other, strArray } from '../operands';
import { resolveLayoutForTag } from '../../resolver';
import { $s0, $sp, $s1, $v0, SavedRegister } from '@glimmer/vm';
import { meta, CompileArgs, CompilePositional } from './shared';
import {
  YieldBlock,
  PushSymbolTable,
  InvokeStaticBlock,
  PushYieldableBlock,
  PushCompilable,
} from './blocks';
import { Replayable } from './conditional';
import { EMPTY_ARRAY } from '@glimmer/util';
import { op } from '../encoder';
import { UNHANDLED, NONE } from '../../syntax/concat';
import { compilableBlock } from '../../compilable-template';
import { NamedBlocksImpl } from '../../utils';
import { MacroContext } from '../../syntax/macros';
import { MINIMAL_CAPABILITIES } from '../delegate';

export const ATTRS_BLOCK = '&attrs';

export type Block = () => CompileActions;

interface AnyComponent {
  attrs: Option<CompilableBlock>;
  params: Option<WireFormat.Core.Params>;
  hash: WireFormat.Core.Hash;
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
  params: Option<WireFormat.Core.Params>;
  hash: WireFormat.Core.Hash;
  atNames: boolean;
}

// <Component>
export interface StaticComponent extends AnyComponent {
  capabilities: ComponentCapabilities;
  layout: CompilableProgram;
}

// chokepoint
export interface Component extends AnyComponent {
  // either we know the capabilities statically or we need to be conservative and assume
  // that the component requires all capabilities
  capabilities: ComponentCapabilities | true;

  // are the arguments supplied as atNames?
  atNames: boolean;

  // do we have the layout statically or will we need to look it up at runtime?
  layout?: CompilableProgram;
}

export function StaticComponentHelper(
  context: MacroContext,
  tag: string,
  hash: WireFormat.Core.Hash,
  template: Option<CompilableBlock>
): StatementCompileActions | Unhandled {
  let component = resolveLayoutForTag(tag, context);

  if (component !== null) {
    let { compilable, handle, capabilities } = component;

    if (compilable) {
      if (hash) {
        for (let i = 0; i < hash[0].length; i = i + 1) {
          hash[0][i] = `@${hash[0][i]}`;
        }
      }

      let out: StatementCompileActions = [op(Op.PushComponentDefinition, handle)];

      out.push(
        InvokeStaticComponent({
          capabilities,
          layout: compilable,
          attrs: null,
          params: null,
          hash,
          blocks: new NamedBlocksImpl({ default: template }),
        })
      );

      return out;
    }
  }

  return UNHANDLED;
}

export function InvokeStaticComponent({
  capabilities,
  layout,
  attrs,
  params,
  hash,
  blocks,
}: StaticComponent): StatementCompileActions {
  let { symbolTable } = layout;

  let bailOut = symbolTable.hasEval || capabilities.prepareArgs;

  if (bailOut) {
    return InvokeComponent({
      capabilities,
      attrs,
      params,
      hash,
      atNames: true,
      blocks,
      layout,
    });
  }

  let out: NestedStatementCompileActions = [
    op(Op.Fetch, $s0),
    op(Op.Dup, $sp, 1),
    op(Op.Load, $s0),
    op(MachineOp.PushFrame),
  ];

  // Setup arguments
  let { symbols } = symbolTable;

  // As we push values onto the stack, we store the symbols associated  with them
  // so that we can set them on the scope later on with SetVariable and SetBlock
  let blockSymbols: number[] = [];
  let argSymbols: number[] = [];

  // First we push the blocks onto the stack
  let blockNames = blocks.names;

  // Starting with the attrs block, if it exists and is referenced in the component
  if (attrs !== null) {
    let symbol = symbols.indexOf(ATTRS_BLOCK);

    if (symbol !== -1) {
      out.push(PushYieldableBlock(attrs));
      blockSymbols.push(symbol);
    }
  }

  // Followed by the other blocks, if they exist and are referenced in the component.
  // Also store the index of the associated symbol.
  for (let i = 0; i < blockNames.length; i++) {
    let name = blockNames[i];
    let symbol = symbols.indexOf(`&${name}`);

    if (symbol !== -1) {
      out.push(PushYieldableBlock(blocks.get(name)));
      blockSymbols.push(symbol);
    }
  }

  // Next up we have arguments. If the component has the `createArgs` capability,
  // then it wants access to the arguments in JavaScript. We can't know whether
  // or not an argument is used, so we have to give access to all of them.
  if (capabilities.createArgs) {
    // First we push positional arguments
    let { count, actions } = CompilePositional(params);

    out.push(actions);

    // setup the flags with the count of positionals, and to indicate that atNames
    // are used
    let flags = count << 4;
    flags |= 0b1000;

    let names: string[] = EMPTY_ARRAY;

    // Next, if named args exist, push them all. If they have an associated symbol
    // in the invoked component (e.g. they are used within its template), we push
    // that symbol. If not, we still push the expression as it may be used, and
    // we store the symbol as -1 (this is used later).
    if (hash !== null) {
      names = hash[0];
      let val = hash[1];

      for (let i = 0; i < val.length; i++) {
        let symbol = symbols.indexOf(names[i]);

        out.push(op('Expr', val[i]));
        argSymbols.push(symbol);
      }
    }

    // Finally, push the VM arguments themselves. These args won't need access
    // to blocks (they aren't accessible from userland anyways), so we push an
    // empty array instead of the actual block names.
    out.push(op(Op.PushArgs, strArray(names), strArray(EMPTY_ARRAY), flags));
  } else if (hash !== null) {
    // If the component does not have the `createArgs` capability, then the only
    // expressions we need to push onto the stack are those that are actually
    // referenced in the template of the invoked component (e.g. have symbols).
    let names = hash[0];
    let val = hash[1];

    for (let i = 0; i < val.length; i++) {
      let symbol = symbols.indexOf(names[i]);

      if (symbol !== -1) {
        out.push(op('Expr', val[i]));
        argSymbols.push(symbol);
      }
    }
  }

  out.push(op(Op.BeginComponentTransaction, $s0));

  if (capabilities.dynamicScope) {
    out.push(op(Op.PushDynamicScope));
  }

  if (capabilities.createInstance) {
    out.push(op(Op.CreateComponent, (blocks.has('default') as any) | 0, $s0));
  }

  if (capabilities.createArgs) {
    // Pop off the VM Args from the stack
    out.push(op(Op.Pop, 1));
  }

  out.push(
    op(Op.RegisterComponentDestructor, $s0),

    // Push component self onto the stack
    op(Op.GetComponentSelf, $s0),

    // Setup the new root scope for the component
    op(Op.RootScope, symbols.length + 1, Object.keys(blocks).length > 0 ? 1 : 0),

    // Pop the self reference off the stack and set it to the symbol for `this`
    // in the new scope. This is why all subsequent symbols are increased by one.
    op(Op.SetVariable, 0)
  );

  // Going in reverse, now we pop the args/blocks off the stack, starting with
  // arguments, and assign them to their symbols in the new scope.
  for (let i = argSymbols.length - 1; i >= 0; i--) {
    let symbol = argSymbols[i];

    if (symbol === -1) {
      // The expression was not bound to a local symbol, it was only pushed to be
      // used with VM args in the javascript side
      out.push(op(Op.Pop, 1));
    } else {
      out.push(op(Op.SetVariable, symbol + 1));
    }
  }

  // if any positional params exist, pop them off the stack as well
  if (params !== null) {
    out.push(op(Op.Pop, params.length));
  }

  // Finish up by popping off and assigning blocks
  for (let i = blockSymbols.length - 1; i >= 0; i--) {
    let symbol = blockSymbols[i];

    out.push(op(Op.SetBlock, symbol + 1));
  }

  out.push([op(Op.Constant, other(layout)), op(Op.CompileBlock), op(MachineOp.InvokeVirtual)]);
  out.push(op(Op.DidRenderLayout, $s0));

  out.push(op(MachineOp.PopFrame), op(Op.PopScope));

  if (capabilities.dynamicScope) {
    out.push(op(Op.PopDynamicScope));
  }

  out.push(op(Op.CommitComponentTransaction), op(Op.Load, $s0));

  return out;
}

export function InvokeDynamicComponent(
  meta: ContainingMetadata,
  { definition, attrs, params, hash, atNames, blocks, curried }: DynamicComponent
): StatementCompileActions {
  return Replayable({
    args: () => {
      return {
        count: 2,
        actions: [op('Expr', definition), op(Op.Dup, $sp, 0)],
      };
    },

    body: () => {
      return [
        op(Op.JumpUnless, label('ELSE')),
        curried
          ? op(Op.ResolveCurriedComponent)
          : op(Op.ResolveDynamicComponent, other(meta.owner)),
        op(Op.PushDynamicComponentInstance),
        InvokeComponent({
          capabilities: true,
          attrs,
          params,
          hash,
          atNames,
          blocks,
        }),
        op('Label', 'ELSE'),
      ];
    },
  });
}

export function WrappedComponent(
  layout: LayoutWithContext,
  attrsBlockNumber: number
): StatementCompileActions {
  return [
    op('StartLabels'),
    WithSavedRegister($s1, () => [
      op(Op.GetComponentTagName, $s0),
      op(Op.PrimitiveReference),
      op(Op.Dup, $sp, 0),
    ]),
    op(Op.JumpUnless, label('BODY')),
    op(Op.Fetch, $s1),
    op(Op.PutComponentOperations),
    op(Op.OpenDynamicElement),
    op(Op.DidCreateElement, $s0),
    YieldBlock(attrsBlockNumber, EMPTY_ARRAY),
    op(Op.FlushElement),
    op('Label', 'BODY'),
    InvokeStaticBlock(blockForLayout(layout)),
    op(Op.Fetch, $s1),
    op(Op.JumpUnless, label('END')),
    op(Op.CloseElement),
    op('Label', 'END'),
    op(Op.Load, $s1),
    op('StopLabels'),
  ];
}

export function StaticComponent(
  component: Option<CompileTimeComponent>,
  args: [WireFormat.Core.Params, WireFormat.Core.Hash, NamedBlocks]
): StatementCompileActions {
  let [params, hash, blocks] = args;

  if (component === null) return NONE;

  let { compilable, capabilities, handle } = component;

  if (compilable) {
    return [
      op(Op.PushComponentDefinition, handle),
      InvokeStaticComponent({
        capabilities: capabilities || MINIMAL_CAPABILITIES,
        layout: compilable,
        attrs: null,
        params,
        hash,
        blocks,
      }),
    ];
  } else {
    return [
      op(Op.PushComponentDefinition, handle),
      InvokeComponent({
        capabilities: capabilities || MINIMAL_CAPABILITIES,
        attrs: null,
        params,
        hash,
        atNames: true,
        blocks,
      }),
    ];
  }
}

export function InvokeComponent({
  capabilities,
  attrs,
  params,
  hash,
  atNames,
  blocks: namedBlocks,
  layout,
}: Component): StatementCompileActions {
  let bindableBlocks = !!namedBlocks;
  let bindableAtNames =
    capabilities === true || capabilities.prepareArgs || !!(hash && hash[0].length !== 0);

  let blocks = namedBlocks.with('attrs', attrs);

  return [
    op(Op.Fetch, $s0),
    op(Op.Dup, $sp, 1),
    op(Op.Load, $s0),

    op(MachineOp.PushFrame),
    CompileArgs({ params, hash, blocks, atNames }),
    op(Op.PrepareArgs, $s0),
    invokePreparedComponent(blocks.has('default'), bindableBlocks, bindableAtNames, () => {
      let out: NestedStatementCompileActions;

      if (layout) {
        out = [PushSymbolTable(layout.symbolTable), PushCompilable(layout), op(Op.CompileBlock)];
      } else {
        out = [op(Op.GetComponentLayout, $s0)];
      }

      out.push(op(Op.PopulateLayout, $s0));
      return out;
    }),
    op(Op.Load, $s0),
  ];
}

export function invokePreparedComponent<T extends CompileActions | StatementCompileActions>(
  hasBlock: boolean,
  bindableBlocks: boolean,
  bindableAtNames: boolean,
  populateLayout: Option<() => T> = null
): T {
  let out: StatementCompileActions = [
    op(Op.BeginComponentTransaction, $s0),
    op(Op.PushDynamicScope),

    op(Op.CreateComponent, (hasBlock as any) | 0, $s0),
  ];

  // this has to run after createComponent to allow
  // for late-bound layouts, but a caller is free
  // to populate the layout earlier if it wants to
  // and do nothing here.
  if (populateLayout) {
    out.push(populateLayout());
  }

  out.push(
    op(Op.RegisterComponentDestructor, $s0),
    op(Op.GetComponentSelf, $s0),

    op(Op.VirtualRootScope, $s0),
    op(Op.SetVariable, 0),
    op(Op.SetupForEval, $s0),

    bindableAtNames ? op(Op.SetNamedVariables, $s0) : NONE,
    bindableBlocks ? op(Op.SetBlocks, $s0) : NONE,

    op(Op.Pop, 1),
    op(Op.InvokeComponentLayout, $s0),
    op(Op.DidRenderLayout, $s0),
    op(MachineOp.PopFrame),

    op(Op.PopScope),
    op(Op.PopDynamicScope),
    op(Op.CommitComponentTransaction)
  );

  return out as T;
}

export function InvokeBareComponent(): CompileActions {
  return [
    op(Op.Fetch, $s0),
    op(Op.Dup, $sp, 1),
    op(Op.Load, $s0),

    op(MachineOp.PushFrame),
    op(Op.PushEmptyArgs),
    op(Op.PrepareArgs, $s0),
    invokePreparedComponent(false, false, true, () => [
      op(Op.GetComponentLayout, $s0),
      op(Op.PopulateLayout, $s0),
    ]),
    op(Op.Load, $s0),
  ];
}

export function curryComponent(
  { definition, params, hash, atNames }: CurryComponent,
  owner: Owner | null
): ExpressionCompileActions {
  return [
    op(MachineOp.PushFrame),
    op('SimpleArgs', { params, hash, atNames }),
    op(Op.CaptureArgs),
    op('Expr', definition),
    op(Op.CurryComponent, other(owner)),
    op(MachineOp.PopFrame),
    op(Op.Fetch, $v0),
  ];
}

function blockForLayout(layout: LayoutWithContext): CompilableBlock {
  return compilableBlock(layout.block.statements, meta(layout));
}

export function WithSavedRegister(register: SavedRegister, block: Block): CompileActions {
  return [op(Op.Fetch, register), block(), op(Op.Load, register)];
}
