import type { DeprecationOptions } from '@ember/debug/lib/deprecate';
import { ENV } from '@ember/-internals/environment';

function isEnabled(options: DeprecationOptions) {
  return Object.hasOwnProperty.call(options.since, 'enabled') || ENV._ALL_DEPRECATIONS_ENABLED;
}

function deprecation(options: DeprecationOptions) {
  return {
    options,
    test: !isEnabled(options),
    isEnabled: isEnabled(options),
  };
}

/*
  To add a deprecation, you must add a new entry to the `DEPRECATIONS` object.
  The entry should be an object with the following properties:

  * `id` (required): A string that uniquely identifies the deprecation. This
    should be a short, descriptive name, typically dasherized.
  * `for` (required): The string `ember-source` -- every deprecation from this
    package is for `ember-source`.
  * `since` (required): An object with `available` and `enabled`. `available` is
    the first version of Ember that the deprecation is available in. `enabled` is
    the version of Ember that the deprecation was first enabled. This is used as
    a feature flag deprecations. For public APIs, the `enabled` value is added
    only once the deprecation RFC is [Ready for Release](https://github.com/emberjs/rfcs#ready-for-release).
  * `until` (required): The version of Ember that the deprecation will be removed
  * `url` (required): A URL to the deprecation guide for the deprecation. This
    URL can be constructed in advance of the deprecation being added to the
    [deprecation app](https://github.com/ember-learn/deprecation-app) by
    following this format: `https://deprecations.emberjs.com/deprecations/{{id}}`.

  For example:
  `deprecate` should then be called using the entry from the `DEPRECATIONS` object.

  ```ts
  import { DEPRECATIONS } from '@ember/-internals/deprecations';
  //...

  deprecate(message, DEPRECATIONS.MY_DEPRECATION.test, DEPRECATIONS.MY_DEPRECATION.options);
  ```

  `expectDeprecation` should also use the DEPRECATIONS object, but it should be noted
  that it uses `isEnabled` instead of `test` because the expectations of `expectDeprecation`
  are the opposite of `test`.

  ```ts
  expectDeprecation(
    () => {
        assert.equal(foo, bar(), 'foo is equal to bar'); // something that triggers the deprecation
    },
    /matchesMessage/,
    DEPRECATIONS.MY_DEPRECATION.isEnabled
  );
  ```
 */
export const DEPRECATIONS = {
  DEPRECATE_IMPLICIT_ROUTE_MODEL: deprecation({
    id: 'deprecate-implicit-route-model',
    for: 'ember-source',
    since: { available: '5.3.0', enabled: '5.3.0' },
    until: '6.0.0',
    url: 'https://deprecations.emberjs.com/v5.x/#toc_deprecate-implicit-route-model',
  }),
};
