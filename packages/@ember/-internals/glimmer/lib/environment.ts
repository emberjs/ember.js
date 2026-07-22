import { ENV } from '@ember/-internals/environment/lib/env';
import { get, _getProp } from '@ember/-internals/metal/lib/property_get';
import { set, _setProp } from '@ember/-internals/metal/lib/property_set';
import type { InternalOwner } from '@ember/-internals/owner';
import getDebugName from '@ember/-internals/utils/lib/get-debug-name';
import { constructStyleDeprecationMessage } from '@ember/-internals/views/lib/system/utils';
import { assert, deprecate, warn } from '@ember/debug';
import type { DeprecationOptions } from '@ember/debug/lib/deprecate';
import { schedule, _backburner } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import setGlobalContext from '@glimmer/global-context';
import type { EnvironmentDelegate } from '@glimmer/runtime/lib/environment';
import { debug } from '@glimmer/validator/lib/debug';
import { createDebugRenderTree } from './debug-render-tree-factory';
import { enableDebugRenderTree } from './setup-debug-render-tree';
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
      constructStyleDeprecationMessage(String(value)),
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

      if (id === 'argument-less-helper-paren-less-invocation') {
        throw new Error(
          `A resolved helper cannot be passed as a named argument as the syntax is ` +
            `ambiguously a pass-by-reference or invocation. Use the ` +
            `\`{{helper 'foo-helper}}\` helper to pass by reference or explicitly ` +
            `invoke the helper with parens: \`{{(fooHelper)}}\`.`
        );
      }

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
  debug?.setTrackingTransactionEnv?.({
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
    id: 'setting-on-hash',
    until: '4.4.0',
    for: 'ember-source',
    since: {
      available: '3.28.0',
      enabled: '3.28.0',
    },
  },
];

const VM_ASSERTION_OVERRIDES: { id: string; message: string }[] = [];

///////////

// Define environment delegate

if (DEBUG) {
  // In debug builds the render tree is always available (`_DEBUG_RENDER_TREE`
  // defaults to on in development). In production builds this block is
  // stripped, so the `DebugRenderTree` implementation is only included if
  // something else imports it — notably `@ember/debug/lib/capture-render-tree`,
  // which registers it for the `EmberENV._DEBUG_RENDER_TREE` opt-in.
  enableDebugRenderTree();
}

export class EmberEnvironmentDelegate implements EnvironmentDelegate {
  public debugRenderTree = ENV._DEBUG_RENDER_TREE ? createDebugRenderTree() : undefined;

  constructor(
    public owner: InternalOwner,
    public isInteractive: boolean
  ) {}

  onTransactionCommit(): void {}
}
