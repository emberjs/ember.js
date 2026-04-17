// GXT shim for `@ember/-internals/deprecations`.
//
// Reimplements enough of the real module so that deprecations still route
// through `@ember/debug`'s `deprecate` (test helpers stub that to detect
// calls). Entries for deprecations GXT has already fully superseded are left
// as `{ isRemoved: true }` shapes so callers skip the removed code paths.

import type { DeprecationOptions } from '@ember/debug';
import { deprecate } from '@ember/debug';
import { ENV } from '@ember/-internals/environment';
import { VERSION } from '@ember/version';

interface DeprecationObject {
  options: DeprecationOptions;
  test: boolean;
  isEnabled: boolean;
  isRemoved: boolean;
}

function isEnabled(options: DeprecationOptions) {
  return Object.hasOwnProperty.call(options.since, 'enabled') || ENV._ALL_DEPRECATIONS_ENABLED;
}

let numEmberVersion = parseFloat(ENV._OVERRIDE_DEPRECATION_VERSION ?? VERSION);

export function emberVersionGte(until: string, emberVersion = numEmberVersion) {
  let significantUntil = until.replace(/(\.0+)/g, '');
  return emberVersion >= parseFloat(significantUntil);
}

export function isRemoved(options: DeprecationOptions) {
  return emberVersionGte(options.until);
}

function deprecation(options: DeprecationOptions): DeprecationObject {
  return {
    options,
    test: !isEnabled(options),
    isEnabled: isEnabled(options) || isRemoved(options),
    isRemoved: isRemoved(options),
  };
}

function dasherize(str: string): string {
  return str
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export const DEPRECATIONS = {
  DEPRECATE_TEMPLATE_ACTION: {
    isEnabled: false,
    isRemoved: true,
    test: false,
  },
  DEPRECATE_IMPLICIT_ROUTE_MODEL: {
    isEnabled: false,
    isRemoved: true,
    test: false,
  },
  DEPRECATE_IMPORT_EMBER(importName: string): DeprecationObject {
    return deprecation({
      id: `deprecate-import-${dasherize(importName)}-from-ember`,
      for: 'ember-source',
      since: { available: '5.10.0', enabled: '6.5.0' },
      until: '7.0.0',
      url: `https://deprecations.emberjs.com/id/import-${dasherize(
        importName
      )}-from-ember`,
    });
  },
  DEPRECATE_IMPORT_INJECT: deprecation({
    for: 'ember-source',
    id: 'importing-inject-from-ember-service',
    since: {
      available: '6.2.0',
      enabled: '6.3.0',
    },
    until: '7.0.0',
    url: 'https://deprecations.emberjs.com/id/importing-inject-from-ember-service',
  }),
  DEPRECATE_COMPONENT_TEMPLATE_RESOLVING: {
    isEnabled: true,
    isRemoved: false,
    test: false,
  },
  DEPRECATE_AMD_BUNDLES: deprecation({
    for: 'ember-source',
    id: 'using-amd-bundles',
    since: {
      available: '6.10.0',
      enabled: '6.10.0',
    },
    until: '7.0.0',
    url: 'https://deprecations.emberjs.com/id/using-amd-bundles',
  }),
};

export function deprecateUntil(message: string, deprecationObj: DeprecationObject | undefined) {
  if (!deprecationObj || !deprecationObj.options) {
    return;
  }

  const { options } = deprecationObj;
  if (deprecationObj.isRemoved) {
    throw new Error(
      `The API deprecated by ${options.id} was removed in ember-source ${options.until}. The message was: ${message}. Please see ${options.url} for more details.`
    );
  }
  deprecate(message, deprecationObj.test, options);
}
