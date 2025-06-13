import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

class Example1 extends Ember.Object {
  firstName = '';
  lastName = '';

  @Ember.computed('fullName')
  get allNames() {
    return [this.fullName];
  }

  @Ember.computed('firstName', 'lastName')
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}
