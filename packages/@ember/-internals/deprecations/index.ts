import type { DeprecationOptions } from '@ember/debug/lib/deprecate';
import {
  isDeprecationEnabledByConfig,
  isDeprecationExceptedByConfig,
} from '@ember/debug/lib/deprecation-stages';
import { ENV } from '@ember/-internals/environment/lib/env';
import { VERSION } from '@ember/version';
import { deprecate, assert } from '@ember/debug';
import { DEPRECATE_COMPARABLE_MIXIN, DEPRECATE_IMPORT_INJECT } from '@ember/deprecated-features';
import { dasherize } from '../string/index';

function isEnabled(options: DeprecationOptions) {
  return (
    Object.hasOwnProperty.call(options.since, 'enabled') ||
    ENV._ALL_DEPRECATIONS_ENABLED ||
    isDeprecationEnabledByConfig(options.id)
  );
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

// Getters rather than snapshots: registry entries are created at module
// eval, but stage configuration can change afterwards (e.g. test harnesses
// calling setDeprecationStagesConfig).
//
// `flag` links a shakable deprecation to its @ember/deprecated-features
// constant: in a build where the flag is false the guarded implementation is
// gone, so the deprecation reports itself as removed and unguarded reaches
// throw via deprecateUntil.
//
// `except` shields an id from the version-based removal computation (which
// includes the _OVERRIDE_DEPRECATION_VERSION simulation) — without it, the
// "Deprecations as errors" CI variant would throw for every API whose
// deprecation is intentionally excluded from a run. It does not shield a
// false flag: in a shaken build the implementation is actually gone.
export function deprecation(options: DeprecationOptions, flag?: boolean): DeprecationObject {
  return {
    options,
    get test() {
      return !isEnabled(options);
    },
    get isEnabled() {
      return isEnabled(options) || this.isRemoved;
    },
    get isRemoved() {
      return (isRemoved(options) && !isDeprecationExceptedByConfig(options.id)) || flag === false;
    },
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

  ## Shakable deprecations

  A deprecation whose implementation carries real code weight should also be
  *shakable*: add an `export const MY_DEPRECATION = true` to
  `@ember/deprecated-features` (same name as the registry key), pass it as the
  second argument to `deprecation()`, and guard the deprecated code path with
  it:

  ```ts
  import { MY_DEPRECATION } from '@ember/deprecated-features';

  if (MY_DEPRECATION) {
    // deprecated path, including the deprecateUntil call
  } else {
    // post-removal behavior
  }
  ```

  Rules: reference the imported const directly (no destructuring, renaming, or
  property access — babel-plugin-debug-macros can only fold direct
  references). When the deprecated code has a post-removal shape, keep the
  deprecateUntil call inside the guarded branch (it is stripped with the code)
  and put the post-removal behavior in the other branch. When the deprecated
  thing is itself an entrypoint (like the deprecated `inject` function), put
  the deprecateUntil call before the guard instead — it survives shaking as
  the throwing stub while the guarded implementation is eliminated. In a build
  where the flag is false, the registry entry reports `isRemoved`, so any
  reach of the API throws the removal error.

  ## Deprecating APIs ember-source itself uses

  When the deprecated API is also used by ember-source's own framework code
  (and internal use cannot be separated by import path), give the internals a
  non-deprecating entry point and put the deprecateUntil call only in the
  public one. The reference pattern is `inject` (public wrapper in
  @ember/service; internals call metal's `injected_property` directly).
  Other examples: `internalExtend` (@ember/object/core), the
  `reopenInternal`/`reopenClassInternal` statics (statics rather than module
  functions so rollup can scope their side effects to the class — imported
  helper calls at module scope make the whole module un-tree-shakable, which
  tests/node-vitest/tree-shakability.test.js guards), `createMixin`
  (@ember/object/mixin), `internalA` (@ember/array). Include a regression
  test proving framework operation (module eval, boot, runtime paths) fires
  nothing with the deprecation enabled.
 */
export const DEPRECATIONS = {
  DEPRECATE_IMPORT_EMBER(importName: string) {
    return deprecation({
      id: `deprecate-import-${dasherize(importName).toLowerCase()}-from-ember`,
      for: 'ember-source',
      since: { available: '5.10.0', enabled: '6.5.0' },
      until: '7.0.0',
      url: `https://deprecations.emberjs.com/id/import-${dasherize(
        importName
      ).toLowerCase()}-from-ember`,
    });
  },
  DEPRECATE_IMPORT_INJECT: deprecation(
    {
      for: 'ember-source',
      id: 'importing-inject-from-ember-service',
      since: {
        available: '6.2.0',
        enabled: '6.3.0',
      },
      until: '7.0.0',
      url: 'https://deprecations.emberjs.com/id/importing-inject-from-ember-service',
    },
    DEPRECATE_IMPORT_INJECT
  ),
  DEPRECATE_COMPARABLE_MIXIN: deprecation(
    {
      for: 'ember-source',
      id: 'deprecate-comparable-mixin',
      since: { available: '7.2.0', enabled: '7.2.0' },
      until: '7.5.0',
      url: 'https://deprecations.emberjs.com/id/deprecate-comparable-mixin',
    },
    DEPRECATE_COMPARABLE_MIXIN
  ),
  // The classic object model deprecations have no @ember/deprecated-features
  // flags: their machinery cannot be tree-shaken in-module while ember's own
  // base classes are built with the internal aliases (internalExtend,
  // createMixin, ...). Removing the machinery is the modern build variant's
  // module-swap job.
  DEPRECATE_EMBER_OBJECT_EXTEND: deprecation({
    for: 'ember-source',
    id: 'deprecate-ember-object-extend',
    since: { available: '7.3.0' },
    until: '8.0.0',
    url: 'https://deprecations.emberjs.com/id/deprecate-ember-object-extend',
  }),
  DEPRECATE_EMBER_OBJECT_REOPEN: deprecation({
    for: 'ember-source',
    id: 'deprecate-ember-object-reopen',
    since: { available: '7.3.0' },
    until: '8.0.0',
    url: 'https://deprecations.emberjs.com/id/deprecate-ember-object-reopen',
  }),
  DEPRECATE_EMBER_MIXINS: deprecation({
    for: 'ember-source',
    id: 'deprecate-ember-mixins',
    since: { available: '7.3.0' },
    until: '8.0.0',
    url: 'https://deprecations.emberjs.com/id/deprecate-ember-mixins',
  }),
  DEPRECATE_COMPUTED_PROPERTIES: deprecation({
    for: 'ember-source',
    id: 'deprecate-computed-properties',
    since: { available: '7.3.0' },
    until: '8.0.0',
    url: 'https://deprecations.emberjs.com/id/deprecate-computed-properties',
  }),
  DEPRECATE_OBSERVERS: deprecation({
    for: 'ember-source',
    id: 'deprecate-observers',
    since: { available: '7.3.0' },
    until: '8.0.0',
    url: 'https://deprecations.emberjs.com/id/deprecate-observers',
  }),
  DEPRECATE_EMBER_ARRAY: deprecation({
    for: 'ember-source',
    id: 'deprecate-ember-array',
    since: { available: '7.3.0' },
    until: '8.0.0',
    url: 'https://deprecations.emberjs.com/id/deprecate-ember-array',
  }),
  DEPRECATE_OBJECT_PROXY: deprecation({
    for: 'ember-source',
    id: 'deprecate-object-proxy',
    since: { available: '7.3.0' },
    until: '8.0.0',
    url: 'https://deprecations.emberjs.com/id/deprecate-object-proxy',
  }),
  DEPRECATE_ARRAY_PROXY: deprecation({
    for: 'ember-source',
    id: 'deprecate-array-proxy',
    since: { available: '7.3.0' },
    until: '8.0.0',
    url: 'https://deprecations.emberjs.com/id/deprecate-array-proxy',
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
