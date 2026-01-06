import type { BlockMetadata, CompilationContext, EvaluationContext } from '@glimmer/interfaces';

import { EncoderImpl } from './encoder';

export function templateCompilationContext(
  evaluation: EvaluationContext,
  meta: BlockMetadata
): CompilationContext {
  let encoder = new EncoderImpl(evaluation.program.heap, meta, evaluation.stdlib);

  return {
    evaluation,
    encoder,
    meta,
  };
}
