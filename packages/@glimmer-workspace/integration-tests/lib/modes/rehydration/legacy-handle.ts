import type { RenderResult } from '@glimmer/interfaces';
import { destroy } from '@glimmer/destroyable';
import { inTransaction } from '@glimmer/runtime';

import type { RenderHandle } from '../../render-delegate';

/**
 * A `RenderHandle` for a render made directly through the VM (the rehydration
 * delegate, until it moves to Ember's renderer): the old transaction code of
 * `RenderTest.rerender`/`destroy`.
 */
export function legacyHandle(result: RenderResult): RenderHandle {
  return {
    rerender() {
      try {
        result.env.begin();
        result.rerender();
      } finally {
        result.env.commit();
      }
    },
    destroy() {
      inTransaction(result.env, () => destroy(result));
    },
    debugBounds: () => result,
  };
}
