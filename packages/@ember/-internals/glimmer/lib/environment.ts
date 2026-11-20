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
import toIterator from './utils/iterator';
import { isHTMLSafe } from './utils/string';
import toBool from './utils/to-bool';

///////////

// Setup global context

// GXT-mode only: revalidate notifications can arrive synchronously OUTSIDE
// any runloop — the gxt-backend validator shim notifies on every dirtyTagFor
// (classic @glimmer/validator never does), and a stray GXT formula
// re-evaluation (e.g. a leaked helper/input formula writing back through a
// tracked setter) can therefore fire this at arbitrary points in a caller's
// synchronous code. A synchronous `ensureInstance()` there opens an autorun
// loop that stays open for the rest of that synchronous continuation, and a
// later `join()` (e.g. Application#reset's handleReset) silently joins it,
// deferring its scheduled work past the caller's next statements. Deferring
// the `ensureInstance()` by one (coalesced) microtask preserves the flush —
// which was always asynchronous — without leaving a synchronously-observable
// open loop. Inside an active runloop the call stays synchronous (it is a
// no-op there). Classic builds keep the unconditional synchronous call.
let _revalidateScheduled = false;

setGlobalContext({
  scheduleRevalidate() {
    if (__GXT_MODE__ && _backburner.currentInstance === null) {
      if (!_revalidateScheduled) {
        _revalidateScheduled = true;
        queueMicrotask(() => {
          _revalidateScheduled = false;
          _backburner.ensureInstance();
        });
      }
      return;
    }
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

if (DEBUG && !__GXT_MODE__) {
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

  constructor(
    public owner: InternalOwner,
    public isInteractive: boolean
  ) {}

  onTransactionCommit(): void {}
}
