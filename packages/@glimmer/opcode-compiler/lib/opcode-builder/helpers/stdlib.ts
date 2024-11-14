import type { BlockMetadata, BuilderOp, EvaluationContext, HighLevelOp } from '@glimmer/interfaces';
import {
  VM_APPEND_DOCUMENT_FRAGMENT_OP,
  VM_APPEND_HTML_OP,
  VM_APPEND_NODE_OP,
  VM_APPEND_SAFE_HTML_OP,
  VM_APPEND_TEXT_OP,
  VM_ASSERT_SAME_OP,
  VM_CONTENT_TYPE_OP,
  VM_INVOKE_STATIC_OP,
  VM_MAIN_OP,
  VM_PUSH_DYNAMIC_COMPONENT_INSTANCE_OP,
  VM_RESOLVE_CURRIED_COMPONENT_OP,
} from '@glimmer/constants';
import { $s0, ContentType } from '@glimmer/vm';

import type { HighLevelStatementOp, PushStatementOp } from '../../syntax/compilers';

import { encodeOp, EncoderImpl } from '../encoder';
import { StdLib } from '../stdlib';
import { InvokeBareComponent, invokePreparedComponent } from './components';
import { SwitchCases } from './conditional';
import { CallDynamic } from './vm';

export function main(op: PushStatementOp): void {
  op(VM_MAIN_OP, $s0);
  invokePreparedComponent(op, false, false, true);
}

/**
 * Append content to the DOM. This standard function triages content and does the
 * right thing based upon whether it's a string, safe string, component, fragment
 * or node.
 *
 * @param trusting whether to interpolate a string as raw HTML (corresponds to
 * triple curlies)
 */
export function StdAppend(
  op: PushStatementOp,
  trusting: boolean,
  nonDynamicAppend: number | null
): void {
  SwitchCases(
    op,
    () => op(VM_CONTENT_TYPE_OP),
    (when) => {
      when(ContentType.String, () => {
        if (trusting) {
          op(VM_ASSERT_SAME_OP);
          op(VM_APPEND_HTML_OP);
        } else {
          op(VM_APPEND_TEXT_OP);
        }
      });

      if (typeof nonDynamicAppend === 'number') {
        when(ContentType.Component, () => {
          op(VM_RESOLVE_CURRIED_COMPONENT_OP);
          op(VM_PUSH_DYNAMIC_COMPONENT_INSTANCE_OP);
          InvokeBareComponent(op);
        });

        when(ContentType.Helper, () => {
          CallDynamic(op, null, null, () => {
            op(VM_INVOKE_STATIC_OP, nonDynamicAppend);
          });
        });
      } else {
        // when non-dynamic, we can no longer call the value (potentially because we've already called it)
        // this prevents infinite loops. We instead coerce the value, whatever it is, into the DOM.
        when(ContentType.Component, () => {
          op(VM_APPEND_TEXT_OP);
        });

        when(ContentType.Helper, () => {
          op(VM_APPEND_TEXT_OP);
        });
      }

      when(ContentType.SafeString, () => {
        op(VM_ASSERT_SAME_OP);
        op(VM_APPEND_SAFE_HTML_OP);
      });

      when(ContentType.Fragment, () => {
        op(VM_ASSERT_SAME_OP);
        op(VM_APPEND_DOCUMENT_FRAGMENT_OP);
      });

      when(ContentType.Node, () => {
        op(VM_ASSERT_SAME_OP);
        op(VM_APPEND_NODE_OP);
      });
    }
  );
}

export function compileStd(context: EvaluationContext): StdLib {
  let mainHandle = build(context, (op) => main(op));
  let trustingGuardedNonDynamicAppend = build(context, (op) => StdAppend(op, true, null));
  let cautiousGuardedNonDynamicAppend = build(context, (op) => StdAppend(op, false, null));

  let trustingGuardedDynamicAppend = build(context, (op) =>
    StdAppend(op, true, trustingGuardedNonDynamicAppend)
  );
  let cautiousGuardedDynamicAppend = build(context, (op) =>
    StdAppend(op, false, cautiousGuardedNonDynamicAppend)
  );

  return new StdLib(
    mainHandle,
    trustingGuardedDynamicAppend,
    cautiousGuardedDynamicAppend,
    trustingGuardedNonDynamicAppend,
    cautiousGuardedNonDynamicAppend
  );
}

export const STDLIB_META: BlockMetadata = {
  evalSymbols: null,
  upvars: null,
  moduleName: 'stdlib',

  // TODO: ??
  scopeValues: null,
  isStrictMode: true,
  owner: null,
  size: 0,
};

function build(evaluation: EvaluationContext, builder: (op: PushStatementOp) => void): number {
  let encoder = new EncoderImpl(evaluation.program.heap, STDLIB_META);

  function pushOp(...op: BuilderOp | HighLevelOp | HighLevelStatementOp) {
    encodeOp(encoder, evaluation, STDLIB_META, op as BuilderOp | HighLevelOp);
  }

  builder(pushOp);

  let result = encoder.commit(0);

  if (typeof result !== 'number') {
    // This shouldn't be possible
    throw new Error(`Unexpected errors compiling std`);
  } else {
    return result;
  }
}
