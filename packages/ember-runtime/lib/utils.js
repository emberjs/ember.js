import EmberArray from './mixins/array';
import EmberObject from './system/object';

// ........................................
// TYPING & ARRAY MESSAGING
//
const TYPE_MAP = {
  '[object Boolean]':           'boolean',
  '[object Number]':            'number',
  '[object String]':            'string',
  '[object Function]':          'function',
  '[object Array]':             'array',
  '[object Date]':              'date',
  '[object RegExp]':            'regexp',
  '[object Object]':            'object',
  '[object FileList]':          'filelist',
  '[object AsyncFunction]':     'function',
  '[object GeneratorFunction]': 'function'
};

const { toString } = Object.prototype;

/**
  Returns true if the passed object is an array or Array-like.

  Objects are considered Array-like if any of the following are true:

    - the object is a native Array
    - the object has an objectAt property
    - the object is an Object, and has a length property

  Unlike `Ember.typeOf` this method returns true even if the passed object is
  not formally an array but appears to be array-like (i.e. implements `Ember.Array`)

  ```javascript
  Ember.isArray();                                          // false
  Ember.isArray([]);                                        // true
  Ember.isArray(Ember.ArrayProxy.create({ content: [] }));  // true
  ```

  @method isArray
  @for Ember
  @param {Object} obj The object to test
  @return {Boolean} true if the passed object is an array or Array-like
  @public
*/
export function isArray(obj) {
  if (!obj || obj.setInterval) { return false; }
  if (Array.isArray(obj)) { return true; }
  if (EmberArray.detect(obj)) { return true; }

  let type = typeOf(obj);
  if ('array' === type) { return true; }
  let length = obj.length;
  if (typeof length === 'number' && length === length && 'object' === type) { return true; }
  return false;
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
      | 'class'       | An Ember class (created using Ember.Object.extend()) |
      | 'instance'    | An Ember object instance                             |
      | 'error'       | An instance of the Error object                      |
      | 'object'      | A JavaScript object not inheriting from Ember.Object |

  Examples:

  ```javascript
  Ember.typeOf();                       // 'undefined'
  Ember.typeOf(null);                   // 'null'
  Ember.typeOf(undefined);              // 'undefined'
  Ember.typeOf('michael');              // 'string'
  Ember.typeOf(new String('michael'));  // 'string'
  Ember.typeOf(101);                    // 'number'
  Ember.typeOf(new Number(101));        // 'number'
  Ember.typeOf(true);                   // 'boolean'
  Ember.typeOf(new Boolean(true));      // 'boolean'
  Ember.typeOf(Ember.A);                // 'function'
  Ember.typeOf([1, 2, 90]);             // 'array'
  Ember.typeOf(/abc/);                  // 'regexp'
  Ember.typeOf(new Date());             // 'date'
  Ember.typeOf(event.target.files);     // 'filelist'
  Ember.typeOf(Ember.Object.extend());  // 'class'
  Ember.typeOf(Ember.Object.create());  // 'instance'
  Ember.typeOf(new Error('teamocil'));  // 'error'
  Ember.typeOf(function(){})            // 'function'
  Ember.typeOf(async function(){})      // 'function'
  Ember.typeof(function* (){})          // 'function'

  // 'normal' JavaScript object
  Ember.typeOf({ a: 'b' });             // 'object'
  ```

  @method typeOf
  @for Ember
  @param {Object} item the item to check
  @return {String} the type
  @public
*/
export function typeOf(item) {
  if (item === null) { return 'null'; }
  if (item === undefined) { return 'undefined'; }
  let ret = TYPE_MAP[toString.call(item)] || 'object';

  if (ret === 'function') {
    if (EmberObject.detect(item)) {
      ret = 'class';
    }
  } else if (ret === 'object') {
    if (item instanceof Error) {
      ret = 'error';
    } else if (item instanceof EmberObject) {
      ret = 'instance';
    } else if (item instanceof Date) {
      ret = 'date';
    }
  }

  return ret;
}
