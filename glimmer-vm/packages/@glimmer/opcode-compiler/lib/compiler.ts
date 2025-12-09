import type { CompilationContext, HandleResult } from '@glimmer/interfaces';
import { logOpcodeSlice } from '@glimmer/debug';
import { extractHandle } from '@glimmer/debug-util';
import { LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';

export let debugCompiler: (context: CompilationContext, handle: HandleResult) => void;

if (LOCAL_TRACE_LOGGING) {
  debugCompiler = (context: CompilationContext, result: HandleResult) => {
    let handle = extractHandle(result);
    let { heap } = context.evaluation.program;
    let start = heap.getaddr(handle);
    let end = start + heap.sizeof(handle);

    logOpcodeSlice(context, start, end);
  };
}
