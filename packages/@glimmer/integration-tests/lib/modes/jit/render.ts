import { JitTestDelegateContext } from './delegate';
import { VersionedPathReference } from '@glimmer/reference';
import { ElementBuilder, RenderResult } from '@glimmer/interfaces';
import { preprocess } from '../../compile';
import { renderJitMain, renderSync } from '@glimmer/runtime';
import { unwrapTemplate, unwrapHandle } from '@glimmer/util';

export function renderTemplate(
  src: string,
  { runtime, syntax }: JitTestDelegateContext,
  self: VersionedPathReference,
  builder: ElementBuilder
): RenderResult {
  let template = preprocess(src);
  let handle = unwrapTemplate(template)
    .asLayout()
    .compile(syntax);

  let iterator = renderJitMain(runtime, syntax, self, builder, unwrapHandle(handle));
  return renderSync(runtime.env, iterator);
}
