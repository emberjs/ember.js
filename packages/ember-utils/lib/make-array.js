/**
 Forces the passed object to be part of an array. If the object is already
 an array, it will return the object. Otherwise, it will add the object to
 an array. If obj is `null` or `undefined`, it will return an empty array.

 ```javascript
 Ember.makeArray();            // []
 Ember.makeArray(null);        // []
 Ember.makeArray(undefined);   // []
 Ember.makeArray('lindsay');   // ['lindsay']
 Ember.makeArray([1, 2, 42]);  // [1, 2, 42]

 let controller = Ember.ArrayProxy.create({ content: [] });

 Ember.makeArray(controller) === controller;  // true
 ```

 @method makeArray
 @for Ember
 @param {Object} obj the object
 @return {Array}
 @private
 */
export default function makeArray(obj) {
  if (obj === null || obj === undefined) { return []; }
  return Array.isArray(obj) ? obj : [obj];
}
