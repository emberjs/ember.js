import { computed } from '@ember/object';
import { expectTypeOf } from 'expect-type';

expectTypeOf(computed('foo')).toEqualTypeOf<PropertyDecorator>();

class Foo {
  declare firstName: string;
  declare lastName: string;

  @computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  @(computed('firstName', 'lastName').readOnly())
  get readonlyFullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  // NOTE: This should probably not work, but types do currently allow it.
  @computed('firstName', 'lastName')
  declare badFullName: string;

  // NOTE: This works, but is not recommended.
  @computed('firstName', 'lastName', function (this: Foo) {
    return `${this.firstName} ${this.lastName}`;
  })
  declare altFullName: string;
}

new Foo();
