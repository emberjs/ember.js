import { ENV } from '@ember/-internals/environment/lib/env';
import type { InternalOwner } from '@ember/-internals/owner';
import getDebugName from '@ember/-internals/utils/lib/get-debug-name';
import { constructStyleDeprecationMessage } from '@ember/-internals/views/lib/system/utils';
import { assert, deprecate, warn } from '@ember/debug';
import type { DeprecationOptions } from '@ember/debug/lib/deprecate';
import { DEBUG } from '@glimmer/env';
import setGlobalContext from '@glimmer/global-context';
import DebugRenderTreeImpl from '@glimmer/runtime/lib/debug-render-tree';
import type { DebugRenderTree } from '@glimmer/interfaces';
import type { EnvironmentDelegate } from '@glimmer/runtime/lib/environment';
import { debug } from '@glimmer/validator/lib/debug';
import { hooks, runloop, toBool } from './hooks';
import toIterator from './utils/iterator';
import { isHTMLSafe } from './utils/string';

declare global {
  interface ImportMetaEnv {
    VITE_NO_DEBUG_RENDER_TREE?: string;
  }
}

///////////

// Setup global context

// Every entry delegates at call time, so a module that registers its
// hooks after this one is evaluated still takes effect.
setGlobalContext({
  scheduleRevalidate() {
    runloop.ensureInstance();
  },

  toBool,
  toIterator,

  getProp: (obj, key) => hooks.getProp(obj, key),
  setProp: (obj, key, value) => hooks.setProp(obj, key, value),
  getPath: (obj, path) => hooks.getPath(obj, path),
  setPath: (obj, path, value) => hooks.setPath(obj, path, value),

  scheduleDestroy(destroyable, destructor) {
    runloop.scheduleActions(() => destructor(destroyable));
  },

  scheduleDestroyed(finalizeDestructor) {
    runloop.scheduleDestroy(finalizeDestructor);
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

export class EmberEnvironmentDelegate implements EnvironmentDelegate {
  public enableDebugTooling: boolean = ENV._DEBUG_RENDER_TREE;

  /**
   * The Ember Inspector reads this tree. An app that never uses the
   * inspector in a given build can leave it out by setting
   * `VITE_NO_DEBUG_RENDER_TREE=true` for its Vite build, which drops the
   * implementation from the bundle.
   */
  public debugRenderTree: DebugRenderTree<object> | undefined =
    import.meta.env?.VITE_NO_DEBUG_RENDER_TREE === 'true'
      ? undefined
      : ENV._DEBUG_RENDER_TREE
        ? new DebugRenderTreeImpl()
        : undefined;

  constructor(
    public owner: InternalOwner,
    public isInteractive: boolean
  ) {}

  onTransactionCommit(): void {}
}
