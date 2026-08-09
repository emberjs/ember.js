import { ENV } from '@ember/-internals/environment/lib/env';
import { get, _getProp } from '@ember/-internals/metal/lib/property_get';
import { set, _setProp } from '@ember/-internals/metal/lib/property_set';
import type { InternalOwner } from '@ember/-internals/owner';
import getDebugName from '@ember/-internals/utils/lib/get-debug-name';
import { constructStyleDeprecationMessage } from '@ember/-internals/views/lib/system/utils';
import { assert, deprecate, warn } from '@ember/debug';
import type { DeprecationOptions } from '@ember/debug/lib/deprecate';
import { DEBUG } from '@glimmer/env';
import setGlobalContext from '@glimmer/global-context';
import type { EnvironmentDelegate } from '@glimmer/runtime/lib/environment';
import { debug } from '@glimmer/validator/lib/debug';
import toIterator from './utils/iterator';
import { isHTMLSafe } from './utils/string';
import toBool from './utils/to-bool';

///////////

// SPIKE (RFC 957 end state): tag invalidation and destruction no longer
// flow through the runloop. Invalidation notifies the renderer's
// scheduler directly; destruction work queues here and is drained by
// the scheduler's flush (or a fallback microtask when nothing is
// rendering). The setter indirection exists only to avoid a module
// cycle with the renderer.

let notifyRevalidate: () => boolean = () => false;

export function _setNotifyRevalidate(fn: () => boolean): void {
  notifyRevalidate = fn;
}

// Dirtying is much hotter than ticking: a 100k-set loop notifies once
// and then pays a single boolean check per set, instead of walking the
// notify chain per dirty tag. The renderer re-arms this at the start of
// every tick.
let invalidationNotified = false;

export function _resetInvalidationNotified(): void {
  invalidationNotified = false;
}

interface ScheduledDestructor {
  destroyable: object;
  destructor: (destroyable: object) => void;
}

const scheduledDestructors: ScheduledDestructor[] = [];
const scheduledFinalizers: Array<() => void> = [];

let destroyDrainArmed = false;
let draining = false;
let renderTransactionDepth = 0;

export function _hasScheduledDestroys(): boolean {
  return scheduledDestructors.length > 0 || scheduledFinalizers.length > 0;
}

export function _beginRenderTransaction(): void {
  renderTransactionDepth++;
}

export function _endRenderTransaction(): void {
  renderTransactionDepth--;
}

/**
 * Runs pending destructors, then finalizers -- the classic
 * actions-before-destroy queue ordering. Destruction can schedule
 * further destruction, so drain until quiet.
 *
 * Draining is skipped while a drain is already running (the outer
 * loop picks up whatever was scheduled) or while roots are mid-render
 * (running destructors would mutate DOM under the updating VM); in
 * both cases the pending work is picked up by the caller that holds
 * the guard, or by the armed fallback microtask.
 */
export function _drainScheduledDestroys(): void {
  if (draining || renderTransactionDepth > 0) return;

  destroyDrainArmed = false;
  draining = true;

  try {
    while (scheduledDestructors.length > 0 || scheduledFinalizers.length > 0) {
      const destructors = scheduledDestructors.splice(0);
      for (const { destroyable, destructor } of destructors) {
        destructor(destroyable);
      }

      const finalizers = scheduledFinalizers.splice(0);
      for (const finalize of finalizers) {
        finalize();
      }
    }
  } finally {
    draining = false;
  }
}

function armDestroyDrain(): void {
  if (destroyDrainArmed) return;
  destroyDrainArmed = true;
  queueMicrotask(() => {
    if (destroyDrainArmed) {
      _drainScheduledDestroys();
    }
  });
}

// Setup global context

setGlobalContext({
  scheduleRevalidate() {
    if (invalidationNotified) return;
    // only latch when a renderer actually heard the notification --
    // latching against an empty renderer list (dirt during app boot)
    // would permanently swallow all future invalidations
    if (notifyRevalidate()) {
      invalidationNotified = true;
    }
  },

  toBool,
  toIterator,

  getProp: _getProp,
  setProp: _setProp,
  getPath: get,
  setPath: set,

  scheduleDestroy(destroyable, destructor) {
    scheduledDestructors.push({
      destroyable,
      destructor: destructor as (destroyable: object) => void,
    });
    armDestroyDrain();
  },

  scheduleDestroyed(finalizeDestructor) {
    scheduledFinalizers.push(finalizeDestructor);
    armDestroyDrain();
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

  constructor(
    public owner: InternalOwner,
    public isInteractive: boolean
  ) {}

  onTransactionCommit(): void {}
}
