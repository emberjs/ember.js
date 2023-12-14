declare module '@ember/object/lib/computed/computed_macros' {
  import type { DeprecationOptions } from '@ember/debug';
  /**
      A computed property macro that returns true if the value of the dependent
      property is null, an empty string, empty array, or empty function.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { empty } from '@ember/object/computed';

      class ToDoList {
        constructor(todos) {
          set(this, 'todos', todos);
        }

        @empty('todos') isDone;
      }

      let todoList = new ToDoList(
        ['Unit Test', 'Documentation', 'Release']
      );

      todoList.isDone; // false
      set(todoList, 'todos', []);
      todoList.isDone; // true
      ```

      @since 1.6.0
      @method empty
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @return {ComputedProperty} computed property which returns true if the value
      of the dependent property is null, an empty string, empty array, or empty
      function and false if the underlying value is not empty.

      @public
    */
  export function empty(dependentKey: string): import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property that returns true if the value of the dependent property
      is NOT null, an empty string, empty array, or empty function.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { notEmpty } from '@ember/object/computed';

      class Hamster {
        constructor(backpack) {
          set(this, 'backpack', backpack);
        }

        @notEmpty('backpack') hasStuff
      }

      let hamster = new Hamster(
        ['Food', 'Sleeping Bag', 'Tent']
      );

      hamster.hasStuff; // true
      set(hamster, 'backpack', []);
      hamster.hasStuff; // false
      ```

      @method notEmpty
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @return {ComputedProperty} computed property which returns true if original
      value for property is not empty.
      @public
    */
  export function notEmpty(
    dependentKey: string
  ): import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property that returns true if the value of the dependent property
      is null or undefined. This avoids errors from JSLint complaining about use of
      ==, which can be technically confusing.

      ```javascript
      import { set } from '@ember/object';
      import { none } from '@ember/object/computed';

      class Hamster {
        @none('food') isHungry;
      }

      let hamster = new Hamster();

      hamster.isHungry; // true

      set(hamster, 'food', 'Banana');
      hamster.isHungry; // false

      set(hamster, 'food', null);
      hamster.isHungry; // true
      ```

      @method none
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @return {ComputedProperty} computed property which returns true if original
      value for property is null or undefined.
      @public
    */
  export function none(dependentKey: string): import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property that returns the inverse boolean value of the original
      value for the dependent property.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { not } from '@ember/object/computed';

      class User {
        loggedIn = false;

        @not('loggedIn') isAnonymous;
      }

      let user = new User();

      user.isAnonymous; // true
      set(user, 'loggedIn', true);
      user.isAnonymous; // false
      ```

      @method not
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @return {ComputedProperty} computed property which returns inverse of the
      original value for property
      @public
    */
  export function not(dependentKey: string): import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property that converts the provided dependent property into a
      boolean value.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { bool } from '@ember/object/computed';


      class Hamster {
        @bool('numBananas') hasBananas
      }

      let hamster = new Hamster();

      hamster.hasBananas; // false

      set(hamster, 'numBananas', 0);
      hamster.hasBananas; // false

      set(hamster, 'numBananas', 1);
      hamster.hasBananas; // true

      set(hamster, 'numBananas', null);
      hamster.hasBananas; // false
      ```

      @method bool
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @return {ComputedProperty} computed property which converts to boolean the
      original value for property
      @public
    */
  export function bool(dependentKey: string): import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property which matches the original value for the dependent
      property against a given RegExp, returning `true` if the value matches the
      RegExp and `false` if it does not.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { match } from '@ember/object/computed';

      class User {
        @match('email', /^.+@.+\..+$/) hasValidEmail;
      }

      let user = new User();

      user.hasValidEmail; // false

      set(user, 'email', '');
      user.hasValidEmail; // false

      set(user, 'email', 'ember_hamster@example.com');
      user.hasValidEmail; // true
      ```

      @method match
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @param {RegExp} regexp
      @return {ComputedProperty} computed property which match the original value
      for property against a given RegExp
      @public
    */
  export function match(
    dependentKey: string,
    regexp: RegExp
  ): import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property that returns true if the provided dependent property is
      equal to the given value.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { equal } from '@ember/object/computed';

      class Hamster {
        @equal('percentCarrotsEaten', 100) satisfied;
      }

      let hamster = new Hamster();

      hamster.satisfied; // false

      set(hamster, 'percentCarrotsEaten', 100);
      hamster.satisfied; // true

      set(hamster, 'percentCarrotsEaten', 50);
      hamster.satisfied; // false
      ```

      @method equal
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @param {String|Number|Object} value
      @return {ComputedProperty} computed property which returns true if the
      original value for property is equal to the given value.
      @public
    */
  export function equal(
    dependentKey: string,
    value: unknown
  ): import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property that returns true if the provided dependent property is
      greater than the provided value.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { gt } from '@ember/object/computed';

      class Hamster {
        @gt('numBananas', 10) hasTooManyBananas;
      }

      let hamster = new Hamster();

      hamster.hasTooManyBananas; // false

      set(hamster, 'numBananas', 3);
      hamster.hasTooManyBananas; // false

      set(hamster, 'numBananas', 11);
      hamster.hasTooManyBananas; // true
      ```

      @method gt
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @param {Number} value
      @return {ComputedProperty} computed property which returns true if the
      original value for property is greater than given value.
      @public
    */
  export function gt(
    dependentKey: string,
    value: number
  ): import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property that returns true if the provided dependent property is
      greater than or equal to the provided value.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { gte } from '@ember/object/computed';

      class Hamster {
        @gte('numBananas', 10) hasTooManyBananas;
      }

      let hamster = new Hamster();

      hamster.hasTooManyBananas; // false

      set(hamster, 'numBananas', 3);
      hamster.hasTooManyBananas; // false

      set(hamster, 'numBananas', 10);
      hamster.hasTooManyBananas; // true
      ```

      @method gte
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @param {Number} value
      @return {ComputedProperty} computed property which returns true if the
      original value for property is greater or equal then given value.
      @public
    */
  export function gte(
    dependentKey: string,
    value: number
  ): import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property that returns true if the provided dependent property is
      less than the provided value.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { lt } from '@ember/object/computed';

      class Hamster {
        @lt('numBananas', 3) needsMoreBananas;
      }

      let hamster = new Hamster();

      hamster.needsMoreBananas; // true

      set(hamster, 'numBananas', 3);
      hamster.needsMoreBananas; // false

      set(hamster, 'numBananas', 2);
      hamster.needsMoreBananas; // true
      ```

      @method lt
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @param {Number} value
      @return {ComputedProperty} computed property which returns true if the
      original value for property is less then given value.
      @public
    */
  export function lt(
    dependentKey: string,
    value: number
  ): import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property that returns true if the provided dependent property is
      less than or equal to the provided value.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { lte } from '@ember/object/computed';

      class Hamster {
        @lte('numBananas', 3) needsMoreBananas;
      }

      let hamster = new Hamster();

      hamster.needsMoreBananas; // true

      set(hamster, 'numBananas', 5);
      hamster.needsMoreBananas; // false

      set(hamster, 'numBananas', 3);
      hamster.needsMoreBananas; // true
      ```

      @method lte
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @param {Number} value
      @return {ComputedProperty} computed property which returns true if the
      original value for property is less or equal than given value.
      @public
    */
  export function lte(
    dependentKey: string,
    value: number
  ): import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property that performs a logical `and` on the original values for
      the provided dependent properties.

      You may pass in more than two properties and even use property brace
      expansion.  The computed property will return the first falsy value or last
      truthy value just like JavaScript's `&&` operator.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { and } from '@ember/object/computed';

      class Hamster {
        @and('hasTent', 'hasBackpack') readyForCamp;
        @and('hasWalkingStick', 'hasBackpack') readyForHike;
      }

      let tomster = new Hamster();

      tomster.readyForCamp; // false

      set(tomster, 'hasTent', true);
      tomster.readyForCamp; // false

      set(tomster, 'hasBackpack', true);
      tomster.readyForCamp; // true

      set(tomster, 'hasBackpack', 'Yes');
      tomster.readyForCamp; // 'Yes'

      set(tomster, 'hasWalkingStick', null);
      tomster.readyForHike; // null
      ```

      @method and
      @static
      @for @ember/object/computed
      @param {String} dependentKey*
      @return {ComputedProperty} computed property which performs a logical `and` on
      the values of all the original values for properties.
      @public
    */
  export const and: (
    dependentKey: string,
    ...additionalDependentKeys: string[]
  ) => import('@ember/-internals/metal').ComputedDecorator;
  /**
      A computed property which performs a logical `or` on the original values for
      the provided dependent properties.

      You may pass in more than two properties and even use property brace
      expansion.  The computed property will return the first truthy value or last
      falsy value just like JavaScript's `||` operator.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { or } from '@ember/object/computed';

      class Hamster {
        @or('hasJacket', 'hasUmbrella') readyForRain;
        @or('hasSunscreen', 'hasUmbrella') readyForBeach;
      }

      let tomster = new Hamster();

      tomster.readyForRain; // undefined

      set(tomster, 'hasUmbrella', true);
      tomster.readyForRain; // true

      set(tomster, 'hasJacket', 'Yes');
      tomster.readyForRain; // 'Yes'

      set(tomster, 'hasSunscreen', 'Check');
      tomster.readyForBeach; // 'Check'
      ```

      @method or
      @static
      @for @ember/object/computed
      @param {String} dependentKey*
      @return {ComputedProperty} computed property which performs a logical `or` on
      the values of all the original values for properties.
      @public
    */
  export const or: (
    dependentKey: string,
    ...additionalDependentKeys: string[]
  ) => import('@ember/-internals/metal').ComputedDecorator;
  /**
      Creates a new property that is an alias for another property on an object.
      Calls to `get` or `set` this property behave as though they were called on the
      original property.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { alias } from '@ember/object/computed';

      class Person {
        name = 'Alex Matchneer';

        @alias('name') nomen;
      }

      let alex = new Person();

      alex.nomen; // 'Alex Matchneer'
      alex.name;  // 'Alex Matchneer'

      set(alex, 'nomen', '@machty');
      alex.name;  // '@machty'
      ```

      @method alias
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @return {ComputedProperty} computed property which creates an alias to the
      original value for property.
      @public
    */
  /**
      Where the `alias` computed macro aliases `get` and `set`, and allows for
      bidirectional data flow, the `oneWay` computed macro only provides an aliased
      `get`. The `set` will not mutate the upstream property, rather causes the
      current property to become the value set. This causes the downstream property
      to permanently diverge from the upstream property.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { oneWay }from '@ember/object/computed';

      class User {
        constructor(firstName, lastName) {
          set(this, 'firstName', firstName);
          set(this, 'lastName', lastName);
        }

        @oneWay('firstName') nickName;
      }

      let teddy = new User('Teddy', 'Zeenny');

      teddy.nickName; // 'Teddy'

      set(teddy, 'nickName', 'TeddyBear');
      teddy.firstName; // 'Teddy'
      teddy.nickName; // 'TeddyBear'
      ```

      @method oneWay
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @return {ComputedProperty} computed property which creates a one way computed
      property to the original value for property.
      @public
    */
  export function oneWay(dependentKey: string): PropertyDecorator;
  /**
      This is a more semantically meaningful alias of the `oneWay` computed macro,
      whose name is somewhat ambiguous as to which direction the data flows.

      @method reads
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @return {ComputedProperty} computed property which creates a one way computed
        property to the original value for property.
      @public
     */
  /**
      Where `oneWay` computed macro provides oneWay bindings, the `readOnly`
      computed macro provides a readOnly one way binding. Very often when using
      the `oneWay` macro one does not also want changes to propagate back up, as
      they will replace the value.

      This prevents the reverse flow, and also throws an exception when it occurs.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { readOnly } from '@ember/object/computed';

      class User {
        constructor(firstName, lastName) {
          set(this, 'firstName', firstName);
          set(this, 'lastName', lastName);
        }

        @readOnly('firstName') nickName;
      });

      let teddy = new User('Teddy', 'Zeenny');

      teddy.nickName; // 'Teddy'

      set(teddy, 'nickName', 'TeddyBear'); // throws Exception
      // throw new EmberError('Cannot Set: nickName on: <User:ember27288>' );`

      teddy.firstName; // 'Teddy'
      ```

      @method readOnly
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @return {ComputedProperty} computed property which creates a one way computed
      property to the original value for property.
      @since 1.5.0
      @public
    */
  export function readOnly(dependentKey: string): PropertyDecorator;
  /**
      Creates a new property that is an alias for another property on an object.
      Calls to `get` or `set` this property behave as though they were called on the
      original property, but also print a deprecation warning.

      Example:

      ```javascript
      import { set } from '@ember/object';
      import { deprecatingAlias } from '@ember/object/computed';

      class Hamster {
        @deprecatingAlias('cavendishCount', {
          id: 'hamster.deprecate-banana',
          until: '3.0.0'
        })
        bananaCount;
      }

      let hamster = new Hamster();

      set(hamster, 'bananaCount', 5); // Prints a deprecation warning.
      hamster.cavendishCount; // 5
      ```

      @method deprecatingAlias
      @static
      @for @ember/object/computed
      @param {String} dependentKey
      @param {Object} options Options for `deprecate`.
      @return {ComputedProperty} computed property which creates an alias with a
      deprecation to the original value for property.
      @since 1.7.0
      @public
    */
  export function deprecatingAlias(
    dependentKey: string,
    options: DeprecationOptions
  ): import('@ember/-internals/metal').ComputedDecorator;
}
