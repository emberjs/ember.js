import { RuntimeResolverDelegate, SerializedTemplateWithLazyBlock } from '@glimmer/interfaces';
import { JitContext, MacrosImpl, ResolverDelegate } from '@glimmer/opcode-compiler';

import { RenderBenchmark } from '../interfaces';
import { compileTemplate } from './util';
import renderBenchmark from './render-benchmark';
import { SimpleElement } from '@simple-dom/interface';

export default function compileBenchmark(
  resolverDelegate: ResolverDelegate,
  runtimeResolverDelegate: RuntimeResolverDelegate,
  entry: SerializedTemplateWithLazyBlock<unknown>
): RenderBenchmark {
  performance.mark('compileStart');
  const context = JitContext(resolverDelegate, new MacrosImpl());
  const handle = compileTemplate(entry, context);
  return (element, root, isInteractive) =>
    renderBenchmark(
      context,
      runtimeResolverDelegate,
      handle,
      element as SimpleElement,
      root,
      isInteractive
    );
}
