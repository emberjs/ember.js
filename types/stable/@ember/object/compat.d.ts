declare module '@ember/object/compat' {
  import type { ExtendedMethodDecorator } from '@ember/-internals/metal';
  import type { ElementDescriptor } from '@ember/-internals/metal';
  /**
      `@dependentKeyCompat` is decorator that can be used on _native getters_ that
      use tracked properties. It exposes the getter to Ember's classic computed
      property and observer systems, so they can watch it for changes. It can be
      used in both native and classic classes.

      Native Example:

      ```js
      import { tracked } from '@glimmer/tracking';
      import { dependentKeyCompat } from '@ember/object/compat';
      import { computed, set } from '@ember/object';

      class Person {
        @tracked firstName;
        @tracked lastName;

        @dependentKeyCompat
        get fullName() {
          return `${this.firstName} ${this.lastName}`;
        }
      }

      class Profile {
        constructor(person) {
          set(this, 'person', person);
        }

        @computed('person.fullName')
        get helloMessage() {
          return `Hello, ${this.person.fullName}!`;
        }
      }
      ```

      Classic Example:

      ```js
      import { tracked } from '@glimmer/tracking';
      import { dependentKeyCompat } from '@ember/object/compat';
      import EmberObject, { computed, observer, set } from '@ember/object';

      const Person = EmberObject.extend({
        firstName: tracked(),
        lastName: tracked(),

        fullName: dependentKeyCompat(function() {
          return `${this.firstName} ${this.lastName}`;
        }),
      });

      const Profile = EmberObject.extend({
        person: null,

        helloMessage: computed('person.fullName', function() {
          return `Hello, ${this.person.fullName}!`;
        }),

        onNameUpdated: observer('person.fullName', function() {
          console.log('person name updated!');
        }),
      });
      ```

      `dependentKeyCompat()` can receive a getter function or an object containing
      `get`/`set` methods when used in classic classes, like computed properties.

      In general, only properties which you _expect_ to be watched by older,
      untracked clases should be marked as dependency compatible. The decorator is
      meant as an interop layer for parts of Ember's older classic APIs, and should
      not be applied to every possible getter/setter in classes. The number of
      dependency compatible getters should be _minimized_ wherever possible. New
      application code should not need to use `@dependentKeyCompat`, since it is
      only for interoperation with older code.

      @public
      @method dependentKeyCompat
      @for @ember/object/compat
      @static
      @param {PropertyDescriptor|undefined} desc A property descriptor containing
                                                 the getter and setter (when used in
                                                 classic classes)
      @return {PropertyDecorator} property decorator instance
     */
  export function dependentKeyCompat(
    target: ElementDescriptor[0],
    key: ElementDescriptor[1],
    desc: ElementDescriptor[2]
  ): PropertyDescriptor;
  export function dependentKeyCompat(desc: PropertyDescriptor): ExtendedMethodDecorator;
}
