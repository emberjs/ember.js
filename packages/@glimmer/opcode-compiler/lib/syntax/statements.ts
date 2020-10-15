import {
  HighLevelBuilderOpcode,
  HighLevelResolutionOpcode,
  MachineOp,
  Op,
  SexpOpcodes,
  StatementCompileActions,
  StatementSexpOpcode,
  WellKnownAttrName,
  WellKnownTagName,
  WireFormat,
} from '@glimmer/interfaces';
import { EMPTY_STRING_ARRAY } from '@glimmer/util';
import { $fp, $sp } from '@glimmer/vm';
import { compilableBlock } from '../compilable-template';
import { op } from '../opcode-builder/encoder';
import {
  InvokeStaticBlock,
  InvokeStaticBlockWithStack,
  YieldBlock,
} from '../opcode-builder/helpers/blocks';
import { InvokeComponent, InvokeDynamicComponent } from '../opcode-builder/helpers/components';
import { Replayable, ReplayableIf } from '../opcode-builder/helpers/conditional';
import { CompilePositional, SimpleArgs } from '../opcode-builder/helpers/shared';
import { Call, DynamicScope, PushPrimitiveReference } from '../opcode-builder/helpers/vm';
import { arr, label, strArray, other } from '../opcode-builder/operands';
import { lookupLocal } from '../utils';
import { Compilers } from './compilers';
import { NONE } from './concat';
import {
  isGetFreeComponent,
  isGetFreeComponentOrHelper,
  isGetFreeOptionalComponentOrHelper,
} from './push-resolution';

export const STATEMENTS = new Compilers<StatementSexpOpcode, StatementCompileActions>();

const INFLATE_ATTR_TABLE: {
  [I in WellKnownAttrName]: string;
} = ['class', 'id', 'value', 'name', 'type', 'style', 'href'];
const INFLATE_TAG_TABLE: {
  [I in WellKnownTagName]: string;
} = ['div', 'span', 'p', 'a'];

export function inflateTagName(tagName: string | WellKnownTagName): string {
  return typeof tagName === 'string' ? tagName : INFLATE_TAG_TABLE[tagName];
}

export function inflateAttrName(attrName: string | WellKnownAttrName): string {
  return typeof attrName === 'string' ? attrName : INFLATE_ATTR_TABLE[attrName];
}

STATEMENTS.add(SexpOpcodes.Comment, (sexp) => op(Op.Comment, sexp[1]));
STATEMENTS.add(SexpOpcodes.CloseElement, () => op(Op.CloseElement));
STATEMENTS.add(SexpOpcodes.FlushElement, () => op(Op.FlushElement));

STATEMENTS.add(SexpOpcodes.Modifier, ([, expr, params, hash]) => {
  return op(HighLevelResolutionOpcode.ResolveModifier, {
    expr,
    then: (handle) => [
      op(MachineOp.PushFrame),
      SimpleArgs({ positional: params, named: hash, atNames: false }),
      op(Op.Modifier, handle),
      op(MachineOp.PopFrame),
    ],
  });
});

STATEMENTS.add(SexpOpcodes.StaticAttr, ([, name, value, namespace]) =>
  op(Op.StaticAttr, inflateAttrName(name), value as string, namespace ?? null)
);

STATEMENTS.add(SexpOpcodes.StaticComponentAttr, ([, name, value, namespace]) =>
  op(Op.StaticComponentAttr, inflateAttrName(name), value as string, namespace ?? null)
);

STATEMENTS.add(SexpOpcodes.DynamicAttr, ([, name, value, namespace]) => [
  op(HighLevelResolutionOpcode.Expr, value),
  op(Op.DynamicAttr, inflateAttrName(name), false, namespace ?? null),
]);

STATEMENTS.add(SexpOpcodes.TrustingDynamicAttr, ([, name, value, namespace]) => [
  op(HighLevelResolutionOpcode.Expr, value),
  op(Op.DynamicAttr, inflateAttrName(name), true, namespace ?? null),
]);

STATEMENTS.add(SexpOpcodes.ComponentAttr, ([, name, value, namespace]) => [
  op(HighLevelResolutionOpcode.Expr, value),
  op(Op.ComponentAttr, inflateAttrName(name), false, namespace ?? null),
]);

STATEMENTS.add(SexpOpcodes.TrustingComponentAttr, ([, name, value, namespace]) => [
  op(HighLevelResolutionOpcode.Expr, value),
  op(Op.ComponentAttr, inflateAttrName(name), true, namespace ?? null),
]);

STATEMENTS.add(SexpOpcodes.OpenElement, ([, tag]) => {
  return op(Op.OpenElement, inflateTagName(tag));
});

STATEMENTS.add(SexpOpcodes.OpenElementWithSplat, ([, tag]) => {
  return [op(Op.PutComponentOperations), op(Op.OpenElement, inflateTagName(tag))];
});

STATEMENTS.add(SexpOpcodes.Component, ([, expr, elementBlock, named, blocks], meta) => {
  if (isGetFreeComponent(expr)) {
    return op(HighLevelResolutionOpcode.ResolveComponent, {
      expr,
      then(component) {
        return InvokeComponent(meta, component, elementBlock, null, named, blocks);
      },
    });
  } else {
    // otherwise, the component name was an expression, so resolve the expression
    // and invoke it as a dynamic component
    return InvokeDynamicComponent(meta, expr, elementBlock, null, named, blocks, true, true);
  }
});

STATEMENTS.add(SexpOpcodes.Partial, ([, name, evalInfo], meta) =>
  ReplayableIf({
    args() {
      return {
        count: 2,
        actions: [op(HighLevelResolutionOpcode.Expr, name), op(Op.Dup, $sp, 0)],
      };
    },

    ifTrue() {
      return [
        op(
          Op.InvokePartial,
          other(meta.owner),
          strArray(meta.evalSymbols || EMPTY_STRING_ARRAY),
          arr(evalInfo)
        ),
        op(Op.PopScope),
        op(MachineOp.PopFrame),
      ];
    },
  })
);

STATEMENTS.add(SexpOpcodes.Yield, ([, to, params]) => YieldBlock(to, params));

STATEMENTS.add(SexpOpcodes.AttrSplat, ([, to]) => YieldBlock(to, null));

STATEMENTS.add(SexpOpcodes.Debugger, ([, evalInfo], meta) =>
  op(Op.Debugger, strArray(meta.evalSymbols || EMPTY_STRING_ARRAY), arr(evalInfo))
);

STATEMENTS.add(SexpOpcodes.Append, ([, value], meta) => {
  // Special case for static values
  if (!Array.isArray(value)) {
    return op(Op.Text, value === null || value === undefined ? '' : String(value));
  }

  if (isGetFreeOptionalComponentOrHelper(value)) {
    return op(HighLevelResolutionOpcode.ResolveOptionalComponentOrHelper, {
      expr: value,
      then(componentOrHandleOrName) {
        if (typeof componentOrHandleOrName === 'object') {
          // Resolved component handle, invoke the component directly
          return InvokeComponent(meta, componentOrHandleOrName, null, null, null, null);
        } else if (typeof componentOrHandleOrName === 'number') {
          // Resolved a helper handle, invoke the helper directly
          return [
            op(MachineOp.PushFrame),
            Call({ handle: componentOrHandleOrName, positional: null, named: null }),
            op(MachineOp.InvokeStatic, {
              type: 'stdlib',
              value: 'cautious-append',
            }),
            op(MachineOp.PopFrame),
          ];
        }

        // Fallback to {{this}} lookup
        return [
          op(MachineOp.PushFrame),
          lookupLocal(meta, componentOrHandleOrName),
          op(MachineOp.InvokeStatic, {
            type: 'stdlib',
            value: 'cautious-append',
          }),
          op(MachineOp.PopFrame),
        ];
      },
    });
  } else if (value[0] === SexpOpcodes.Call && isGetFreeComponentOrHelper(value[1])) {
    let [, expr, positional, named] = value;

    return op(HighLevelResolutionOpcode.ResolveComponentOrHelper, {
      expr,
      then(componentOrHandle) {
        if (typeof componentOrHandle === 'object') {
          // Resolved component handle, invoke the component directly
          return InvokeComponent(
            meta,
            componentOrHandle,
            null,
            positional,
            hashToArgs(named),
            null
          );
        }

        // Resolved a helper handle, invoke the helper directly
        return [
          op(MachineOp.PushFrame),
          Call({ handle: componentOrHandle, positional, named }),
          op(MachineOp.InvokeStatic, {
            type: 'stdlib',
            value: 'cautious-append',
          }),
          op(MachineOp.PopFrame),
        ];
      },
    });
  } else {
    return [
      op(MachineOp.PushFrame),
      op(HighLevelResolutionOpcode.Expr, value),
      op(MachineOp.InvokeStatic, {
        type: 'stdlib',
        value: 'cautious-append',
      }),
      op(MachineOp.PopFrame),
    ];
  }
});

STATEMENTS.add(SexpOpcodes.TrustingAppend, (sexp) => {
  let [, value] = sexp;

  if (typeof value === 'string') {
    return op(Op.Text, value);
  }
  // macro was ignoring trusting flag doesn't seem like {{{}}} should
  // even be passed to macros, there is no {{{component}}}
  return [
    op(MachineOp.PushFrame),
    op(HighLevelResolutionOpcode.Expr, value),
    op(MachineOp.InvokeStatic, {
      type: 'stdlib',
      value: 'trusting-append',
    }),
    op(MachineOp.PopFrame),
  ];
});

STATEMENTS.add(SexpOpcodes.Block, ([, expr, positional, named, blocks], meta) => {
  return op(HighLevelResolutionOpcode.ResolveComponent, {
    expr,
    then(component) {
      return InvokeComponent(meta, component, null, positional, hashToArgs(named), blocks);
    },
  });
});

STATEMENTS.add(SexpOpcodes.InElement, ([, block, guid, destination, insertBefore], meta) => {
  return ReplayableIf({
    args() {
      let actions: StatementCompileActions = [];

      // this order is important
      actions.push(op(HighLevelResolutionOpcode.Expr, guid));

      if (insertBefore === undefined) {
        actions.push(PushPrimitiveReference(undefined));
      } else {
        actions.push(op(HighLevelResolutionOpcode.Expr, insertBefore));
      }

      actions.push(op(HighLevelResolutionOpcode.Expr, destination), op(Op.Dup, $sp, 0));

      return { count: 4, actions };
    },

    ifTrue() {
      return [
        op(Op.PushRemoteElement),
        InvokeStaticBlock(compilableBlock(block, meta)),
        op(Op.PopRemoteElement),
      ];
    },
  });
});

STATEMENTS.add(SexpOpcodes.If, ([, condition, block, inverse], meta) =>
  ReplayableIf({
    args() {
      return {
        count: 1,
        actions: [op(HighLevelResolutionOpcode.Expr, condition), op(Op.ToBoolean)],
      };
    },

    ifTrue() {
      return InvokeStaticBlock(compilableBlock(block, meta));
    },

    ifFalse() {
      if (inverse) {
        return InvokeStaticBlock(compilableBlock(inverse, meta));
      } else {
        return NONE;
      }
    },
  })
);

STATEMENTS.add(SexpOpcodes.Unless, ([, condition, block, inverse], meta) =>
  ReplayableIf({
    args() {
      return {
        count: 1,
        actions: [op(HighLevelResolutionOpcode.Expr, condition), op(Op.ToBoolean)],
      };
    },

    ifTrue() {
      if (inverse) {
        return InvokeStaticBlock(compilableBlock(inverse, meta));
      } else {
        return NONE;
      }
    },

    ifFalse() {
      return InvokeStaticBlock(compilableBlock(block, meta));
    },
  })
);

STATEMENTS.add(SexpOpcodes.Each, ([, value, key, block, inverse], meta) =>
  Replayable({
    args() {
      let actions: StatementCompileActions;

      if (key) {
        actions = [op(HighLevelResolutionOpcode.Expr, key)];
      } else {
        actions = [PushPrimitiveReference(null)];
      }

      actions.push(op(HighLevelResolutionOpcode.Expr, value));

      return { count: 2, actions };
    },

    body() {
      let out: StatementCompileActions = [
        op(Op.EnterList, label('BODY'), label('ELSE')),
        op(MachineOp.PushFrame),
        op(Op.Dup, $fp, 1),
        op(MachineOp.ReturnTo, label('ITER')),
        op(HighLevelBuilderOpcode.Label, 'ITER'),
        op(Op.Iterate, label('BREAK')),
        op(HighLevelBuilderOpcode.Label, 'BODY'),
        InvokeStaticBlockWithStack(compilableBlock(block, meta), 2),
        op(Op.Pop, 2),
        op(MachineOp.Jump, label('FINALLY')),
        op(HighLevelBuilderOpcode.Label, 'BREAK'),
        op(MachineOp.PopFrame),
        op(Op.ExitList),
        op(MachineOp.Jump, label('FINALLY')),
        op(HighLevelBuilderOpcode.Label, 'ELSE'),
      ];

      if (inverse) {
        out.push(InvokeStaticBlock(compilableBlock(inverse, meta)));
      }

      return out;
    },
  })
);

STATEMENTS.add(SexpOpcodes.With, ([, value, block, inverse], meta) => {
  return ReplayableIf({
    args() {
      return {
        count: 2,
        actions: [op(HighLevelResolutionOpcode.Expr, value), op(Op.Dup, $sp, 0), op(Op.ToBoolean)],
      };
    },

    ifTrue() {
      return InvokeStaticBlockWithStack(compilableBlock(block, meta), 1);
    },

    ifFalse() {
      if (inverse) {
        return InvokeStaticBlock(compilableBlock(inverse, meta));
      } else {
        return NONE;
      }
    },
  });
});

STATEMENTS.add(SexpOpcodes.Let, ([, positional, block], meta) => {
  let { count, actions } = CompilePositional(positional);
  return [actions, InvokeStaticBlockWithStack(compilableBlock(block, meta), count)];
});

STATEMENTS.add(SexpOpcodes.WithDynamicVars, ([, named, block], meta) => {
  if (named) {
    let [names, expressions] = named;

    let { actions } = CompilePositional(expressions);

    return [
      actions,
      DynamicScope(names, () => {
        return InvokeStaticBlock(compilableBlock(block, meta));
      }),
    ];
  } else {
    return InvokeStaticBlock(compilableBlock(block, meta));
  }
});

STATEMENTS.add(SexpOpcodes.InvokeComponent, ([, expr, positional, named, blocks], meta) => {
  if (isGetFreeComponent(expr)) {
    return op(HighLevelResolutionOpcode.ResolveComponent, {
      expr,
      then(component) {
        return InvokeComponent(meta, component, null, positional, named, blocks);
      },
    });
  }

  return InvokeDynamicComponent(meta, expr, null, positional, named, blocks, false, false);
});

function hashToArgs(hash: WireFormat.Core.Hash | null): WireFormat.Core.Hash | null {
  if (hash === null) return null;
  let names = hash[0].map((key) => `@${key}`);
  return [names as [string, ...string[]], hash[1]];
}
