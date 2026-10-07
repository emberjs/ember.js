import { DEPRECATIONS } from '@ember/-internals/deprecations';
import { expectDeprecation } from './ember-dev/deprecation';

/**
  Expects the `ember-component` deprecation for the rest of the test.

  Call it first in a test that extends or renders the classic `Component`
  from `@ember/component`.

  Guard that test with `testUnless(DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isRemoved)`.

  While the deprecation is not enabled, this expects nothing.
  A test can then also expect other deprecations that are enabled.
  `@ember/component/tests/deprecation-test` checks that nothing fires in that state.
*/
export function expectClassicComponentDeprecation(): void {
  if (DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isEnabled) {
    expectDeprecation(/The classic `Component` class from `@ember\/component` is deprecated/);
  }
}
