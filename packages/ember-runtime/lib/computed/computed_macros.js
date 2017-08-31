import {
  get,
  set,
  computed,
  ComputedProperty,
  isEmpty,
  isNone,
  alias,
  expandProperties
} from 'ember-metal';
import {
  assert,
  deprecate
} from 'ember-debug';

/**
@module @ember/object
*/

function expandPropertiesToArray(predicateName, properties) {
  let expandedProperties = [];

  function extractProperty(entry) {
    expandedProperties.push(entry);
  }

  for (let i = 0; i < properties.length; i++) {
    let property = properties[i];
    assert(`Dependent keys passed to Ember.computed.${predicateName}() can\'t have spaces.`, property.indexOf(' ') < 0);

    expandProperties(property, extractProperty);
  }

  return expandedProperties;
}

function generateComputedWithPredicate(name, predicate) {
  return (...properties) => {
    let dependentKeys = expandPropertiesToArray(name, properties);

    let computedFunc = new ComputedProperty(function() {
      let lastIdx = dependentKeys.length - 1;

      for (let i = 0; i < lastIdx; i++) {
        let value = get(this, dependentKeys[i]);
        if (!predicate(value)) {
          return value;
        }
      }

      return get(this, dependentKeys[lastIdx]);
    }, { dependentKeys });

    return computedFunc;
  };
}

/**
  A computed property that returns true if the value of the dependent
  property is null, an empty string, empty array, or empty function.

  Example

  ```javascript
  let ToDoList = Ember.Object.extend({
    isDone: Ember.computed.empty('todos')
  });

  let todoList = ToDoList.create({
    todos: ['Unit Test', 'Documentation', 'Release']
  });

  todoList.get('isDone'); // false
  todoList.get('todos').clear();
  todoList.get('isDone'); // true
  ```

  @since 1.6.0
  @method empty
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @return {ComputedProperty} computed property which negate
  the original value for property
  @public
*/
export function empty(dependentKey) {
  return computed(`${dependentKey}.length`, function() {
    return isEmpty(get(this, dependentKey));
  });
}

/**
  A computed property that returns true if the value of the dependent
  property is NOT null, an empty string, empty array, or empty function.

  Example

  ```javascript
  let Hamster = Ember.Object.extend({
    hasStuff: Ember.computed.notEmpty('backpack')
  });

  let hamster = Hamster.create({ backpack: ['Food', 'Sleeping Bag', 'Tent'] });

  hamster.get('hasStuff');         // true
  hamster.get('backpack').clear(); // []
  hamster.get('hasStuff');         // false
  ```

  @method notEmpty
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @return {@ember/object/computed} computed property which returns true if
  original value for property is not empty.
  @public
*/
export function notEmpty(dependentKey) {
  return computed(`${dependentKey}.length`, function() {
    return !isEmpty(get(this, dependentKey));
  });
}

/**
  A computed property that returns true if the value of the dependent
  property is null or undefined. This avoids errors from JSLint complaining
  about use of ==, which can be technically confusing.

  Example

  ```javascript
  let Hamster = Ember.Object.extend({
    isHungry: Ember.computed.none('food')
  });

  let hamster = Hamster.create();

  hamster.get('isHungry'); // true
  hamster.set('food', 'Banana');
  hamster.get('isHungry'); // false
  hamster.set('food', null);
  hamster.get('isHungry'); // true
  ```

  @method none
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @return {@ember/object/computed} computed property which
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
  let User = Ember.Object.extend({
    isAnonymous: Ember.computed.not('loggedIn')
  });

  let user = User.create({loggedIn: false});

  user.get('isAnonymous'); // true
  user.set('loggedIn', true);
  user.get('isAnonymous'); // false
  ```

  @method not
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @return {@ember/object/computed} computed property which returns
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
  let Hamster = Ember.Object.extend({
    hasBananas: Ember.computed.bool('numBananas')
  });

  let hamster = Hamster.create();

  hamster.get('hasBananas'); // false
  hamster.set('numBananas', 0);
  hamster.get('hasBananas'); // false
  hamster.set('numBananas', 1);
  hamster.get('hasBananas'); // true
  hamster.set('numBananas', null);
  hamster.get('hasBananas'); // false
  ```

  @method bool
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @return {@ember/object/computed} computed property which converts
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
  if the value matches the RegExp and `false` if it does not.

  Example

  ```javascript
  let User = Ember.Object.extend({
    hasValidEmail: Ember.computed.match('email', /^.+@.+\..+$/)
  });

  let user = User.create({loggedIn: false});

  user.get('hasValidEmail'); // false
  user.set('email', '');
  user.get('hasValidEmail'); // false
  user.set('email', 'ember_hamster@example.com');
  user.get('hasValidEmail'); // true
  ```

  @method match
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @param {RegExp} regexp
  @return {@ember/object/computed} computed property which match
  the original value for property against a given RegExp
  @public
*/
export function match(dependentKey, regexp) {
  return computed(dependentKey, function() {
    let value = get(this, dependentKey);
    return regexp.test(value);
  });
}

/**
  A computed property that returns true if the provided dependent property
  is equal to the given value.

  Example

  ```javascript
  let Hamster = Ember.Object.extend({
    satisfied: Ember.computed.equal('percentCarrotsEaten', 100)
  });

  let hamster = Hamster.create();

  hamster.get('satisfied'); // false
  hamster.set('percentCarrotsEaten', 100);
  hamster.get('satisfied'); // true
  hamster.set('percentCarrotsEaten', 50);
  hamster.get('satisfied'); // false
  ```

  @method equal
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @param {String|Number|Object} value
  @return {@ember/object/computed} computed property which returns true if
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
  let Hamster = Ember.Object.extend({
    hasTooManyBananas: Ember.computed.gt('numBananas', 10)
  });

  let hamster = Hamster.create();

  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 3);
  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 11);
  hamster.get('hasTooManyBananas'); // true
  ```

  @method gt
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @param {Number} value
  @return {@ember/object/computed} computed property which returns true if
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
  let Hamster = Ember.Object.extend({
    hasTooManyBananas: Ember.computed.gte('numBananas', 10)
  });

  let hamster = Hamster.create();

  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 3);
  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 10);
  hamster.get('hasTooManyBananas'); // true
  ```

  @method gte
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @param {Number} value
  @return {@ember/object/computed} computed property which returns true if
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
  let Hamster = Ember.Object.extend({
    needsMoreBananas: Ember.computed.lt('numBananas', 3)
  });

  let hamster = Hamster.create();

  hamster.get('needsMoreBananas'); // true
  hamster.set('numBananas', 3);
  hamster.get('needsMoreBananas'); // false
  hamster.set('numBananas', 2);
  hamster.get('needsMoreBananas'); // true
  ```

  @method lt
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @param {Number} value
  @return {@ember/object/computed} computed property which returns true if
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
  let Hamster = Ember.Object.extend({
    needsMoreBananas: Ember.computed.lte('numBananas', 3)
  });

  let hamster = Hamster.create();

  hamster.get('needsMoreBananas'); // true
  hamster.set('numBananas', 5);
  hamster.get('needsMoreBananas'); // false
  hamster.set('numBananas', 3);
  hamster.get('needsMoreBananas'); // true
  ```

  @method lte
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @param {Number} value
  @return {@ember/object/computed} computed property which returns true if
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

  You may pass in more than two properties and even use
  property brace expansion.  The computed property will
  return the first falsy value or last truthy value
  just like JavaScript's `&&` operator.

  Example

  ```javascript
  let Hamster = Ember.Object.extend({
    readyForCamp: Ember.computed.and('hasTent', 'hasBackpack'),
    readyForHike: Ember.computed.and('hasWalkingStick', 'hasBackpack')
  });

  let tomster = Hamster.create();

  tomster.get('readyForCamp'); // false
  tomster.set('hasTent', true);
  tomster.get('readyForCamp'); // false
  tomster.set('hasBackpack', true);
  tomster.get('readyForCamp'); // true
  tomster.set('hasBackpack', 'Yes');
  tomster.get('readyForCamp'); // 'Yes'
  tomster.set('hasWalkingStick', null);
  tomster.get('readyForHike'); // null
  ```

  @method and
  @static
  @for @ember/object/computed
  @param {String} dependentKey*
  @return {@ember/object/computed} computed property which performs
  a logical `and` on the values of all the original values for properties.
  @public
*/
export const and = generateComputedWithPredicate('and', value => value);

/**
  A computed property which performs a logical `or` on the
  original values for the provided dependent properties.

  You may pass in more than two properties and even use
  property brace expansion.  The computed property will
  return the first truthy value or last falsy value just
  like JavaScript's `||` operator.

  Example

  ```javascript
  let Hamster = Ember.Object.extend({
    readyForRain: Ember.computed.or('hasJacket', 'hasUmbrella'),
    readyForBeach: Ember.computed.or('{hasSunscreen,hasUmbrella}')
  });

  let tomster = Hamster.create();

  tomster.get('readyForRain'); // undefined
  tomster.set('hasUmbrella', true);
  tomster.get('readyForRain'); // true
  tomster.set('hasJacket', 'Yes');
  tomster.get('readyForRain'); // 'Yes'
  tomster.set('hasSunscreen', 'Check');
  tomster.get('readyForBeach'); // 'Check'
  ```

  @method or
  @static
  @for @ember/object/computed
  @param {String} dependentKey*
  @return {@ember/object/computed} computed property which performs
  a logical `or` on the values of all the original values for properties.
  @public
*/
export const or = generateComputedWithPredicate('or', value => !value);

/**
  Creates a new property that is an alias for another property
  on an object. Calls to `get` or `set` this property behave as
  though they were called on the original property.

  ```javascript
  let Person = Ember.Object.extend({
    name: 'Alex Matchneer',
    nomen: Ember.computed.alias('name')
  });

  let alex = Person.create();

  alex.get('nomen'); // 'Alex Matchneer'
  alex.get('name');  // 'Alex Matchneer'

  alex.set('nomen', '@machty');
  alex.get('name');  // '@machty'
  ```

  @method alias
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @return {@ember/object/computed} computed property which creates an
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
  let User = Ember.Object.extend({
    firstName: null,
    lastName: null,
    nickName: Ember.computed.oneWay('firstName')
  });

  let teddy = User.create({
    firstName: 'Teddy',
    lastName:  'Zeenny'
  });

  teddy.get('nickName');              // 'Teddy'
  teddy.set('nickName', 'TeddyBear'); // 'TeddyBear'
  teddy.get('firstName');             // 'Teddy'
  ```

  @method oneWay
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @return {@ember/object/computed} computed property which creates a
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
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @return {@ember/object/computed} computed property which creates a
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
  let User = Ember.Object.extend({
    firstName: null,
    lastName: null,
    nickName: Ember.computed.readOnly('firstName')
  });

  let teddy = User.create({
    firstName: 'Teddy',
    lastName:  'Zeenny'
  });

  teddy.get('nickName');              // 'Teddy'
  teddy.set('nickName', 'TeddyBear'); // throws Exception
  // throw new Ember.Error('Cannot Set: nickName on: <User:ember27288>' );`
  teddy.get('firstName');             // 'Teddy'
  ```

  @method readOnly
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @return {@ember/object/computed} computed property which creates a
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

  ```javascript
  let Hamster = Ember.Object.extend({
    bananaCount: Ember.computed.deprecatingAlias('cavendishCount', {
      id: 'hamster.deprecate-banana',
      until: '3.0.0'
    })
  });

  let hamster = Hamster.create();

  hamster.set('bananaCount', 5); // Prints a deprecation warning.
  hamster.get('cavendishCount'); // 5
  ```

  @method deprecatingAlias
  @static
  @for @ember/object/computed
  @param {String} dependentKey
  @param {Object} options Options for `Ember.deprecate`.
  @return {@ember/object/computed} computed property which creates an
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
