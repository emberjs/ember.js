import Ember from 'ember-metal/core';
import { deprecate } from 'ember-metal/debug';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { computed } from 'ember-metal/computed';
import isEmpty from 'ember-metal/is_empty';
import isNone from 'ember-metal/is_none';
import alias from 'ember-metal/alias';

/**
@module ember
@submodule ember-metal
*/

function getProperties(self, propertyNames) {
  var ret = {};
  for (var i = 0; i < propertyNames.length; i++) {
    ret[propertyNames[i]] = get(self, propertyNames[i]);
  }
  return ret;
}

function generateComputedWithProperties(macro) {
  return function(...properties) {
    var computedFunc = computed(function() {
      return macro.apply(this, [getProperties(this, properties)]);
    });

    return computedFunc.property.apply(computedFunc, properties);
  };
}

/**
  A computed property that returns true if the value of the dependent
  property is null, an empty string, empty array, or empty function.

  Example

  ```javascript
  var ToDoList = Ember.Object.extend({
    isDone: Ember.computed.empty('todos')
  });

  var todoList = ToDoList.create({
    todos: ['Unit Test', 'Documentation', 'Release']
  });

  todoList.get('isDone'); // false
  todoList.get('todos').clear();
  todoList.get('isDone'); // true
  ```

  @since 1.6.0
  @method empty
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which negate
  the original value for property
  @public
*/
export function empty(dependentKey) {
  return computed(dependentKey + '.length', function() {
    return isEmpty(get(this, dependentKey));
  });
}

/**
  A computed property that returns true if the value of the dependent
  property is NOT null, an empty string, empty array, or empty function.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    hasStuff: Ember.computed.notEmpty('backpack')
  });

  var hamster = Hamster.create({ backpack: ['Food', 'Sleeping Bag', 'Tent'] });

  hamster.get('hasStuff');         // true
  hamster.get('backpack').clear(); // []
  hamster.get('hasStuff');         // false
  ```

  @method notEmpty
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which returns true if
  original value for property is not empty.
  @public
*/
export function notEmpty(dependentKey) {
  return computed(dependentKey + '.length', function() {
    return !isEmpty(get(this, dependentKey));
  });
}

/**
  A computed property that returns true if the value of the dependent
  property is null or undefined. This avoids errors from JSLint complaining
  about use of ==, which can be technically confusing.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    isHungry: Ember.computed.none('food')
  });

  var hamster = Hamster.create();

  hamster.get('isHungry'); // true
  hamster.set('food', 'Banana');
  hamster.get('isHungry'); // false
  hamster.set('food', null);
  hamster.get('isHungry'); // true
  ```

  @method none
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which
  returns true if original value for property is null or undefined.
  @public
*/
export function none(dependentKey) {
  return computed(dependentKey, function() {
    return isNone(get(this, dependentKey));
  });
}

/**
  A computed property that returns the inverse boolean value
  of the original value for the dependent property.

  Example

  ```javascript
  var User = Ember.Object.extend({
    isAnonymous: Ember.computed.not('loggedIn')
  });

  var user = User.create({loggedIn: false});

  user.get('isAnonymous'); // true
  user.set('loggedIn', true);
  user.get('isAnonymous'); // false
  ```

  @method not
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which returns
  inverse of the original value for property
  @public
*/
export function not(dependentKey) {
  return computed(dependentKey, function() {
    return !get(this, dependentKey);
  });
}

/**
  A computed property that converts the provided dependent property
  into a boolean value.

  ```javascript
  var Hamster = Ember.Object.extend({
    hasBananas: Ember.computed.bool('numBananas')
  });

  var hamster = Hamster.create();

  hamster.get('hasBananas'); // false
  hamster.set('numBananas', 0);
  hamster.get('hasBananas'); // false
  hamster.set('numBananas', 1);
  hamster.get('hasBananas'); // true
  hamster.set('numBananas', null);
  hamster.get('hasBananas'); // false
  ```

  @method bool
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which converts
  to boolean the original value for property
  @public
*/
export function bool(dependentKey) {
  return computed(dependentKey, function() {
    return !!get(this, dependentKey);
  });
}

/**
  A computed property which matches the original value for the
  dependent property against a given RegExp, returning `true`
  if they values matches the RegExp and `false` if it does not.

  Example

  ```javascript
  var User = Ember.Object.extend({
    hasValidEmail: Ember.computed.match('email', /^.+@.+\..+$/)
  });

  var user = User.create({loggedIn: false});

  user.get('hasValidEmail'); // false
  user.set('email', '');
  user.get('hasValidEmail'); // false
  user.set('email', 'ember_hamster@example.com');
  user.get('hasValidEmail'); // true
  ```

  @method match
  @for Ember.computed
  @param {String} dependentKey
  @param {RegExp} regexp
  @return {Ember.ComputedProperty} computed property which match
  the original value for property against a given RegExp
  @public
*/
export function match(dependentKey, regexp) {
  return computed(dependentKey, function() {
    var value = get(this, dependentKey);

    return typeof value === 'string' ? regexp.test(value) : false;
  });
}

/**
  A computed property that returns true if the provided dependent property
  is equal to the given value.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    napTime: Ember.computed.equal('state', 'sleepy')
  });

  var hamster = Hamster.create();

  hamster.get('napTime'); // false
  hamster.set('state', 'sleepy');
  hamster.get('napTime'); // true
  hamster.set('state', 'hungry');
  hamster.get('napTime'); // false
  ```

  @method equal
  @for Ember.computed
  @param {String} dependentKey
  @param {String|Number|Object} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is equal to the given value.
  @public
*/
export function equal(dependentKey, value) {
  return computed(dependentKey, function() {
    return get(this, dependentKey) === value;
  });
}

/**
  A computed property that returns true if the provided dependent property
  is greater than the provided value.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    hasTooManyBananas: Ember.computed.gt('numBananas', 10)
  });

  var hamster = Hamster.create();

  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 3);
  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 11);
  hamster.get('hasTooManyBananas'); // true
  ```

  @method gt
  @for Ember.computed
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is greater than given value.
  @public
*/
export function gt(dependentKey, value) {
  return computed(dependentKey, function() {
    return get(this, dependentKey) > value;
  });
}

/**
  A computed property that returns true if the provided dependent property
  is greater than or equal to the provided value.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    hasTooManyBananas: Ember.computed.gte('numBananas', 10)
  });

  var hamster = Hamster.create();

  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 3);
  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 10);
  hamster.get('hasTooManyBananas'); // true
  ```

  @method gte
  @for Ember.computed
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is greater or equal then given value.
  @public
*/
export function gte(dependentKey, value) {
  return computed(dependentKey, function() {
    return get(this, dependentKey) >= value;
  });
}

/**
  A computed property that returns true if the provided dependent property
  is less than the provided value.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    needsMoreBananas: Ember.computed.lt('numBananas', 3)
  });

  var hamster = Hamster.create();

  hamster.get('needsMoreBananas'); // true
  hamster.set('numBananas', 3);
  hamster.get('needsMoreBananas'); // false
  hamster.set('numBananas', 2);
  hamster.get('needsMoreBananas'); // true
  ```

  @method lt
  @for Ember.computed
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is less then given value.
  @public
*/
export function lt(dependentKey, value) {
  return computed(dependentKey, function() {
    return get(this, dependentKey) < value;
  });
}

/**
  A computed property that returns true if the provided dependent property
  is less than or equal to the provided value.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    needsMoreBananas: Ember.computed.lte('numBananas', 3)
  });

  var hamster = Hamster.create();

  hamster.get('needsMoreBananas'); // true
  hamster.set('numBananas', 5);
  hamster.get('needsMoreBananas'); // false
  hamster.set('numBananas', 3);
  hamster.get('needsMoreBananas'); // true
  ```

  @method lte
  @for Ember.computed
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is less or equal than given value.
  @public
*/
export function lte(dependentKey, value) {
  return computed(dependentKey, function() {
    return get(this, dependentKey) <= value;
  });
}

/**
  A computed property that performs a logical `and` on the
  original values for the provided dependent properties.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    readyForCamp: Ember.computed.and('hasTent', 'hasBackpack')
  });

  var hamster = Hamster.create();

  hamster.get('readyForCamp'); // false
  hamster.set('hasTent', true);
  hamster.get('readyForCamp'); // false
  hamster.set('hasBackpack', true);
  hamster.get('readyForCamp'); // true
  hamster.set('hasBackpack', 'Yes');
  hamster.get('readyForCamp'); // 'Yes'
  ```

  @method and
  @for Ember.computed
  @param {String} dependentKey*
  @return {Ember.ComputedProperty} computed property which performs
  a logical `and` on the values of all the original values for properties.
  @public
*/
export var and = generateComputedWithProperties(function(properties) {
  var value;
  for (var key in properties) {
    value = properties[key];
    if (properties.hasOwnProperty(key) && !value) {
      return false;
    }
  }
  return value;
});

/**
  A computed property which performs a logical `or` on the
  original values for the provided dependent properties.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    readyForRain: Ember.computed.or('hasJacket', 'hasUmbrella')
  });

  var hamster = Hamster.create();

  hamster.get('readyForRain'); // false
  hamster.set('hasUmbrella', true);
  hamster.get('readyForRain'); // true
  hamster.set('hasJacket', 'Yes');
  hamster.get('readyForRain'); // 'Yes'
  ```

  @method or
  @for Ember.computed
  @param {String} dependentKey*
  @return {Ember.ComputedProperty} computed property which performs
  a logical `or` on the values of all the original values for properties.
  @public
*/
export var or = generateComputedWithProperties(function(properties) {
  var value;
  for (var key in properties) {
    value = properties[key];
    if (properties.hasOwnProperty(key) && value) {
      return value;
    }
  }
  return value;
});

/**
  A computed property that returns the array of values
  for the provided dependent properties.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    clothes: Ember.computed.collect('hat', 'shirt')
  });

  var hamster = Hamster.create();

  hamster.get('clothes'); // [null, null]
  hamster.set('hat', 'Camp Hat');
  hamster.set('shirt', 'Camp Shirt');
  hamster.get('clothes'); // ['Camp Hat', 'Camp Shirt']
  ```

  @method collect
  @for Ember.computed
  @param {String} dependentKey*
  @return {Ember.ComputedProperty} computed property which maps
  values of all passed in properties to an array.
  @public
*/
export var collect = generateComputedWithProperties(function(properties) {
  var res = Ember.A();
  for (var key in properties) {
    if (properties.hasOwnProperty(key)) {
      if (isNone(properties[key])) {
        res.push(null);
      } else {
        res.push(properties[key]);
      }
    }
  }
  return res;
});

/**
  Creates a new property that is an alias for another property
  on an object. Calls to `get` or `set` this property behave as
  though they were called on the original property.

  ```javascript
  var Person = Ember.Object.extend({
    name: 'Alex Matchneer',
    nomen: Ember.computed.alias('name')
  });

  var alex = Person.create();

  alex.get('nomen'); // 'Alex Matchneer'
  alex.get('name');  // 'Alex Matchneer'

  alex.set('nomen', '@machty');
  alex.get('name');  // '@machty'
  ```

  @method alias
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates an
  alias to the original value for property.
  @public
*/

/**
  Where `computed.alias` aliases `get` and `set`, and allows for bidirectional
  data flow, `computed.oneWay` only provides an aliased `get`. The `set` will
  not mutate the upstream property, rather causes the current property to
  become the value set. This causes the downstream property to permanently
  diverge from the upstream property.

  Example

  ```javascript
  var User = Ember.Object.extend({
    firstName: null,
    lastName: null,
    nickName: Ember.computed.oneWay('firstName')
  });

  var teddy = User.create({
    firstName: 'Teddy',
    lastName:  'Zeenny'
  });

  teddy.get('nickName');              // 'Teddy'
  teddy.set('nickName', 'TeddyBear'); // 'TeddyBear'
  teddy.get('firstName');             // 'Teddy'
  ```

  @method oneWay
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates a
  one way computed property to the original value for property.
  @public
*/
export function oneWay(dependentKey) {
  return alias(dependentKey).oneWay();
}

/**
  This is a more semantically meaningful alias of `computed.oneWay`,
  whose name is somewhat ambiguous as to which direction the data flows.

  @method reads
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates a
    one way computed property to the original value for property.
  @public
 */

/**
  Where `computed.oneWay` provides oneWay bindings, `computed.readOnly` provides
  a readOnly one way binding. Very often when using `computed.oneWay` one does
  not also want changes to propagate back up, as they will replace the value.

  This prevents the reverse flow, and also throws an exception when it occurs.

  Example

  ```javascript
  var User = Ember.Object.extend({
    firstName: null,
    lastName: null,
    nickName: Ember.computed.readOnly('firstName')
  });

  var teddy = User.create({
    firstName: 'Teddy',
    lastName:  'Zeenny'
  });

  teddy.get('nickName');              // 'Teddy'
  teddy.set('nickName', 'TeddyBear'); // throws Exception
  // throw new Ember.Error('Cannot Set: nickName on: <User:ember27288>' );`
  teddy.get('firstName');             // 'Teddy'
  ```

  @method readOnly
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates a
  one way computed property to the original value for property.
  @since 1.5.0
  @public
*/
export function readOnly(dependentKey) {
  return alias(dependentKey).readOnly();
}

/**
  Creates a new property that is an alias for another property
  on an object. Calls to `get` or `set` this property behave as
  though they were called on the original property, but also
  print a deprecation warning.

  @method deprecatingAlias
  @for Ember.computed
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates an
  alias with a deprecation to the original value for property.
  @since 1.7.0
  @public
*/
export function deprecatingAlias(dependentKey, options) {
  return computed(dependentKey, {
    get(key) {
      deprecate(`Usage of \`${key}\` is deprecated, use \`${dependentKey}\` instead.`, false, options);
      return get(this, dependentKey);
    },
    set(key, value) {
      deprecate(`Usage of \`${key}\` is deprecated, use \`${dependentKey}\` instead.`, false, options);
      set(this, dependentKey, value);
      return value;
    }
  });
}
