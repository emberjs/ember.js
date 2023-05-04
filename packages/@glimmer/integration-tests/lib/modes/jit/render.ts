import { ElementBuilder, RenderResult } from '@glimmer/interfaces';
import { Reference } from '@glimmer/reference';
import { renderMain, renderSync } from '@glimmer/runtime';
import { PrecompileOptions } from '@glimmer/syntax';
import { unwrapTemplate } from '@glimmer/util';

import { preprocess } from '../../compile';
import { JitTestDelegateContext } from './delegate';

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
