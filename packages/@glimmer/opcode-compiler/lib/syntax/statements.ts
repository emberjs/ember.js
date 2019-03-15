import { StatementCompilers } from './compilers';
import {
  SexpOpcodes,
  Op,
  ResolveHandle,
  MachineOp,
  HighLevelResolutionOpcode,
} from '@glimmer/interfaces';
import { op } from '../opcode-builder/encoder';
import { serializable, strArray, arr } from '../opcode-builder/operands';
import { invokeStaticComponent, invokeComponent } from '../opcode-builder/helpers/components';
import { replayableIf } from '../opcode-builder/helpers/conditional';
import { yieldBlock } from '../opcode-builder/helpers/blocks';
import { EMPTY_ARRAY } from '@glimmer/util';
import { $sp } from '@glimmer/vm';

export const STATEMENTS = new StatementCompilers();

STATEMENTS.add(SexpOpcodes.Text, sexp => op(Op.Text, sexp[1]));
STATEMENTS.add(SexpOpcodes.Comment, sexp => op(Op.Comment, sexp[1]));
STATEMENTS.add(SexpOpcodes.CloseElement, () => op(Op.CloseElement));
STATEMENTS.add(SexpOpcodes.FlushElement, () => op(Op.FlushElement));

STATEMENTS.add(SexpOpcodes.Modifier, sexp => {
  let [, name, params, hash] = sexp;

  return op('IfResolved', {
    kind: ResolveHandle.Modifier,
    name,
    andThen: handle => [
      op(MachineOp.PushFrame),
      op('SimpleArgs', { params, hash, atNames: false }),
      op(Op.Modifier, handle),
      op(MachineOp.PopFrame),
    ],
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

STATEMENTS.add(SexpOpcodes.OpenElement, ([, tag]) => op(Op.OpenElement, tag));

STATEMENTS.add(SexpOpcodes.OpenSplattedElement, ([, tag]) => [
  op(Op.PutComponentOperations),
  op(Op.OpenElement, tag),
]);

STATEMENTS.add(SexpOpcodes.DynamicComponent, ([, definition, attrs, args, blocks]) => {
  return op('DynamicComponent', {
    definition,
    attrs,
    params: null,
    args,
    blocks,
    atNames: true,
  });
});

STATEMENTS.add(SexpOpcodes.Component, ([, tag, attrs, args, blocks]) => {
  return op('IfResolvedComponent', {
    name: tag,
    attrs,
    blocks,
    staticTemplate: (layoutHandle, capabilities, template, { blocks, attrs }) => {
      return [
        op(Op.PushComponentDefinition, layoutHandle),
        invokeStaticComponent({
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
        invokeComponent({
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
});

STATEMENTS.add(SexpOpcodes.Partial, ([, name, evalInfo], meta) =>
  replayableIf({
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
          serializable(meta.referrer),
          strArray(meta.evalSymbols!),
          arr(evalInfo)
        ),
        op(Op.PopScope),
        op(MachineOp.PopFrame),
      ];
    },
  })
);

STATEMENTS.add(SexpOpcodes.Yield, ([, to, params]) => yieldBlock(to, params));

STATEMENTS.add(SexpOpcodes.AttrSplat, ([, to]) => yieldBlock(to, EMPTY_ARRAY));

STATEMENTS.add(SexpOpcodes.Debugger, ([, evalInfo], meta) =>
  op(Op.Debugger, strArray(meta.evalSymbols!), arr(evalInfo))
);

STATEMENTS.add(SexpOpcodes.Append, sexp => {
  return op('CompileInline', {
    inline: sexp,
    ifUnhandled: () => [
      op(MachineOp.PushFrame),
      op(HighLevelResolutionOpcode.Expr, sexp[1]),
      op(MachineOp.InvokeStatic, {
        type: 'stdlib',
        value: sexp[2] ? 'trusting-append' : 'cautious-append',
      }),
      op(MachineOp.PopFrame),
    ],
  });
});

STATEMENTS.add(SexpOpcodes.Block, sexp => {
  return op('CompileBlock', sexp);
});
