import EmberObject, { computed } from '@ember/object';
import { expectTypeOf } from 'expect-type';

class Example1 extends EmberObject {
  firstName = '';
  lastName = '';

  @computed('fullName')
  get allNames() {
    return [this.fullName];
  }

  @computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

class Example2 extends Example1 {
  foo() {
    expectTypeOf(this.get('fullName').split(',')).toEqualTypeOf<string[]>();
    expectTypeOf(this.get('allNames')[0]).toEqualTypeOf<string | undefined>();
    expectTypeOf(this.get('firstName').split(',')).toEqualTypeOf<string[]>();
    expectTypeOf(this.get('lastName').split(',')).toEqualTypeOf<string[]>();
  }
}
