import EmberObject, { action, computed } from '@ember/object';
import { dependentKeyCompat } from '@ember/object/compat';
import { alias, bool, readOnly, sort } from '@ember/object/computed';
import { expectTypeOf } from 'expect-type';

class Person extends EmberObject {
  firstName = 'Kris';
  lastName = 'Selden';
  friends: string[] = [];

  @computed
  get bareComputed() {
    return 'bare';
  }

  @computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  set fullName(value: string) {
    [this.firstName = '', this.lastName = ''] = value.split(' ');
  }

  @(computed('fullName').readOnly())
  get readOnlyFullName() {
    return this.fullName;
  }

  @computed('firstName', function (this: Person) {
    return this.firstName.toUpperCase();
  })
  shouting!: string;

  @alias('firstName') aliased!: string;
  @bool('friends.length') hasFriends!: boolean;
  @readOnly('lastName') surname!: string;
  @sort('friends', (a: string, b: string) => a.localeCompare(b)) sortedFriends!: string[];

  @dependentKeyCompat
  get initials() {
    return `${this.firstName[0]}${this.lastName[0]}`;
  }

  @action
  greet(greeting: string) {
    return `${greeting}, ${this.fullName}`;
  }
}

let person = Person.create();
expectTypeOf(person.fullName).toEqualTypeOf<string>();
expectTypeOf(person.hasFriends).toEqualTypeOf<boolean>();
expectTypeOf(person.greet).toEqualTypeOf<(greeting: string) => string>();

class Invalid {
  // @ts-expect-error -- @action is only valid on methods
  @action field = 1;

  // @ts-expect-error -- @dependentKeyCompat is only valid on getters
  @dependentKeyCompat method() {}

  // @ts-expect-error -- macros require a dependent key
  @bool() missingKey!: boolean;
}
new Invalid();
