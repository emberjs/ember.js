declare module '@ember/-internals/metal/lib/property_events' {
  import type { Meta } from '@ember/-internals/meta';
  /**
     @module ember
     @private
     */
  export const PROPERTY_DID_CHANGE: unique symbol;
  export interface PropertyDidChange {
    [PROPERTY_DID_CHANGE]: (keyName: string, value?: unknown) => void;
  }
  export function hasPropertyDidChange(obj: unknown): obj is PropertyDidChange;
  /**
      This function is called just after an object property has changed.
      It will notify any observers and clear caches among other things.

      Normally you will not need to call this method directly but if for some
      reason you can't directly watch a property you can invoke this method
      manually.

      @method notifyPropertyChange
      @for @ember/object
      @param {Object} obj The object with the property that will change
      @param {String} keyName The property key (or path) that will change.
      @param {Meta} [_meta] The objects meta.
      @param {unknown} [value] The new value to set for the property
      @return {void}
      @since 3.1.0
      @public
    */
  function notifyPropertyChange(
    obj: object,
    keyName: string,
    _meta?: Meta | null,
    value?: unknown
  ): void;
  /**
      @method beginPropertyChanges
      @chainable
      @private
    */
  function beginPropertyChanges(): void;
  /**
      @method endPropertyChanges
      @private
    */
  function endPropertyChanges(): void;
  /**
      Make a series of property changes together in an
      exception-safe way.

      ```javascript
      Ember.changeProperties(function() {
        obj1.set('foo', mayBlowUpWhenSet);
        obj2.set('bar', baz);
      });
      ```

      @method changeProperties
      @param {Function} callback
      @private
    */
  function changeProperties(callback: () => void): void;
  export { notifyPropertyChange, beginPropertyChanges, endPropertyChanges, changeProperties };
}
