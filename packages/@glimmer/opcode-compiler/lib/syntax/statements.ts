import { StatementCompilers } from './compilers';
import {
  SexpOpcodes,
  Op,
  ResolveHandle,
  MachineOp,
  HighLevelResolutionOpcode,
} from '@glimmer/interfaces';
import { op } from '../opcode-builder/encoder';
import { templateMeta, strArray, arr } from '../opcode-builder/operands';
import { InvokeStaticComponent, InvokeComponent } from '../opcode-builder/helpers/components';
import { ReplayableIf } from '../opcode-builder/helpers/conditional';
import { YieldBlock } from '../opcode-builder/helpers/blocks';
import { EMPTY_ARRAY } from '@glimmer/util';
import { $sp } from '@glimmer/vm';
import { expectString } from '../utils';

export const STATEMENTS = new StatementCompilers();

STATEMENTS.add(SexpOpcodes.Comment, sexp => op(Op.Comment, sexp[1]));
STATEMENTS.add(SexpOpcodes.CloseElement, () => op(Op.CloseElement));
STATEMENTS.add(SexpOpcodes.FlushElement, () => op(Op.FlushElement));

STATEMENTS.add(SexpOpcodes.Modifier, (sexp, meta) => {
  let [, , , name, params, hash] = sexp;

  let stringName = expectString(name, meta, 'Expected modifier head to be a string');

  if (typeof stringName !== 'string') {
    return stringName;
  }

  return op('IfResolved', {
    kind: ResolveHandle.Modifier,
    name: stringName,
    andThen: handle => [
      op(MachineOp.PushFrame),
      op('SimpleArgs', { params, hash, atNames: false }),
      op(Op.Modifier, handle),
      op(MachineOp.PopFrame),
    ],
    span: {
      start: 0,
      end: 0,
    },
  });
});

STATEMENTS.add(SexpOpcodes.StaticAttr, ([, name, value, namespace]) =>
  op(Op.StaticAttr, name, value, namespace)
);

STATEMENTS.add(SexpOpcodes.DynamicAttr, ([, name, value, namespace]) => [
  op('Expr', value),
  op(Op.DynamicAttr, name, false, namespace),
]);

STATEMENTS.add(SexpOpcodes.TrustingDynamicAttr, ([, name, value, namespace]) => [
  op('Expr', value),
  op(Op.DynamicAttr, name, true, namespace),
]);

STATEMENTS.add(SexpOpcodes.ComponentAttr, ([, name, value, namespace]) => [
  op('Expr', value),
  op(Op.ComponentAttr, name, false, namespace),
]);

STATEMENTS.add(SexpOpcodes.TrustingComponentAttr, ([, name, value, namespace]) => [
  op('Expr', value),
  op(Op.ComponentAttr, name, true, namespace),
]);

STATEMENTS.add(SexpOpcodes.OpenElement, ([, tag, simple]) => {
  if (simple) {
    return op(Op.OpenElement, tag);
  } else {
    return [op(Op.PutComponentOperations), op(Op.OpenElement, tag)];
  }
});

STATEMENTS.add(SexpOpcodes.Component, ([, tag, attrs, args, blocks]) => {
  if (typeof tag === 'string') {
    return op('IfResolvedComponent', {
      name: tag,
      attrs,
      blocks,
      staticTemplate: (layoutHandle, capabilities, template, { blocks, attrs }) => {
        return [
          op(Op.PushComponentDefinition, layoutHandle),
          InvokeStaticComponent({
            capabilities,
            layout: template,
            attrs,
            params: null,
            hash: args,
            blocks,
          }),
        ];
      },
      dynamicTemplate: (layoutHandle, capabilities, { attrs, blocks }) => {
        return [
          op(Op.PushComponentDefinition, layoutHandle),
          InvokeComponent({
            capabilities,
            attrs,
            params: null,
            hash: args,
            atNames: true,
            blocks,
          }),
        ];
      },
    });
  } else {
    return op('DynamicComponent', {
      definition: tag,
      attrs,
      params: null,
      args,
      blocks,
      atNames: true,
    });
  }
});

STATEMENTS.add(SexpOpcodes.Partial, ([, name, evalInfo], meta) =>
  ReplayableIf({
    args() {
      return {
        count: 2,
        actions: [op('Expr', name), op(Op.Dup, $sp, 0)],
      };
    },

    ifTrue() {
      return [
        op(
          Op.InvokePartial,
          templateMeta(meta.referrer),
          strArray(meta.evalSymbols!),
          arr(evalInfo)
        ),
        op(Op.PopScope),
        op(MachineOp.PopFrame),
      ];
    },
  })
);

STATEMENTS.add(SexpOpcodes.Yield, ([, to, params]) => YieldBlock(to, params));

STATEMENTS.add(SexpOpcodes.AttrSplat, ([, to]) => YieldBlock(to, EMPTY_ARRAY));

STATEMENTS.add(SexpOpcodes.Debugger, ([, evalInfo], meta) =>
  op(Op.Debugger, strArray(meta.evalSymbols!), arr(evalInfo))
);

STATEMENTS.add(SexpOpcodes.Append, sexp => {
  let [, trusted, , , value] = sexp;

  if (typeof value === 'string' && trusted) {
    return op(Op.Text, value);
  }

  return op('CompileInline', {
    inline: sexp,
    ifUnhandled: () => [
      op(MachineOp.PushFrame),
      op(HighLevelResolutionOpcode.Expr, value),
      op(MachineOp.InvokeStatic, {
        type: 'stdlib',
        value: trusted ? 'trusting-append' : 'cautious-append',
      }),
      op(MachineOp.PopFrame),
    ],
  });
});

STATEMENTS.add(SexpOpcodes.Block, sexp => {
  return op('CompileBlock', sexp);
});
