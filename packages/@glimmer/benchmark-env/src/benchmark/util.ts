import { SerializedTemplateWithLazyBlock, CompilableProgram } from '@glimmer/interfaces';
import { unwrapTemplate, unwrapHandle } from '@glimmer/util';
import { templateFactory } from '@glimmer/opcode-compiler';
import { JitSyntaxCompilationContext } from '@glimmer/interfaces';

export function createProgram(
  template: SerializedTemplateWithLazyBlock<unknown>
): CompilableProgram {
  return unwrapTemplate(templateFactory(template).create()).asLayout();
}

export function compileTemplate(
  template: SerializedTemplateWithLazyBlock<unknown>,
  context: JitSyntaxCompilationContext
) {
  return unwrapHandle(createProgram(template).compile(context));
}

export async function measureRender(
  name: string,
  startMark: string,
  endMark: string,
  render: () => Promise<void> | void
) {
  const endObserved = new Promise(resolve => {
    new PerformanceObserver((entries, observer) => {
      if (entries.getEntriesByName(endMark, 'mark').length > 0) {
        resolve();
        observer.disconnect();
      }
    }).observe({ type: 'mark' });
  });
  performance.mark(startMark);
  await render();
  performance.mark(endMark);
  await endObserved;
  performance.measure(name, startMark, endMark);
}
