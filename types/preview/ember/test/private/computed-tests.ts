import Ember from 'ember';

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

class Example2 extends Example1 {
  foo() {
    this.fullName; // $ExpectType ComputedProperty<string, string>
    this.allNames; // $ExpectType ComputedProperty<string[], string[]>
    this.firstName; // $ExpectType string
    this.lastName; // $ExpectType string

    this.get('fullName').split(','); // $ExpectType string[]
    this.get('allNames')[0]; // $ExpectType string
    this.get('firstName').split(','); // $ExpectType string[]
    this.get('lastName').split(','); // $ExpectType string[]
  }
}
