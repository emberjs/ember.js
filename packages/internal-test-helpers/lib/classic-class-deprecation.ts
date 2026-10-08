import { DEPRECATIONS } from '@ember/-internals/deprecations';
import { expectDeprecationQuietly } from './ember-dev/deprecation';

/**
  Expects the `deprecate-classic-classes` deprecation for the rest of the test.

  Call it first in a test that uses `extend`, `reopen` or `reopenClass`.

  Guard that test with `testUnless(DEPRECATIONS.DEPRECATE_CLASSIC_CLASSES.isRemoved)`.

  While the deprecation is not enabled, this expects nothing.
  A test can then also expect other deprecations that are enabled.
  A match adds no assertion, so `assert.expect` counts stay the same.
  `@ember/object/tests/classic-classes-deprecation-test` checks that nothing fires in that state.
*/
export function expectClassicClassDeprecation(): void {
  if (DEPRECATIONS.DEPRECATE_CLASSIC_CLASSES.isEnabled) {
    expectDeprecationQuietly(/classic class/);
  }
}
