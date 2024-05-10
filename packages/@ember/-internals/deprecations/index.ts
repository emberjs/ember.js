import type { DeprecationOptions } from '@ember/debug/lib/deprecate';
import { ENV } from '@ember/-internals/environment';
import { VERSION } from '@ember/version';
import { deprecate, assert } from '@ember/debug';

function isEnabled(options: DeprecationOptions) {
  return Object.hasOwnProperty.call(options.since, 'enabled') || ENV._ALL_DEPRECATIONS_ENABLED;
}

let numEmberVersion = parseFloat(ENV._OVERRIDE_DEPRECATION_VERSION ?? VERSION);

/* until must only be a minor version or major version */
export function emberVersionGte(until: string, emberVersion = numEmberVersion) {
  let significantUntil = until.replace(/(\.0+)/g, '');
  return emberVersion >= parseFloat(significantUntil);
}

export function isRemoved(options: DeprecationOptions) {
  return emberVersionGte(options.until);
}

interface DeprecationObject {
  options: DeprecationOptions;
  test: boolean;
  isEnabled: boolean;
  isRemoved: boolean;
}

function deprecation(options: DeprecationOptions) {
  return {
    options,
    test: !isEnabled(options),
    isEnabled: isEnabled(options) || isRemoved(options),
    isRemoved: isRemoved(options),
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

  deprecateUntil(message, DEPRECATIONS.MY_DEPRECATION);
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

  Tests can be conditionally run based on whether a deprecation is enabled or not:

  ```ts
    [`${testUnless(DEPRECATIONS.MY_DEPRECATION.isRemoved)} specific deprecated feature tested only in this test`]
  ```

  This test will be skipped when the MY_DEPRECATION is removed.
  When adding a deprecation, we need to guard all the code that will eventually be removed, including tests.
  For tests that are not specifically testing the deprecated feature, we need to figure out how to
  test the behavior without encountering the deprecated feature, just as users would.
 */
export const DEPRECATIONS = {
  DEPRECATE_IMPLICIT_ROUTE_MODEL: deprecation({
    id: 'deprecate-implicit-route-model',
    for: 'ember-source',
    since: { available: '5.3.0', enabled: '5.3.0' },
    until: '6.0.0',
    url: 'https://deprecations.emberjs.com/v5.x/#toc_deprecate-implicit-route-model',
  }),
  DEPRECATE_TEMPLATE_ACTION: deprecation({
    id: 'template-action',
    url: 'https://deprecations.emberjs.com/id/template-action',
    until: '6.0.0',
    for: 'ember-source',
    since: {
      available: '5.9.0',
      enabled: '5.9.0',
    },
  }),
  DEPRECATE_COMPONENT_TEMPLATE_RESOLVING: deprecation({
    id: 'component-template-resolving',
    url: 'https://deprecations.emberjs.com/id/component-template-resolving',
    until: '6.0.0',
    for: 'ember-source',
    since: {
      available: '5.9.0',
      enabled: '5.9.0',
    },
  }),
};

export function deprecateUntil(message: string, deprecation: DeprecationObject) {
  const { options } = deprecation;
  assert(
    'deprecateUntil must only be called for ember-source',
    Boolean(options.for === 'ember-source')
  );
  if (deprecation.isRemoved) {
    throw new Error(
      `The API deprecated by ${options.id} was removed in ember-source ${options.until}. The message was: ${message}. Please see ${options.url} for more details.`
    );
  }
  deprecate(message, deprecation.test, options);
}
