import { ENV } from '@ember/-internals/environment';
import { _getProp, _setProp, get, set } from '@ember/-internals/metal';
import { Owner } from '@ember/-internals/owner';
import { getDebugName } from '@ember/-internals/utils';
import { constructStyleDeprecationMessage } from '@ember/-internals/views';
import { assert, deprecate, warn } from '@ember/debug';
import { DeprecationOptions } from '@ember/debug/lib/deprecate';
import { _backburner, schedule } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import setGlobalContext from '@glimmer/global-context';
import { EnvironmentDelegate } from '@glimmer/runtime';
import { setTrackingTransactionEnv } from '@glimmer/validator';
import toIterator from './utils/iterator';
import { isHTMLSafe } from './utils/string';
import toBool from './utils/to-bool';

///////////

// Setup global context

setGlobalContext({
  scheduleRevalidate() {
    _backburner.ensureInstance();
  },

  toBool,
  toIterator,

  getProp: _getProp,
  setProp: _setProp,
  getPath: get,
  setPath: set,

  scheduleDestroy(destroyable, destructor) {
    schedule('actions', null, destructor, destroyable);
  },

  scheduleDestroyed(finalizeDestructor) {
    schedule('destroy', null, finalizeDestructor);
  },

  warnIfStyleNotTrusted(value: unknown) {
    warn(
      constructStyleDeprecationMessage(value),
      (() => {
        if (value === null || value === undefined || isHTMLSafe(value)) {
          return true;
        }
        return false;
      })(),
      { id: 'ember-htmlbars.style-xss-warning' }
    );
  },

  assert(test: unknown, msg: string, options?: { id: string }) {
    if (DEBUG) {
      let id = options?.id;

      let override = VM_ASSERTION_OVERRIDES.filter((o) => o.id === id)[0];

      assert(override?.message ?? msg, test);
    }
  },

  deprecate(msg: string, test: unknown, options: { id: string }) {
    if (DEBUG) {
      let { id } = options;

      let override = VM_DEPRECATION_OVERRIDES.filter((o) => o.id === id)[0];

      if (!override) throw new Error(`deprecation override for ${id} not found`);

      // allow deprecations to be disabled in the VM_DEPRECATION_OVERRIDES array below
      if (!override.disabled) {
        deprecate(override.message ?? msg, Boolean(test), override);
      }
    }
  },
});

if (DEBUG) {
  setTrackingTransactionEnv?.({
    debugMessage(obj, keyName) {
      let dirtyString = keyName
        ? `\`${keyName}\` on \`${getDebugName?.(obj)}\``
        : `\`${getDebugName?.(obj)}\``;

      return `You attempted to update ${dirtyString}, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.`;
    },
  });
}

///////////

// VM Assertion/Deprecation overrides

const VM_DEPRECATION_OVERRIDES: (DeprecationOptions & {
  disabled?: boolean;
  message?: string;
})[] = [
  {
    id: 'autotracking.mutation-after-consumption',
    until: '4.0.0',
    for: 'ember-source',
    since: {
      enabled: '3.21.0',
    },
  },
  {
    id: 'this-property-fallback',
    disabled: ENV._DISABLE_PROPERTY_FALLBACK_DEPRECATION,
    url: 'https://deprecations.emberjs.com/v3.x#toc_this-property-fallback',
    until: '4.0.0',
    for: 'ember-source',
    since: {
      enabled: '3.26.0',
    },
  },
  {
    id: 'argument-less-helper-paren-less-invocation',
    until: '4.0.0',
    for: 'ember-source',
    since: {
      enabled: '3.27.0',
    },
  },
];

const VM_ASSERTION_OVERRIDES: { id: string; message: string }[] = [];

///////////

// Define environment delegate

export class EmberEnvironmentDelegate implements EnvironmentDelegate {
  public enableDebugTooling: boolean = ENV._DEBUG_RENDER_TREE;

  constructor(public owner: Owner, public isInteractive: boolean) {}

  onTransactionCommit(): void {}
}
