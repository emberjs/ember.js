import type { DeprecationOptions } from '@ember/debug/lib/deprecate';
import { ENV } from '@ember/-internals/environment';

function isEnabled(options: DeprecationOptions) {
  return Object.hasOwnProperty.call(options.since, 'enabled') || ENV._DEPRECATIONS_ENABLED;
}

function deprecation(options: DeprecationOptions) {
  return {
    options,
    test: !isEnabled(options),
  };
}
export const DEPRECATIONS = {
  DEPRECATE_IMPLICIT_ROUTE_MODEL: deprecation({
    id: 'deprecate-implicit-route-model',
    for: 'ember-source',
    since: { available: '5.3.0', enabled: '5.3.0' },
    until: '6.0.0',
    url: 'https://deprecations.emberjs.com/v5.x/#toc_deprecate-implicit-route-model',
  }),
};
