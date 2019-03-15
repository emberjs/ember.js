import { JitTestDelegateContext } from './delegate';
import { VersionedPathReference } from '@glimmer/reference';
import { ElementBuilder, RenderResult } from '@glimmer/interfaces';
import { preprocess } from '../../compile';
import { renderJitMain, renderSync } from '@glimmer/runtime';

export function renderTemplate(
  src: string,
  { runtime, syntax }: JitTestDelegateContext,
  self: VersionedPathReference,
  builder: ElementBuilder
): RenderResult {
  let template = preprocess(src);
  let iterator = renderJitMain(runtime, syntax, self, builder, template.asLayout().compile(syntax));
  return renderSync(runtime.env, iterator);
}
