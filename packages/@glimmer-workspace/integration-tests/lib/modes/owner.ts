import { associateDestroyableChild, destroy } from '@ember/destroyable';
import { _resetRenderers } from '@ember/-internals/glimmer';
import type { BaseRenderer } from '@ember/-internals/glimmer/lib/base-renderer';
import { run } from '@ember/runloop';
import { buildOwner } from 'internal-test-helpers';

/**
 * A real application instance for one delegate (or one side of the rehydration
 * delegate), with the registrations that classic components need.
 */
export type TestOwner = ReturnType<typeof buildOwner>;

export function createOwner(): TestOwner {
  let owner = buildOwner();
  owner.register('-view-registry:main', Object.create(null), { instantiate: false });
  return owner;
}

/**
 * Called after each test. Destroys the owners (and with them the renderers, the roots
 * and the `Application` namespaces), then forgets the renderers that Ember still lists.
 */
export function teardownOwners(...owners: object[]): void {
  run(() => {
    for (let owner of owners) destroy(owner);
  });
  _resetRenderers();
}
