import { DEPRECATIONS, deprecateUntil } from '@ember/-internals/deprecations';
import _isNone from './lib/is_none';
import _isBlank from './lib/is_blank';
import _isEmpty from './lib/is_empty';
import _isPresent from './lib/is_present';
import _isEqual from './lib/is-equal';
import _typeOf, { type TypeName } from './lib/type-of';
import _compare, { type Compare } from './lib/compare';

/**
 @module @ember/utils
*/

/*
  Ember's own code imports the implementations from `./lib` directly,
  so only calls through this public module report the deprecation.
*/
function deprecateUtil(name: string) {
  deprecateUntil(
    `\`${name}\` from \`@ember/utils\` is deprecated. Use native JavaScript or \`${name}\` from \`@ember/legacy-utils\` instead.`,
    DEPRECATIONS.DEPRECATE_EMBER_UTILS
  );
}

/**
  Returns true if the passed value is null or undefined. This avoids errors
  from JSLint complaining about use of ==, which can be technically
  confusing.

  ```javascript
  isNone(null);          // true
  isNone(undefined);     // true
  isNone('');            // false
  isNone([]);            // false
  isNone(function() {}); // false
  ```

  @method isNone
  @static
  @for @ember/utils
  @param {Object} obj Value to test
  @return {Boolean}
  @public
  @deprecated Use native JavaScript or `isNone` from `@ember/legacy-utils` instead.
*/
export function isNone(obj: any): obj is null | undefined {
  deprecateUtil('isNone');
  return _isNone(obj);
}

/**
  A value is blank if it is empty or a whitespace string.

  ```javascript
  import { isBlank } from '@ember/utils';

  isBlank(null);            // true
  isBlank(undefined);       // true
  isBlank('');              // true
  isBlank([]);              // true
  isBlank('\n\t');          // true
  isBlank('  ');            // true
  isBlank({});              // false
  isBlank('\n\t Hello');    // false
  isBlank('Hello world');   // false
  isBlank([1,2,3]);         // false
  ```

  @method isBlank
  @static
  @for @ember/utils
  @param {Object} obj Value to test
  @return {Boolean}
  @since 1.5.0
  @public
  @deprecated Use native JavaScript or `isBlank` from `@ember/legacy-utils` instead.
*/
export function isBlank(obj: unknown): boolean {
  deprecateUtil('isBlank');
  return _isBlank(obj);
}

/**
  Verifies that a value is `null` or `undefined`, an empty string, or an empty
  array.

  Constrains the rules on `isNone` by returning true for empty strings and
  empty arrays.

  If the value is an object with a `size` property of type number, it is used
  to check emptiness.

  ```javascript
  isEmpty(null);             // true
  isEmpty(undefined);        // true
  isEmpty('');               // true
  isEmpty([]);               // true
  isEmpty({ size: 0});       // true
  isEmpty({});               // false
  isEmpty('Adam Hawkins');   // false
  isEmpty([0,1,2]);          // false
  isEmpty('\n\t');           // false
  isEmpty('  ');             // false
  isEmpty({ size: 1 })       // false
  isEmpty({ size: () => 0 }) // false
  ```

  @method isEmpty
  @static
  @for @ember/utils
  @param {Object} obj Value to test
  @return {Boolean}
  @public
  @deprecated Use native JavaScript or `isEmpty` from `@ember/legacy-utils` instead.
*/
export function isEmpty(obj: unknown): boolean {
  deprecateUtil('isEmpty');
  return _isEmpty(obj);
}

/**
  A value is present if it not `isBlank`.

  ```javascript
  isPresent(null);            // false
  isPresent(undefined);       // false
  isPresent('');              // false
  isPresent('  ');            // false
  isPresent('\n\t');          // false
  isPresent([]);              // false
  isPresent({ length: 0 });   // false
  isPresent(false);           // true
  isPresent(true);            // true
  isPresent('string');        // true
  isPresent(0);               // true
  isPresent(function() {});   // true
  isPresent({});              // true
  isPresent('\n\t Hello');    // true
  isPresent([1, 2, 3]);       // true
  ```

  @method isPresent
  @static
  @for @ember/utils
  @param {Object} obj Value to test
  @return {Boolean}
  @since 1.8.0
  @public
  @deprecated Use native JavaScript or `isPresent` from `@ember/legacy-utils` instead.
*/
export function isPresent<T>(obj: T | null | undefined): obj is T {
  deprecateUtil('isPresent');
  return _isPresent(obj);
}

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

  class Person extends EmberObject {
    isEqual(other: Person) { return this.ssn == other.ssn; }
  }

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
  @deprecated Use native JavaScript or `isEqual` from `@ember/legacy-utils` instead.
*/
export function isEqual(a: unknown, b: unknown): boolean {
  deprecateUtil('isEqual');
  return _isEqual(a, b);
}

/**
  Returns a consistent type for the passed object.

  Use this instead of the built-in `typeof` to get the type of an item.
  It will return the same result across all browsers and includes a bit
  more detail. Here is what will be returned:

      | Return Value  | Meaning                                              |
      |---------------|------------------------------------------------------|
      | 'string'      | String primitive or String object.                   |
      | 'number'      | Number primitive or Number object.                   |
      | 'boolean'     | Boolean primitive or Boolean object.                 |
      | 'null'        | Null value                                           |
      | 'undefined'   | Undefined value                                      |
      | 'function'    | A function                                           |
      | 'array'       | An instance of Array                                 |
      | 'regexp'      | An instance of RegExp                                |
      | 'date'        | An instance of Date                                  |
      | 'filelist'    | An instance of FileList                              |
      | 'class'       | An Ember class (created using EmberObject.extend())  |
      | 'instance'    | An Ember object instance                             |
      | 'error'       | An instance of the Error object                      |
      | 'object'      | A JavaScript object not inheriting from EmberObject  |

  Examples:

  ```javascript
  import { A } from '@ember/array';
  import { typeOf } from '@ember/utils';
  import EmberObject from '@ember/object';

  typeOf();                       // 'undefined'
  typeOf(null);                   // 'null'
  typeOf(undefined);              // 'undefined'
  typeOf('michael');              // 'string'
  typeOf(new String('michael'));  // 'string'
  typeOf(101);                    // 'number'
  typeOf(new Number(101));        // 'number'
  typeOf(true);                   // 'boolean'
  typeOf(new Boolean(true));      // 'boolean'
  typeOf(A);                      // 'function'
  typeOf(A());                    // 'array'
  typeOf([1, 2, 90]);             // 'array'
  typeOf(/abc/);                  // 'regexp'
  typeOf(new Date());             // 'date'
  typeOf(event.target.files);     // 'filelist'
  typeOf(EmberObject.extend());   // 'class'
  typeOf(EmberObject.create());   // 'instance'
  typeOf(new Error('teamocil'));  // 'error'

  // 'normal' JavaScript object
  typeOf({ a: 'b' });             // 'object'
  ```

  @method typeOf
  @for @ember/utils
  @param item the item to check
  @return {String} the type
  @public
  @deprecated Use native JavaScript or `typeOf` from `@ember/legacy-utils` instead.
  @static
*/
export function typeOf(item: unknown): TypeName {
  deprecateUtil('typeOf');
  return _typeOf(item);
}

/**
 Compares two javascript values and returns:

  - -1 if the first is smaller than the second,
  - 0 if both are equal,
  - 1 if the first is greater than the second.

  ```javascript
  import { compare } from '@ember/utils';

  compare('hello', 'hello');  // 0
  compare('abc', 'dfg');      // -1
  compare(2, 1);              // 1
  ```

 If the types of the two objects are different precedence occurs in the
 following order, with types earlier in the list considered `<` types
 later in the list:

  - undefined
  - null
  - boolean
  - number
  - string
  - array
  - object
  - instance
  - function
  - class
  - date

  ```javascript
  import { compare } from '@ember/utils';

  compare('hello', 50);       // 1
  compare(50, 'hello');       // -1
  ```

 @method compare
 @for @ember/utils
 @static
 @param {Object} v First value to compare
 @param {Object} w Second value to compare
 @return {Number} -1 if v < w, 0 if v = w and 1 if v > w.
 @public
 @deprecated Use native JavaScript or `compare` from `@ember/legacy-utils` instead.
*/
export function compare<T>(v: T, w: T): Compare {
  deprecateUtil('compare');
  return _compare(v, w);
}
