import { debugSlice } from '@glimmer/debug';
import { TemplateCompilationContext, HandleResult } from '@glimmer/interfaces';
import { LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { extractHandle } from '@glimmer/util';

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
