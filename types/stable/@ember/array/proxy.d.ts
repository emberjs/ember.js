declare module '@ember/array/proxy' {
  /**
    @module @ember/array/proxy
    */
  import { PROPERTY_DID_CHANGE } from '@ember/-internals/metal';
  import type { PropertyDidChange } from '@ember/-internals/metal';
  import EmberObject from '@ember/object';
  import EmberArray, { type NativeArray } from '@ember/array';
  import MutableArray from '@ember/array/mutable';
  import { type Tag, type Revision } from '@glimmer/validator';
  /**
      An ArrayProxy wraps any other object that implements `Array` and/or
      `MutableArray,` forwarding all requests. This makes it very useful for
      a number of binding use cases or other cases where being able to swap
      out the underlying array is useful.

      A simple example of usage:

      ```javascript
      import { A } from '@ember/array';
      import ArrayProxy from '@ember/array/proxy';

      let pets = ['dog', 'cat', 'fish'];
      let ap = ArrayProxy.create({ content: A(pets) });

      ap.get('firstObject');                        // 'dog'
      ap.set('content', ['amoeba', 'paramecium']);
      ap.get('firstObject');                        // 'amoeba'
      ```

      This class can also be useful as a layer to transform the contents of
      an array, as they are accessed. This can be done by overriding
      `objectAtContent`:

      ```javascript
      import { A } from '@ember/array';
      import ArrayProxy from '@ember/array/proxy';

      let pets = ['dog', 'cat', 'fish'];
      let ap = ArrayProxy.create({
          content: A(pets),
          objectAtContent: function(idx) {
              return this.get('content').objectAt(idx).toUpperCase();
          }
      });

      ap.get('firstObject'); // . 'DOG'
      ```

      When overriding this class, it is important to place the call to
      `_super` *after* setting `content` so the internal observers have
      a chance to fire properly:

      ```javascript
      import { A } from '@ember/array';
      import ArrayProxy from '@ember/array/proxy';

      export default ArrayProxy.extend({
        init() {
          this.set('content', A(['dog', 'cat', 'fish']));
          this._super(...arguments);
        }
      });
      ```

      @class ArrayProxy
      @extends EmberObject
      @uses MutableArray
      @public
    */
  interface ArrayProxy<T> extends MutableArray<T> {
    /**
          The content array. Must be an object that implements `Array` and/or
          `MutableArray.`
      
          @property content
          @type EmberArray
          @public
        */
    content: T[] | EmberArray<T> | NativeArray<T> | null;
    /**
          The array that the proxy pretends to be. In the default `ArrayProxy`
          implementation, this and `content` are the same. Subclasses of `ArrayProxy`
          can override this property to provide things like sorting and filtering.
      
          @property arrangedContent
          @public
        */
    arrangedContent: EmberArray<T> | null;
    /**
          Should actually retrieve the object at the specified index from the
          content. You can override this method in subclasses to transform the
          content item to something new.
      
          This method will only be called if content is non-`null`.
      
          @method objectAtContent
          @param {Number} idx The index to retrieve.
          @return {Object} the value or undefined if none found
          @public
        */
    objectAtContent(idx: number): T | undefined;
    /**
          Should actually replace the specified objects on the content array.
          You can override this method in subclasses to transform the content item
          into something new.
      
          This method will only be called if content is non-`null`.
      
          @method replaceContent
          @param {Number} idx The starting index
          @param {Number} amt The number of items to remove from the content.
          @param {Array} objects Optional array of objects to insert.
          @return {void}
          @public
        */
    replaceContent(idx: number, amt: number, objects?: T[]): void;
    create(init: { content: Array<T> }): ArrayProxy<T>;
  }
  class ArrayProxy<T> extends EmberObject implements PropertyDidChange {
    /** @internal */
    _objectsDirtyIndex: number;
    /** @internal */
    _objects: null | T[];
    /** @internal */
    _lengthDirty: boolean;
    /** @internal */
    _length: number;
    /** @internal */
    _arrangedContent: EmberArray<T> | null;
    /** @internal */
    _arrangedContentIsUpdating: boolean;
    /** @internal */
    _arrangedContentTag: Tag | null;
    /** @internal */
    _arrangedContentRevision: Revision | null;
    /** @internal */
    _lengthTag: Tag | null;
    /** @internal */
    _arrTag: Tag | null;
    init(props: object | undefined): void;
    [PROPERTY_DID_CHANGE](): void;
    willDestroy(): void;
    content: T[] | EmberArray<T> | NativeArray<T> | null;
    arrangedContent: EmberArray<T> | null;
    replace(idx: number, amt: number, objects?: T[]): void;
    objectAt(idx: number): T | undefined;
    get length(): number;
    set length(value: number);
    _updateArrangedContentArray(arrangedContent: EmberArray<T> | null): void;
    _addArrangedContentArrayObserver(arrangedContent: EmberArray<T> | null): void;
    _removeArrangedContentArrayObserver(): void;
    _arrangedContentArrayWillChange(): void;
    _arrangedContentArrayDidChange(
      _proxy: unknown,
      idx: number,
      removedCnt: number,
      addedCnt: number
    ): void;
    _invalidate(): void;
    _revalidate(): void;
  }
  export default ArrayProxy;
}
