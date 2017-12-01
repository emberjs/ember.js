/**
@module ember
*/

import { ENV } from 'ember-environment';
import {
  on,
  computed,
  observer
} from 'ember-metal';
import { assert, deprecateFunc } from 'ember-debug';

const FunctionPrototype = Function.prototype;

if (ENV.EXTEND_PROTOTYPES.Function) {
  /**
    The `property` extension of JavaScript's Function prototype is available
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

    See [Ember.ComputedProperty](/api/classes/Ember.ComputedProperty.html), [Ember.computed](/api/classes/Ember.computed.html).

    @method property
    @for Function
    @public
  */
  FunctionPrototype.property = function () {
    return computed(...arguments, this);
  };

  /**
    The `observes` extension of JavaScript's Function prototype is available
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
  FunctionPrototype.observes = function() {
    return observer(...arguments, this);
  };


  FunctionPrototype._observesImmediately = function () {
    assert(
      'Immediate observers must observe internal properties only, ' +
      'not properties on other objects.',
      function checkIsInternalProperty() {
        for (let i = 0; i < arguments.length; i++) {
          if (arguments[i].indexOf('.') !== -1) {
            return false;
          }
        }
        return true;
      }
    );

    // observes handles property expansion
    return this.observes(...arguments);
  };
  /**
    The `observesImmediately` extension of JavaScript's Function prototype is
    available when `EmberENV.EXTEND_PROTOTYPES` or
    `EmberENV.EXTEND_PROTOTYPES.Function` is true, which is the default.

    You can observe property changes simply by adding the `observesImmediately`
    call to the end of your method declarations in classes that you write.
    For example:

    ```javascript
    import EmberObject from '@ember/object';

    EmberObject.extend({
      valueObserver: function() {
        // Executes immediately after the "value" property changes
      }.observesImmediately('value')
    });
    ```

    In the future, `observes` may become asynchronous. In this event,
    `observesImmediately` will maintain the synchronous behavior.

    See `Ember.immediateObserver`.

    @method observesImmediately
    @for Function
    @deprecated
    @private
  */
  FunctionPrototype.observesImmediately = deprecateFunc(
    'Function#observesImmediately is deprecated. Use Function#observes instead',
    { id: 'ember-runtime.ext-function', until: '3.0.0' },
    FunctionPrototype._observesImmediately
  );

  /**
    The `on` extension of JavaScript's Function prototype is available
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

    See `Ember.on`.

    @method on
    @for Function
    @public
  */
  FunctionPrototype.on = function () {
    return on(...arguments, this);
  };
}
