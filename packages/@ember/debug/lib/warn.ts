import { DEBUG } from '@glimmer/env';

import { assert } from './assert';
import type { HandlerCallback } from './handlers';
import { invoke, registerHandler as genericRegisterHandler } from './handlers';

export interface WarnOptions {
  id: string;
}

export type RegisterHandlerFunc = (handler: HandlerCallback<WarnOptions>) => void;
export interface WarnFunc {
  (message: string): void;
  (message: string, test: boolean): void;
  (message: string, options: WarnOptions): void;
  (message: string, test: boolean, options: WarnOptions): void;
}

let registerHandler: RegisterHandlerFunc = () => {};
let warn: WarnFunc = () => {};
let missingOptionsDeprecation: string;
let missingOptionsIdDeprecation: string;

/**
@module @ember/debug
*/

if (DEBUG) {
  /**
    Allows for runtime registration of handler functions that override the default warning behavior.
    Warnings are invoked by calls made to [@ember/debug/warn](/ember/release/classes/@ember%2Fdebug/methods/warn?anchor=warn).
    The following example demonstrates its usage by registering a handler that does nothing overriding Ember's
    default warning behavior.

    ```javascript
    import { registerWarnHandler } from '@ember/debug';

    // next is not called, so no warnings get the default behavior
    registerWarnHandler(() => {});
    ```

    The handler function takes the following arguments:

    <ul>
      <li> <code>message</code> - The message received from the warn call. </li>
      <li> <code>options</code> - An object passed in with the warn call containing additional information including:</li>
        <ul>
          <li> <code>id</code> - An id of the warning in the form of <code>package-name.specific-warning</code>.</li>
        </ul>
      <li> <code>next</code> - A function that calls into the previously registered handler.</li>
    </ul>

    @public
    @static
    @method registerWarnHandler
    @for @ember/debug
    @param handler {Function} A function to handle warnings.
    @since 2.1.0
  */
  registerHandler = function registerHandler(handler) {
    genericRegisterHandler('warn', handler);
  };

  registerHandler(function logWarning(message) {
    /* eslint-disable no-console */
    console.warn(`WARNING: ${message}`);
    /* eslint-enable no-console */
  });

  missingOptionsDeprecation =
    'When calling `warn` you ' +
    'must provide an `options` hash as the third parameter.  ' +
    '`options` should include an `id` property.';
  missingOptionsIdDeprecation = 'When calling `warn` you must provide `id` in options.';

  /**
    Display a warning with the provided message.

    * In a production build, this method is defined as an empty function (NOP).
    Uses of this method in Ember itself are stripped from the ember.prod.js build.

    ```javascript
    import { warn } from '@ember/debug';
    import tomsterCount from './tomster-counter'; // a module in my project

    // Log a warning if we have more than 3 tomsters
    warn('Too many tomsters!', tomsterCount <= 3, {
      id: 'ember-debug.too-many-tomsters'
    });
    ```

    @method warn
    @for @ember/debug
    @static
    @param {String} message A warning to display.
    @param {Boolean|Object} test An optional boolean. If falsy, the warning
      will be displayed. If `test` is an object, the `test` parameter can
      be used as the `options` parameter and the warning is displayed.
    @param {Object} options
    @param {String} options.id The `id` can be used by Ember debugging tools
      to change the behavior (raise, log, or silence) for that specific warning.
      The `id` should be namespaced by dots, e.g. "ember-debug.feature-flag-with-features-stripped"
    @public
    @since 1.0.0
  */
  warn = function warn(message: string, test?: boolean | WarnOptions, options?: WarnOptions) {
    if (arguments.length === 2 && typeof test === 'object') {
      options = test;
      test = false;
    }

    assert(missingOptionsDeprecation, Boolean(options));
    assert(missingOptionsIdDeprecation, Boolean(options && options.id));

    // SAFETY: we have explicitly assigned `false` if the user invoked the
    // arity-2 version of the overload, so we know `test` is always either
    // `undefined` or a `boolean` for type-safe callers.
    invoke('warn', message, test as boolean | undefined, options);
  };
}

export default warn;
export { registerHandler, missingOptionsIdDeprecation, missingOptionsDeprecation };
