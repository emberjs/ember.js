import { DEPRECATIONS } from '@ember/-internals/deprecations';
import { expectDeprecation } from './ember-dev/deprecation';

/**
  Expects the `ember-component` deprecation for the rest of the test.

  Call it first in a test that creates a classic `Component` instance.

  While the deprecation is not enabled, this expects nothing. The usual
  `expectDeprecation(message, false)` form expects no deprecations at all, and
  that conflicts with a test that expects other deprecations.
*/
export function expectClassicComponentDeprecation(): void {
  if (DEPRECATIONS.DEPRECATE_EMBER_COMPONENT.isEnabled) {
    expectDeprecation(/The classic `Component` class from `@ember\/component` is deprecated/);
  }
}
