import Ember from "ember-metal/core";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { computed } from "ember-metal/computed";
import isEmpty from 'ember-metal/is_empty';
import { isNone } from 'ember-metal/is_none';
import alias from 'ember-metal/alias';

/**
@module ember-metal
*/

var a_slice = [].slice;

function getProperties(self, propertyNames) {
  var ret = {};
  for(var i = 0; i < propertyNames.length; i++) {
    ret[propertyNames[i]] = get(self, propertyNames[i]);
  }
  return ret;
}

function registerComputed(name, macro) {
  computed[name] = function(dependentKey) {
    var args = a_slice.call(arguments);
    return computed(dependentKey, function() {
      return macro.apply(this, args);
    });
  };
}

function registerComputedWithProperties(name, macro) {
  computed[name] = function() {
    var properties = a_slice.call(arguments);

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
    done: Ember.computed.empty('todos')
  });

  var todoList = ToDoList.create({
    todos: ['Unit Test', 'Documentation', 'Release']
  });

  todoList.get('done'); // false
  todoList.get('todos').clear();
  todoList.get('done'); // true
  ```

  @since 1.6.0
  @method computed.empty
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which negate
  the original value for property
*/
computed.empty = function (dependentKey) {
  return computed(dependentKey + '.length', function () {
    return isEmpty(get(this, dependentKey));
  });
};

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

  @method computed.notEmpty
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which returns true if
  original value for property is not empty.
*/
computed.notEmpty = function(dependentKey) {
  return computed(dependentKey + '.length', function () {
    return !isEmpty(get(this, dependentKey));
  });
};

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

  @method computed.none
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which
  returns true if original value for property is null or undefined.
*/
registerComputed('none', function(dependentKey) {
  return isNone(get(this, dependentKey));
});

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

  @method computed.not
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which returns
  inverse of the original value for property
*/
registerComputed('not', function(dependentKey) {
  return !get(this, dependentKey);
});

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

  @method computed.bool
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which converts
  to boolean the original value for property
*/
registerComputed('bool', function(dependentKey) {
  return !!get(this, dependentKey);
});

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

  @method computed.match
  @for Ember
  @param {String} dependentKey
  @param {RegExp} regexp
  @return {Ember.ComputedProperty} computed property which match
  the original value for property against a given RegExp
*/
registerComputed('match', function(dependentKey, regexp) {
  var value = get(this, dependentKey);
  return typeof value === 'string' ? regexp.test(value) : false;
});

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

  @method computed.equal
  @for Ember
  @param {String} dependentKey
  @param {String|Number|Object} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is equal to the given value.
*/
registerComputed('equal', function(dependentKey, value) {
  return get(this, dependentKey) === value;
});

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

  @method computed.gt
  @for Ember
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is greater than given value.
*/
registerComputed('gt', function(dependentKey, value) {
  return get(this, dependentKey) > value;
});

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

  @method computed.gte
  @for Ember
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is greater or equal then given value.
*/
registerComputed('gte', function(dependentKey, value) {
  return get(this, dependentKey) >= value;
});

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

  @method computed.lt
  @for Ember
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is less then given value.
*/
registerComputed('lt', function(dependentKey, value) {
  return get(this, dependentKey) < value;
});

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

  @method computed.lte
  @for Ember
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is less or equal than given value.
*/
registerComputed('lte', function(dependentKey, value) {
  return get(this, dependentKey) <= value;
});

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
  ```

  @method computed.and
  @for Ember
  @param {String} dependentKey*
  @return {Ember.ComputedProperty} computed property which performs
  a logical `and` on the values of all the original values for properties.
*/
registerComputedWithProperties('and', function(properties) {
  for (var key in properties) {
    if (properties.hasOwnProperty(key) && !properties[key]) {
      return false;
    }
  }
  return true;
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
  hamster.set('hasJacket', true);
  hamster.get('readyForRain'); // true
  ```

  @method computed.or
  @for Ember
  @param {String} dependentKey*
  @return {Ember.ComputedProperty} computed property which performs
  a logical `or` on the values of all the original values for properties.
*/
registerComputedWithProperties('or', function(properties) {
  for (var key in properties) {
    if (properties.hasOwnProperty(key) && properties[key]) {
      return true;
    }
  }
  return false;
});

/**
  A computed property that returns the first truthy value
  from a list of dependent properties.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    hasClothes: Ember.computed.any('hat', 'shirt')
  });

  var hamster = Hamster.create();

  hamster.get('hasClothes'); // null
  hamster.set('shirt', 'Hawaiian Shirt');
  hamster.get('hasClothes'); // 'Hawaiian Shirt'
  ```

  @method computed.any
  @for Ember
  @param {String} dependentKey*
  @return {Ember.ComputedProperty} computed property which returns
  the first truthy value of given list of properties.
*/
registerComputedWithProperties('any', function(properties) {
  for (var key in properties) {
    if (properties.hasOwnProperty(key) && properties[key]) {
      return properties[key];
    }
  }
  return null;
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

  @method computed.collect
  @for Ember
  @param {String} dependentKey*
  @return {Ember.ComputedProperty} computed property which maps
  values of all passed in properties to an array.
*/
registerComputedWithProperties('collect', function(properties) {
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

  @method computed.alias
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates an
  alias to the original value for property.
*/
computed.alias = alias;

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

  @method computed.oneWay
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates a
  one way computed property to the original value for property.
*/
computed.oneWay = function(dependentKey) {
  return alias(dependentKey).oneWay();
};

/**
  This is a more semantically meaningful alias of `computed.oneWay`,
  whose name is somewhat ambiguous as to which direction the data flows.

  @method computed.reads
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates a
    one way computed property to the original value for property.
 */
computed.reads = computed.oneWay;

/**
  Where `computed.oneWay` provides oneWay bindings, `computed.readOnly` provides
  a readOnly one way binding. Very often when using `computed.oneWay` one does
  not also want changes to propogate back up, as they will replace the value.

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

  @method computed.readOnly
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates a
  one way computed property to the original value for property.
  @since 1.5.0
*/
computed.readOnly = function(dependentKey) {
  return alias(dependentKey).readOnly();
};
/**
  A computed property that acts like a standard getter and setter,
  but returns the value at the provided `defaultPath` if the
  property itself has not been set to a value

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    wishList: Ember.computed.defaultTo('favoriteFood')
  });

  var hamster = Hamster.create({ favoriteFood: 'Banana' });

  hamster.get('wishList');                     // 'Banana'
  hamster.set('wishList', 'More Unit Tests');
  hamster.get('wishList');                     // 'More Unit Tests'
  hamster.get('favoriteFood');                 // 'Banana'
  ```

  @method computed.defaultTo
  @for Ember
  @param {String} defaultPath
  @return {Ember.ComputedProperty} computed property which acts like
  a standard getter and setter, but defaults to the value from `defaultPath`.
  @deprecated Use `Ember.computed.oneWay` or custom CP with default instead.
*/
// ES6TODO: computed should have its own export path so you can do import {defaultTo} from computed
computed.defaultTo = function(defaultPath) {
  return computed(function(key, newValue, cachedValue) {
    Ember.deprecate('Usage of Ember.computed.defaultTo is deprecated, use `Ember.computed.oneWay` instead.');

    if (arguments.length === 1) {
      return get(this, defaultPath);
    }
    return newValue != null ? newValue : get(this, defaultPath);
  });
};

/**
  Creates a new property that is an alias for another property
  on an object. Calls to `get` or `set` this property behave as
  though they were called on the original property, but also
  print a deprecation warning.

  @method computed.deprecatingAlias
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates an
  alias with a deprecation to the original value for property.
  @since 1.7.0
*/
computed.deprecatingAlias = function(dependentKey) {
  return computed(dependentKey, function(key, value) {
    Ember.deprecate('Usage of `' + key + '` is deprecated, use `' + dependentKey + '` instead.');

    if (arguments.length > 1) {
      set(this, dependentKey, value);
      return value;
    } else {
      return get(this, dependentKey);
    }
  });
};
