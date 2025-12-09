import type { EvaluationContext, RenderResult, TreeBuilder } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import type { PrecompileOptions } from '@glimmer/syntax';
import { unwrapTemplate } from '@glimmer/debug-util';
import { renderMain, renderSync } from '@glimmer/runtime';

import { preprocess } from '../../compile';

export function renderTemplate(
  src: string,
  context: EvaluationContext,
  self: Reference,
  builder: TreeBuilder,
  options?: PrecompileOptions
): RenderResult {
  let template = preprocess(src, options);

  let iterator = renderMain(context, {}, self, builder, unwrapTemplate(template).asLayout());
  return renderSync(context.env, iterator);
}
