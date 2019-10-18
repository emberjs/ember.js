import { $s0 } from '@glimmer/vm';

import { invokePreparedComponent, InvokeBareComponent } from './components';
import { StdLib } from '../stdlib';
import { EncoderImpl, op } from '../encoder';
import {
  ContentType,
  Op,
  CompileActions,
  WholeProgramCompilationContext,
  TemplateCompilationContext,
} from '@glimmer/interfaces';
import { SwitchCases } from './conditional';
import { concat } from '../../syntax/concat';
import { MacrosImpl } from '../../syntax/macros';

export function main(): CompileActions {
  return [op(Op.Main, $s0), invokePreparedComponent(false, false, true)];
}

/**
 * Append content to the DOM. This standard function triages content and does the
 * right thing based upon whether it's a string, safe string, component, fragment
 * or node.
 *
 * @param trusting whether to interpolate a string as raw HTML (corresponds to
 * triple curlies)
 */
export function StdAppend(trusting: boolean): CompileActions {
  return [
    op(Op.ContentType),
    SwitchCases(when => {
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
        InvokeBareComponent(),
      ]);

      when(ContentType.SafeString, () => [op(Op.AssertSame), op(Op.AppendSafeHTML)]);
      when(ContentType.Fragment, () => [op(Op.AssertSame), op(Op.AppendDocumentFragment)]);
      when(ContentType.Node, () => [op(Op.AssertSame), op(Op.AppendNode)]);
    }),
  ];
}

export function compileStd(context: WholeProgramCompilationContext): StdLib {
  let mainHandle = build(context, main);
  let trustingGuardedAppend = build(context, () => StdAppend(true));
  let cautiousGuardedAppend = build(context, () => StdAppend(false));

  return new StdLib(mainHandle, trustingGuardedAppend, cautiousGuardedAppend);
}

const STDLIB_META = {
  asPartial: false,
  evalSymbols: null,
  upvars: null,

  // TODO: ??
  referrer: {},
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

  let result = encoder.commit(program.heap, 0);

  if (typeof result !== 'number') {
    // This shouldn't be possible
    throw new Error(`Unexpected errors compiling std`);
  } else {
    return result;
  }
}
