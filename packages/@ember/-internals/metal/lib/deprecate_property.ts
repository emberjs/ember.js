/**
@module ember
*/

import { deprecate } from '@ember/debug';
import { DeprecationOptions } from '@ember/debug/lib/deprecate';
import { get } from './property_get';
import { set } from './property_set';

/**
  Used internally to allow changing properties in a backwards compatible way, and print a helpful
  deprecation warning.

  @method deprecateProperty
  @param {Object} object The object to add the deprecated property to.
  @param {String} deprecatedKey The property to add (and print deprecation warnings upon accessing).
  @param {String} newKey The property that will be aliased.
  @private
  @since 1.7.0
*/

export function deprecateProperty(
  object: object,
  deprecatedKey: string,
  newKey: string,
  options?: DeprecationOptions
): void {
  function _deprecate(): void {
    deprecate(
      `Usage of \`${deprecatedKey}\` is deprecated, use \`${newKey}\` instead.`,
      false,
      options
    );
  }

  Object.defineProperty(object, deprecatedKey, {
    configurable: true,
    enumerable: false,
    set(value): any {
      _deprecate();
      set(this, newKey, value);
    },
    get(): any {
      _deprecate();
      return get(this, newKey);
    },
  });
}
