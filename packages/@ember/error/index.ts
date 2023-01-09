import { deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

/**
 @module @ember/error
*/

/** ErrorConstructor without node extensions */
interface BrowserErrorConstructor {
  new (message?: string): Error;
  (message?: string): Error;
  readonly prototype: Error;
}

/**
  The JavaScript Error object used by Ember.assert.

  @class Error
  @namespace Ember
  @extends Error
  @constructor
  @public
  @deprecated
*/
let EmberError: BrowserErrorConstructor;
if (DEBUG) {
  // eslint-disable-next-line no-inner-declarations
  function EmberDebugConstructor(message?: string) {
    deprecate(
      'The @ember/error package merely re-exported the native Error and is deprecated. Please use a native Error directly instead.',
      false,
      {
        id: 'deprecate-ember-error',
        until: '5.0.0',
        url: 'https://deprecations.emberjs.com/v4.x/#toc_deprecate-ember-error',
        for: 'ember-source',
        since: {
          available: '4.10.0',
          enabled: '4.10.0',
        },
      }
    );
    return new Error(message);
  }
  EmberDebugConstructor.prototype = Error.prototype;

  // SAFETY: We need this cast since our EmberDebugConstructor doesn't define a type for `new` even though it will work with `new`.
  EmberError = EmberDebugConstructor as BrowserErrorConstructor;
} else {
  EmberError = Error;
}

export default EmberError;
