import type { HandleResult, TemplateCompilationContext } from '@glimmer/interfaces';
import { debugSlice } from '@glimmer/debug';
import { extractHandle } from '@glimmer/debug-util';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';

export let debugCompiler: (context: TemplateCompilationContext, handle: HandleResult) => void;

if (LOCAL_SHOULD_LOG) {
  debugCompiler = (context: TemplateCompilationContext, result: HandleResult) => {
    let handle = extractHandle(result);
    let { heap } = context.program;
    let start = heap.getaddr(handle);
    let end = start + heap.sizeof(handle);

    debugSlice(context, start, end);
  };
}
