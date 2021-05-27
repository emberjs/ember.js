import { computed } from '@ember/object';

class Foo {
  declare firstName: string;
  declare lastName: string;

  @computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  // @ts-expect-error must decorate a method
  @computed('firstName', 'lastName')
  declare badFullName: string;
}

new Foo();
