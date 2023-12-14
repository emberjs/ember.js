declare module '@ember/utils/lib/type-of' {
  export type TypeName =
    | 'undefined'
    | 'null'
    | 'string'
    | 'number'
    | 'boolean'
    | 'function'
    | 'array'
    | 'regexp'
    | 'date'
    | 'filelist'
    | 'class'
    | 'instance'
    | 'error'
    | 'object';
  /**
     @module @ember/utils
    */
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
      @static
    */
  export default function typeOf(item: unknown): TypeName;
}
