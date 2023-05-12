import type { ElementBuilder, RenderResult } from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import { renderMain, renderSync } from '@glimmer/runtime';
import type { PrecompileOptions } from '@glimmer/syntax';
import { unwrapTemplate } from '@glimmer/util';

import { preprocess } from '../../compile';
import type { JitTestDelegateContext } from './delegate';

export function renderTemplate(
  src: string,
  { runtime, program }: JitTestDelegateContext,
  self: Reference,
  builder: ElementBuilder,
  options?: PrecompileOptions
): RenderResult {
  let template = preprocess(src, options);

  let iterator = renderMain(
    runtime,
    program,
    {},
    self,
    builder,
    unwrapTemplate(template).asLayout()
  );
  return renderSync(runtime.env, iterator);
}
