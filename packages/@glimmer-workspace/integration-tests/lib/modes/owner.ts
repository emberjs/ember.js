import { destroy } from '@glimmer/destroyable';
import { run } from '@ember/runloop';
import { buildOwner } from 'internal-test-helpers';

/**
 * A real application instance for one delegate (or one side of the rehydration delegate).
 * Components are registered on it and resolved by Ember's resolver.
 */
export type TestOwner = ReturnType<typeof buildOwner>;

export function createOwner(): TestOwner {
  return buildOwner();
}

/** Called after each test: destroys the owners and with them their `Application` namespaces. */
export function teardownOwners(...owners: object[]): void {
  run(() => {
    for (let owner of owners) destroy(owner);
  });
}
