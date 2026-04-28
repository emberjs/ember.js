import { ENV } from '@ember/-internals/environment';
import { getDebugName } from '@ember/-internals/utils';
import { schedule, _backburner } from '@ember/runloop';
import { setDestructionSchedulers } from '@glimmer/destroyable';
import { DEBUG } from '@glimmer/env';
import type { EnvironmentDelegate } from '@glimmer/runtime';
import { debug, setScheduleRevalidate } from '@glimmer/validator';

setScheduleRevalidate(() => _backburner.ensureInstance());
setDestructionSchedulers(
  (destroyable, destructor) => schedule('actions', null, destructor, destroyable),
  (finalizer) => schedule('destroy', null, finalizer)
);

if (DEBUG) {
  debug?.setTrackingTransactionEnv?.({
    debugMessage(obj, keyName) {
      let dirtyString = keyName
        ? `\`${keyName}\` on \`${getDebugName?.(obj)}\``
        : `\`${getDebugName?.(obj)}\``;

      return `You attempted to update ${dirtyString}, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.`;
    },
  });
}

export class EmberEnvironmentDelegate implements EnvironmentDelegate {
  public enableDebugTooling: boolean = ENV._DEBUG_RENDER_TREE;

  constructor(public isInteractive: boolean) {}

  onTransactionCommit(): void {}
}
