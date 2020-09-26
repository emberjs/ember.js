import { ASYNC_OBSERVERS, SYNC_OBSERVERS } from '@ember/-internals/metal';
import { run } from '@ember/runloop';

export function setupObserversCheck(hooks: NestedHooks) {
  hooks.afterEach(function () {
    let { assert } = QUnit.config.current;

    if (ASYNC_OBSERVERS.size > 0) {
      assert.ok(false, 'Should not have any ASYNC_OBSERVERS after tests');
      run(() => {
        ASYNC_OBSERVERS.forEach((_, target) => {
          ASYNC_OBSERVERS.delete(target);
          if (isDestroyable(target)) {
            try {
              target.destroy();
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error(e);
            }
          }
        });
      });
    }

    if (SYNC_OBSERVERS.size > 0) {
      assert.ok(false, 'Should not have any SYNC_OBSERVERS after tests');
      run(() => {
        SYNC_OBSERVERS.forEach((_, target) => {
          SYNC_OBSERVERS.delete(target);
          if (isDestroyable(target)) {
            try {
              target.destroy();
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error(e);
            }
          }
        });
      });
    }
  });
}

function isDestroyable(obj: object): obj is { destroy(): void } {
  return 'destroy' in obj && typeof obj['destroy'] === 'function';
}
