/**
 * Full Ember-specific global context registration.
 *
 * This module registers the heavy Ember implementations (metal get/set,
 * EmberArray iteration, proxy truthiness, HTMLSafe style checking, etc.)
 * into the lightweight global context set up by glimmer-global-context.ts.
 *
 * It is imported by setup-registry.ts (full Ember app boot path) but NOT
 * by the standalone renderComponent path, enabling tree-shaking of metal,
 * @ember/array, and @ember/-internals/views for apps that only use
 * renderComponent.
 */
import { get, set, _getProp, _setProp } from '@ember/-internals/metal';
import { getDebugName } from '@ember/-internals/utils';
import { constructStyleDeprecationMessage } from '@ember/-internals/views';
import { DEBUG } from '@glimmer/env';
import { debug } from '@glimmer/validator';
import toIterator from './utils/iterator';
import { isHTMLSafe } from './utils/string';
import toBool from './utils/to-bool';

import { flushAsyncObservers } from '@ember/-internals/metal';
import { registerFlushAsyncObservers } from '@ember/runloop';
import { registerEmberGlobalContextImplementations } from './glimmer-global-context';

registerFlushAsyncObservers(flushAsyncObservers);

registerEmberGlobalContextImplementations({
  _getProp,
  _setProp,
  get,
  set,
  toBool,
  toIterator,
  isHTMLSafe,
});

// Override the debug tracking message with the richer getDebugName
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

// Re-export warnIfStyleNotTrusted using the full implementation
export { constructStyleDeprecationMessage };
