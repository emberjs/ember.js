import { Compilers } from './compilers';
import {
  SexpOpcodes,
  Op,
  ResolveHandle,
  MachineOp,
  HighLevelResolutionOpcode,
  StatementSexpOpcode,
  StatementCompileActions,
  WellKnownAttrName,
  WellKnownTagName,
} from '@glimmer/interfaces';
import { op } from '../opcode-builder/encoder';
import { templateMeta, strArray, arr } from '../opcode-builder/operands';
import { InvokeStaticComponent, InvokeComponent } from '../opcode-builder/helpers/components';
import { ReplayableIf } from '../opcode-builder/helpers/conditional';
import { YieldBlock } from '../opcode-builder/helpers/blocks';
import { EMPTY_ARRAY } from '@glimmer/util';
import { $sp } from '@glimmer/vm';
import { expectString } from '../utils';

export const STATEMENTS = new Compilers<StatementSexpOpcode, StatementCompileActions>();

const INFLATE_ATTR_TABLE: {
  [I in WellKnownAttrName]: string;
} = ['class', 'id', 'value', 'name', 'type', 'style', 'href'];
const INFLATE_TAG_TABLE: {
  [I in WellKnownTagName]: string;
} = ['div', 'span', 'p', 'a'];

export function inflateTagName(tagName: string | WellKnownTagName) {
  return typeof tagName === 'string' ? tagName : INFLATE_TAG_TABLE[tagName];
}

export function inflateAttrName(attrName: string | WellKnownAttrName) {
  return typeof attrName === 'string' ? attrName : INFLATE_ATTR_TABLE[attrName];
}

STATEMENTS.add(SexpOpcodes.Comment, sexp => op(Op.Comment, sexp[1]));
STATEMENTS.add(SexpOpcodes.CloseElement, () => op(Op.CloseElement));
STATEMENTS.add(SexpOpcodes.FlushElement, () => op(Op.FlushElement));

STATEMENTS.add(SexpOpcodes.Modifier, (sexp, meta) => {
  let [, name, params, hash] = sexp;

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
  op(Op.StaticAttr, inflateAttrName(name), value, namespace ?? null)
);

STATEMENTS.add(SexpOpcodes.StaticComponentAttr, ([, name, value, namespace]) =>
  op(Op.StaticComponentAttr, inflateAttrName(name), value, namespace ?? null)
);

STATEMENTS.add(SexpOpcodes.DynamicAttr, ([, name, value, namespace]) => [
  op('Expr', value),
  op(Op.DynamicAttr, inflateAttrName(name), false, namespace ?? null),
]);

STATEMENTS.add(SexpOpcodes.TrustingDynamicAttr, ([, name, value, namespace]) => [
  op('Expr', value),
  op(Op.DynamicAttr, inflateAttrName(name), true, namespace ?? null),
]);

STATEMENTS.add(SexpOpcodes.ComponentAttr, ([, name, value, namespace]) => [
  op('Expr', value),
  op(Op.ComponentAttr, inflateAttrName(name), false, namespace ?? null),
]);

STATEMENTS.add(SexpOpcodes.TrustingComponentAttr, ([, name, value, namespace]) => [
  op('Expr', value),
  op(Op.ComponentAttr, inflateAttrName(name), true, namespace ?? null),
]);

STATEMENTS.add(SexpOpcodes.OpenElement, ([, tag]) => {
  return op(Op.OpenElement, inflateTagName(tag));
});

STATEMENTS.add(SexpOpcodes.OpenElementWithSplat, ([, tag]) => {
  return [op(Op.PutComponentOperations), op(Op.OpenElement, inflateTagName(tag))];
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
  let [, value] = sexp;

  return op('CompileInline', {
    inline: sexp,
    ifUnhandled: () => [
      op(MachineOp.PushFrame),
      op(HighLevelResolutionOpcode.Expr, value),
      op(MachineOp.InvokeStatic, {
        type: 'stdlib',
        value: 'cautious-append',
      }),
      op(MachineOp.PopFrame),
    ],
  });
});

STATEMENTS.add(SexpOpcodes.TrustingAppend, sexp => {
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

STATEMENTS.add(SexpOpcodes.Block, sexp => {
  return op('CompileBlock', sexp);
});
