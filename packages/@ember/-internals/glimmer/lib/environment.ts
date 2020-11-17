import { ENV } from '@ember/-internals/environment';
import { _getProp, get, set } from '@ember/-internals/metal';
import { Owner } from '@ember/-internals/owner';
import { getDebugName } from '@ember/-internals/utils';
import { constructStyleDeprecationMessage } from '@ember/-internals/views';
import { assert, deprecate, warn } from '@ember/debug';
import { backburner, schedule } from '@ember/runloop';
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
    backburner.ensureInstance();
  },

  toBool,
  toIterator,

  getProp: _getProp,
  setProp: set,
  getPath: get,

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
});

if (DEBUG) {
  setTrackingTransactionEnv!({
    assert(message) {
      assert(message, false);
    },

    deprecate(message) {
      deprecate(message, false, {
        id: 'autotracking.mutation-after-consumption',
        until: '4.0.0',
        for: 'ember-source',
        since: {
          enabled: '3.21.0',
        },
      });
    },

    debugMessage(obj, keyName) {
      let dirtyString = keyName
        ? `\`${keyName}\` on \`${getDebugName!(obj)}\``
        : `\`${getDebugName!(obj)}\``;

      return `You attempted to update ${dirtyString}, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.`;
    },
  });
}

///////////

// Define environment delegate

export class EmberEnvironmentDelegate implements EnvironmentDelegate {
  public enableDebugTooling: boolean = ENV._DEBUG_RENDER_TREE;

  constructor(public owner: Owner, public isInteractive: boolean) {}

  onTransactionCommit() {}
}
