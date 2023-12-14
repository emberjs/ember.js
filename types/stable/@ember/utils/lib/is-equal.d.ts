declare module '@ember/utils/lib/is-equal' {
  /**
     @module @ember/utils
    */
  /**
      Compares two objects, returning true if they are equal.

      ```javascript
      import { isEqual } from '@ember/utils';

      isEqual('hello', 'hello');                   // true
      isEqual(1, 2);                               // false
      ```

      `isEqual` is a more specific comparison than a triple equal comparison.
      It will call the `isEqual` instance method on the objects being
      compared, allowing finer control over when objects should be considered
      equal to each other.

      ```javascript
      import { isEqual } from '@ember/utils';
      import EmberObject from '@ember/object';

      let Person = EmberObject.extend({
        isEqual(other) { return this.ssn == other.ssn; }
      });

      let personA = Person.create({name: 'Muhammad Ali', ssn: '123-45-6789'});
      let personB = Person.create({name: 'Cassius Clay', ssn: '123-45-6789'});

      isEqual(personA, personB); // true
      ```

      Due to the expense of array comparisons, collections will never be equal to
      each other even if each of their items are equal to each other.

      ```javascript
      import { isEqual } from '@ember/utils';

      isEqual([4, 2], [4, 2]);                     // false
      ```

      @method isEqual
      @for @ember/utils
      @static
      @param {Object} a first object to compare
      @param {Object} b second object to compare
      @return {Boolean}
      @public
    */
  export default function isEqual(a: unknown, b: unknown): boolean;
}
