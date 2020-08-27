import { JitTestDelegateContext } from './delegate';
import { PrecompileOptions } from '@glimmer/compiler';
import { Reference } from '@glimmer/reference';
import { ElementBuilder, RenderResult } from '@glimmer/interfaces';
import { preprocess } from '../../compile';
import { renderJitMain, renderSync } from '@glimmer/runtime';
import { unwrapTemplate, unwrapHandle } from '@glimmer/util';

export function renderTemplate(
  src: string,
  { runtime, syntax }: JitTestDelegateContext,
  self: Reference,
  builder: ElementBuilder,
  options?: PrecompileOptions
): RenderResult {
  let template = preprocess(src, undefined, options);
  let handle = unwrapTemplate(template).asLayout().compile(syntax);

  let iterator = renderJitMain(runtime, syntax, self, builder, unwrapHandle(handle));
  return renderSync(runtime.env, iterator);
}
