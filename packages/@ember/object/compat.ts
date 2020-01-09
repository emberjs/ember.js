import { Meta } from '@ember/-internals/meta';
import {
  Decorator,
  DecoratorPropertyDescriptor,
  isElementDescriptor,
  setClassicDecorator,
  tagForProperty,
} from '@ember/-internals/metal';
import { assert } from '@ember/debug';
import { consume, track, UpdatableTag, update } from '@glimmer/validator';

let wrapGetterSetter = function(_target: object, key: string, desc: PropertyDescriptor) {
  let { get: originalGet } = desc;

  if (originalGet !== undefined) {
    desc.get = function() {
      let propertyTag = tagForProperty(this, key) as UpdatableTag;
      let ret;

      let tag = track(() => {
        ret = originalGet!.call(this);
      });

      update(propertyTag, tag);
      consume(tag);

      return ret;
    };
  }

  return desc;
};

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
  target: object,
  key: string,
  desc: PropertyDescriptor
): PropertyDescriptor;
export function dependentKeyCompat(desc: { get?: Function; set?: Function }): Decorator;
export function dependentKeyCompat(
  target: object | { get?: Function; set?: Function },
  key?: string,
  desc?: PropertyDescriptor
) {
  if (!isElementDescriptor([target, key, desc])) {
    desc = target as PropertyDescriptor;

    let decorator = function(
      target: object,
      key: string,
      _desc: DecoratorPropertyDescriptor,
      _meta?: Meta,
      isClassicDecorator?: boolean
    ) {
      assert(
        'The @dependentKeyCompat decorator may only be passed a method when used in classic classes. You should decorate getters/setters directly in native classes',
        isClassicDecorator
      );

      assert(
        'The dependentKeyCompat() decorator must be passed a getter or setter when used in classic classes',
        desc !== null &&
          typeof desc === 'object' &&
          (typeof desc.get === 'function' || typeof desc.set === 'function')
      );

      return wrapGetterSetter(target, key, desc!);
    };

    setClassicDecorator(decorator);

    return decorator as Decorator;
  }

  assert(
    'The @dependentKeyCompat decorator must be applied to getters/setters when used in native classes',
    (desc !== null && typeof desc!.get === 'function') || typeof desc!.set === 'function'
  );

  return wrapGetterSetter(target, key!, desc!);
}

setClassicDecorator(dependentKeyCompat as Decorator);
