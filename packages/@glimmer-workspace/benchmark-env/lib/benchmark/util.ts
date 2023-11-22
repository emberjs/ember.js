import type { CompileTimeCompilationContext, CompileTimeComponent } from '@glimmer/interfaces';
import { unwrapHandle } from '@glimmer/util';

export function compileEntry(entry: CompileTimeComponent, context: CompileTimeCompilationContext) {
  return unwrapHandle(entry.compilable!.compile(context));
}

export async function measureRender(
  name: string,
  startMark: string,
  endMark: string,
  render: () => Promise<void> | void
) {
  const endObserved = new Promise<void>((resolve) => {
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
