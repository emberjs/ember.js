import { $s0 } from '@glimmer/vm';

import { invokePreparedComponent, invokeBareComponent } from './components';
import { StdLib } from '../stdlib';
import { EncoderImpl, op } from '../encoder';
import {
  ContentType,
  Op,
  CompileActions,
  WholeProgramCompilationContext,
  TemplateCompilationContext,
} from '@glimmer/interfaces';
import { switchCases } from './conditional';
import { concat } from '../../syntax/concat';
import { MacrosImpl } from '../../syntax/macros';
import { templateMeta } from '@glimmer/util';

export function main(): CompileActions {
  return [op(Op.Main, $s0), invokePreparedComponent(false, false, true)];
}

export function stdAppend(trusting: boolean): CompileActions {
  return [
    op(Op.ContentType),
    switchCases(when => {
      when(ContentType.String, () => {
        if (trusting) {
          return [op(Op.AssertSame), op(Op.AppendHTML)];
        } else {
          return op(Op.AppendText);
        }
      });

      when(ContentType.Component, () => [
        op(Op.PushCurriedComponent),
        op(Op.PushDynamicComponentInstance),
        invokeBareComponent(),
      ]);

      when(ContentType.SafeString, () => [op(Op.AssertSame), op(Op.AppendSafeHTML)]);
      when(ContentType.Fragment, () => [op(Op.AssertSame), op(Op.AppendDocumentFragment)]);
      when(ContentType.Node, () => [op(Op.AssertSame), op(Op.AppendNode)]);
    }),
  ];
}

export function compileStd(context: WholeProgramCompilationContext): StdLib {
  let mainHandle = build(context, main);
  let trustingGuardedAppend = build(context, () => stdAppend(true));
  let cautiousGuardedAppend = build(context, () => stdAppend(false));

  return new StdLib(mainHandle, trustingGuardedAppend, cautiousGuardedAppend);
}

const STDLIB_META = {
  asPartial: false,
  evalSymbols: null,

  // TODO: ??
  referrer: templateMeta({}),
  size: 0,
};

function build(program: WholeProgramCompilationContext, callback: () => CompileActions): number {
  let encoder = new EncoderImpl();
  let macros = new MacrosImpl();

  let stdContext: TemplateCompilationContext = {
    encoder,
    meta: STDLIB_META,
    syntax: {
      macros,
      program,
    },
  };

  concat(stdContext, callback());
  return encoder.commit(program.heap, 0);
}
