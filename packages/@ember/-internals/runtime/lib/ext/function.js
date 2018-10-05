/**
@module ember
*/

import { ENV } from '@ember/-internals/environment';
import { on, computed, observer } from '@ember/-internals/metal';

if (ENV.EXTEND_PROTOTYPES.Function) {
  Object.defineProperties(Function.prototype, {
    /**
      The `property` extension of Javascript's Function prototype is available
      when `EmberENV.EXTEND_PROTOTYPES` or `EmberENV.EXTEND_PROTOTYPES.Function` is
      `true`, which is the default.

      Computed properties allow you to treat a function like a property:

      ```app/utils/president.js
      import EmberObject from '@ember/object';

      export default EmberObject.extend({
        firstName: '',
        lastName:  '',

        fullName: function() {
          return this.get('firstName') + ' ' + this.get('lastName');
        }.property() // Call this flag to mark the function as a property
      });
      ```

      ```javascript
      let president = President.create({
        firstName: 'Barack',
        lastName: 'Obama'
      });

      president.get('fullName'); // 'Barack Obama'
      ```

      Treating a function like a property is useful because they can work with
      bindings, just like any other property.

      Many computed properties have dependencies on other properties. For
      example, in the above example, the `fullName` property depends on
      `firstName` and `lastName` to determine its value. You can tell Ember
      about these dependencies like this:

      ```app/utils/president.js
      import EmberObject from '@ember/object';

      export default EmberObject.extend({
        firstName: '',
        lastName:  '',

        fullName: function() {
          return this.get('firstName') + ' ' + this.get('lastName');

          // Tell Ember.js that this computed property depends on firstName
          // and lastName
        }.property('firstName', 'lastName')
      });
      ```

      Make sure you list these dependencies so Ember knows when to update
      bindings that connect to a computed property. Changing a dependency
      will not immediately trigger an update of the computed property, but
      will instead clear the cache so that it is updated when the next `get`
      is called on the property.

      See [ComputedProperty](/api/ember/release/classes/ComputedProperty), [@ember/object/computed](/api/ember/release/classes/@ember%2Fobject%2Fcomputed).

      @method property
      @for Function
      @public
    */
    property: {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function() {
        return computed(...arguments, this);
      },
    },

    /**
      The `observes` extension of Javascript's Function prototype is available
      when `EmberENV.EXTEND_PROTOTYPES` or `EmberENV.EXTEND_PROTOTYPES.Function` is
      true, which is the default.

      You can observe property changes simply by adding the `observes`
      call to the end of your method declarations in classes that you write.
      For example:

      ```javascript
      import EmberObject from '@ember/object';

      EmberObject.extend({
        valueObserver: function() {
          // Executes whenever the "value" property changes
        }.observes('value')
      });
      ```

      In the future this method may become asynchronous.

      See `observer`.

      @method observes
      @for Function
      @public
    */
    observes: {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function() {
        return observer(...arguments, this);
      },
    },

    /**
      The `on` extension of Javascript's Function prototype is available
      when `EmberENV.EXTEND_PROTOTYPES` or `EmberENV.EXTEND_PROTOTYPES.Function` is
      true, which is the default.

      You can listen for events simply by adding the `on` call to the end of
      your method declarations in classes or mixins that you write. For example:

      ```javascript
      import Mixin from '@ember/mixin';

      Mixin.create({
        doSomethingWithElement: function() {
          // Executes whenever the "didInsertElement" event fires
        }.on('didInsertElement')
      });
      ```

      See `@ember/object/evented/on`.

      @method on
      @for Function
      @public
    */

    on: {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function() {
        return on(...arguments, this);
      },
    },
  });
}
