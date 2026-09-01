import type { EvaluationContext, STDLib, StdlibRoutine } from '@glimmer/interfaces';
import { APPEND_OPCODES } from '@glimmer/runtime/lib/opcodes';

import { MAIN } from './stdlib-data';

/**
 * Loads each standard library routine into the heap the first time a
 * program asks for it, once per evaluation context. Routines are compiled
 * ahead of time by `bin/build-aot-stdlib.mjs`, so no compiler runs here.
 */
export class StdlibImpl implements STDLib {
  private handles = new Map<StdlibRoutine, number>();

  constructor(private evaluation: EvaluationContext) {}

  get main(): number {
    return this.handle(MAIN);
  }

  handle(routine: StdlibRoutine): number {
    let handle = this.handles.get(routine);

    if (handle === undefined) {
      handle = this.load(routine);
      this.handles.set(routine, handle);
    }

    return handle;
  }

  private load(routine: StdlibRoutine): number {
    for (const handler of routine.handlers) {
      APPEND_OPCODES.register(handler);
    }

    let words = routine.words.slice();

    // A routine this one calls loads into its own heap region first.
    for (const [at, target] of routine.fixups) {
      words[at] = this.handle(target());
    }

    let { heap } = this.evaluation.program;
    let handle = heap.malloc();

    for (const word of words) {
      heap.pushRaw(word);
    }

    heap.finishMalloc(handle, routine.size);
    return handle;
  }
}
