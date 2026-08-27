import type {
  BuilderOp,
  EvaluationContext,
  HandleResult,
  HighLevelOp,
  STDLib,
  StdlibBuilder,
} from '@glimmer/interfaces';

import { encodeOp, EncoderImpl } from './encoder';
import { MAIN, STDLIB_META } from './helpers/stdlib';

/**
 * Compiles each standard library routine the first time a template asks
 * for it, once per evaluation context. Compilation happens after the
 * template that asked has committed its own heap region, so the routine
 * never lands inside another program.
 */
export class StdlibImpl implements STDLib {
  private handles = new Map<StdlibBuilder, number>();

  constructor(private evaluation: EvaluationContext) {}

  get main(): number {
    return this.handle(MAIN);
  }

  handle(builder: StdlibBuilder): number {
    let handle = this.handles.get(builder);

    if (handle === undefined) {
      handle = this.compile(builder);
      this.handles.set(builder, handle);
    }

    return handle;
  }

  private compile(builder: StdlibBuilder): number {
    let { evaluation } = this;
    let encoder = new EncoderImpl(evaluation.program.heap, STDLIB_META, this);

    let pushOp = (...op: BuilderOp | HighLevelOp) => {
      encodeOp(encoder, evaluation, STDLIB_META, op);
    };

    builder.build(pushOp, this);

    let result: HandleResult = encoder.commit(0);

    if (typeof result !== 'number') {
      throw new Error(`Unexpected errors compiling stdlib routine ${builder.name}`);
    }

    return result;
  }
}
