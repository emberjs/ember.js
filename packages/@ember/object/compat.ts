import { Meta } from '@ember/-internals/meta';
import {
  ExtendedMethodDecorator,
  DecoratorPropertyDescriptor,
  descriptorForProperty,
  isElementDescriptor,
  setClassicDecorator,
} from '@ember/-internals/metal';
import type { ElementDescriptor } from '@ember/-internals/metal/lib/decorator';
import { assert } from '@ember/debug';
import { consumeTag, tagFor, track, UpdatableTag, updateTag } from '@glimmer/validator';

let wrapGetterSetter = function (target: object, key: string, desc: PropertyDescriptor) {
  let { get: originalGet } = desc;

  assert(
    'You attempted to use @dependentKeyCompat on a property that already has been decorated with either @computed or @tracked. @dependentKeyCompat is only necessary for native getters that are not decorated with @computed.',
    descriptorForProperty(target, key) === undefined
  );

  if (originalGet !== undefined) {
    desc.get = function () {
      let propertyTag = tagFor(this, key) as UpdatableTag;
      let ret;

      let tag = track(() => {
        ret = originalGet!.call(this);
      });

      updateTag(propertyTag, tag);
      consumeTag(tag);

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
  target: ElementDescriptor[0],
  key: ElementDescriptor[1],
  desc: ElementDescriptor[2]
): PropertyDescriptor;
export function dependentKeyCompat(desc: PropertyDescriptor): ExtendedMethodDecorator;
export function dependentKeyCompat(
  ...args: ElementDescriptor | [PropertyDescriptor]
): PropertyDescriptor | ExtendedMethodDecorator {
  if (isElementDescriptor(args)) {
    let [target, key, desc] = args;

    assert(
      'The @dependentKeyCompat decorator must be applied to getters/setters when used in native classes',
      desc != null && (typeof desc.get === 'function' || typeof desc.set === 'function')
    );

    return wrapGetterSetter(target, key, desc);
  } else {
    const desc = args[0];

    assert(
      'expected valid PropertyDescriptor',
      ((value: unknown): value is PropertyDescriptor => {
        if (value && typeof value === 'object') {
          let cast = value as PropertyDescriptor;
          return (
            (cast.configurable === undefined ||
              cast.configurable === false ||
              cast.configurable === true) &&
            (cast.enumerable === undefined ||
              cast.enumerable === false ||
              cast.enumerable === true) &&
            (cast.writable === undefined || cast.writable === false || cast.writable === true) &&
            (cast.get === undefined || typeof cast.get === 'function') &&
            (cast.set === undefined || typeof cast.set === 'function')
          );
        }

        return false;
      })(desc)
    );

    let decorator: ExtendedMethodDecorator = function (
      target: object,
      key: string,
      _desc?: DecoratorPropertyDescriptor,
      _meta?: Meta,
      isClassicDecorator?: boolean
    ) {
      assert(
        'The @dependentKeyCompat decorator may only be passed a method when used in classic classes. You should decorate getters/setters directly in native classes',
        isClassicDecorator
      );

      assert(
        'The dependentKeyCompat() decorator must be passed a getter or setter when used in classic classes',
        typeof desc.get === 'function' || typeof desc.set === 'function'
      );

      return wrapGetterSetter(target, key, desc);
    };

    setClassicDecorator(decorator);

    return decorator;
  }
}

setClassicDecorator(dependentKeyCompat);
