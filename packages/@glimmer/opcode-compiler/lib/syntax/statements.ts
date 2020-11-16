import {
  HighLevelResolutionOpcode,
  MachineOp,
  Op,
  ResolveHandle,
  SexpOpcodes,
  StatementCompileActions,
  StatementSexpOpcode,
  WellKnownAttrName,
  WellKnownTagName,
} from '@glimmer/interfaces';
import { EMPTY_STRING_ARRAY } from '@glimmer/util';
import { $sp } from '@glimmer/vm';
import { getStringFromValue, isStringLiteral } from '@glimmer/wire-format';
import { compilableBlock } from '../compilable-template';
import { op } from '../opcode-builder/encoder';
import { InvokeStaticBlock, YieldBlock } from '../opcode-builder/helpers/blocks';
import { InvokeComponent, InvokeStaticComponent } from '../opcode-builder/helpers/components';
import { ReplayableIf } from '../opcode-builder/helpers/conditional';
import { PushPrimitiveReference } from '../opcode-builder/helpers/vm';
import { arr, strArray, other } from '../opcode-builder/operands';
import { expectLooseFreeVariable, isStrictFreeVariable } from '../utils';
import { Compilers } from './compilers';

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

STATEMENTS.add(SexpOpcodes.Modifier, (sexp, meta) => {
  let [, name, params, hash] = sexp;

  let stringName = expectLooseFreeVariable(name, meta, 'Expected modifier head to be a string');

  if (typeof stringName !== 'string') {
    return stringName;
  }

  return op('IfResolved', {
    kind: ResolveHandle.Modifier,
    name: stringName,
    andThen: (handle) => [
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
  op(Op.StaticAttr, inflateAttrName(name), value as string, namespace ?? null)
);

STATEMENTS.add(SexpOpcodes.StaticComponentAttr, ([, name, value, namespace]) =>
  op(Op.StaticComponentAttr, inflateAttrName(name), value as string, namespace ?? null)
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

STATEMENTS.add(SexpOpcodes.Component, ([, tag, elementBlock, args, blocks], meta) => {
  let componentName: string | null = null;

  if (Array.isArray(tag) && tag[0] === SexpOpcodes.GetFreeAsComponentHead) {
    componentName = meta.upvars![tag[1]];
  }

  if (componentName !== null) {
    // The component name was a free variable lookup; in non-strict mode, this means we'll
    // use the runtime resolver to resolve the component
    return op('IfResolvedComponent', {
      name: componentName,
      elementBlock,
      blocks,
      staticTemplate: (layoutHandle, capabilities, template, { blocks, elementBlock }) => {
        return [
          op(Op.PushComponentDefinition, layoutHandle),
          InvokeStaticComponent({
            capabilities,
            layout: template,
            elementBlock,
            params: null,
            hash: args,
            blocks,
          }),
        ];
      },
      dynamicTemplate: (layoutHandle, capabilities, { elementBlock, blocks }) => {
        return [
          op(Op.PushComponentDefinition, layoutHandle),
          InvokeComponent({
            capabilities,
            elementBlock,
            params: null,
            hash: args,
            atNames: true,
            blocks,
          }),
        ];
      },
    });
  } else if (isStrictFreeVariable(tag)) {
    // Strict Mode Note: In strict mode, a free variable (without context) is a variable whose value is known
    // at compile-time, and therefore this should not be compiled as a DynamicComponent (which needs to insert
    // guards to handle dynamic changes to the value of the component at runtime)
    throw new Error(`unimplemented strict mode`);
  } else {
    // otherwise, the component name was an expression, so resolve the expression and invoke it as a dynamic
    // component
    return op('DynamicComponent', {
      definition: tag,
      elementBlock,
      params: null,
      args,
      blocks,
      atNames: true,
      curried: true,
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

STATEMENTS.add(SexpOpcodes.Append, (sexp) => {
  let [, value] = sexp;

  // Special case for static strings
  if (isStringLiteral(value)) {
    return op(Op.Text, getStringFromValue(value));
  }

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

STATEMENTS.add(SexpOpcodes.Block, (sexp) => {
  return op('CompileBlock', sexp);
});

STATEMENTS.add(SexpOpcodes.InElement, ([, block, guid, destination, insertBefore], meta) => {
  return ReplayableIf({
    args() {
      let actions: StatementCompileActions = [];

      // this order is important
      actions.push(op('Expr', guid));

      if (insertBefore === undefined) {
        actions.push(PushPrimitiveReference(undefined));
      } else {
        actions.push(op('Expr', insertBefore));
      }

      actions.push(op('Expr', destination), op(Op.Dup, $sp, 0));

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
