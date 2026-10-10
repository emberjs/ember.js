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
  owner: object,
  options?: PrecompileOptions
): RenderResult {
  let template = preprocess(src, options, owner);

  let iterator = renderMain(context, owner, self, builder, unwrapTemplate(template).asLayout());
  return renderSync(context.env, iterator);
}
