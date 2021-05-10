import {
  deprecate as _deprecate,
  deprecateFunc as _deprecateFunc,
  DeprecationOptions,
} from '@ember/debug';

export function deprecate(message: string, condition: boolean, options: DeprecationOptions): void {
  _deprecate(
    "`import { deprecate } from '@ember/application/deprecations';` has been deprecated, please update to `import { deprecate } from '@ember/debug';`",
    false,
    {
      id: 'old-deprecate-method-paths',
      until: '4.0.0',
      for: 'ember-source',
      since: {
        enabled: '3.0.0',
      },
    }
  );

  _deprecate(message, condition, options);
}

export function deprecateFunc(message: string, options: DeprecationOptions, func: Function): void {
  _deprecate(
    "`import { deprecateFunc } from '@ember/application/deprecations';` has been deprecated, please update to `import { deprecateFunc } from '@ember/debug';`",
    false,
    {
      id: 'old-deprecate-method-paths',
      until: '4.0.0',
      for: 'ember-source',
      since: {
        enabled: '3.0.0',
      },
    }
  );

  _deprecateFunc(message, options, func);
}
