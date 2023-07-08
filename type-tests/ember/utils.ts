import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

function testTypeOf() {
  // @ts-expect-error
  Ember.typeOf();
  const str: string = Ember.typeOf({});
}

function testIsNoneType() {
  const maybeUndefined: string | undefined = 'not actually undefined';
  if (Ember.isNone(maybeUndefined)) {
    return;
  }

  const anotherString = maybeUndefined + 'another string';
  expectTypeOf(Ember.isNone(anotherString)).toBeBoolean();
}

function testIsBlank() {
  expectTypeOf(Ember.isBlank(undefined)).toBeBoolean();
  expectTypeOf(Ember.isBlank('')).toBeBoolean();
  // @ts-expect-error
  Ember.isBlank('', '');
}

function testIsEmpty() {
  expectTypeOf(Ember.isEmpty(undefined)).toBeBoolean();
  expectTypeOf(Ember.isEmpty('')).toBeBoolean();
  // @ts-expect-error
  Ember.isEmpty('', '');
}

function testIsPresent() {
  expectTypeOf(Ember.isPresent(undefined)).toBeBoolean();
  expectTypeOf(Ember.isPresent('')).toBeBoolean();
  // @ts-expect-error
  Ember.isPresent('', '');
}

function testIsNone() {
  expectTypeOf(Ember.isNone(undefined)).toBeBoolean();
  expectTypeOf(Ember.isNone('')).toBeBoolean();
  // @ts-expect-error
  Ember.isNone('', '');
}

function testOnError() {
  Ember.onerror = (error) => {
    fetch('/report-error', {
      method: 'POST',
      body: JSON.stringify({
        stack: error.stack,
        otherInformation: 'whatever app state you want to provide',
      }),
    });
  };
}

function testDefineProperty() {
  type Contact = { firstName?: string; lastName?: string };
  const contact: Contact = {};

  // ES5 compatible mode
  Ember.defineProperty(contact, 'firstName', {
    writable: true,
    configurable: false,
    enumerable: true,
    value: 'Charles',
  });

  // define a simple property
  Ember.defineProperty(contact, 'lastName', undefined, 'Jolley');

  // define a computed property
  Ember.defineProperty(
    contact,
    'fullName',
    Ember.computed('firstName', 'lastName', function (this: Contact) {
      return `${this.firstName} ${this.lastName}`;
    })
  );
}

// For use in IIFE below.
declare const fileList: FileList;

(() => {
  /** typeOf */
  expectTypeOf(Ember.typeOf(null)).toBeString();
  expectTypeOf(Ember.typeOf(undefined)).toBeString();
  expectTypeOf(Ember.typeOf('michael')).toBeString();
  expectTypeOf(Ember.typeOf(new String('michael'))).toBeString();
  expectTypeOf(Ember.typeOf(101)).toBeString();
  expectTypeOf(Ember.typeOf(new Number(101))).toBeString();
  expectTypeOf(Ember.typeOf(true)).toBeString();
  expectTypeOf(Ember.typeOf(new Boolean(true))).toBeString();
  expectTypeOf(Ember.typeOf(() => 4)).toBeString();

  expectTypeOf(Ember.typeOf([1, 2, 90])).toBeString();
  expectTypeOf(Ember.typeOf(/abc/)).toBeString();
  expectTypeOf(Ember.typeOf(new Date())).toBeString();
  expectTypeOf(Ember.typeOf(fileList)).toBeString();
  expectTypeOf(Ember.typeOf(Ember.Object.extend())).toBeString();
  expectTypeOf(Ember.typeOf(Ember.Object.create())).toBeString();
  expectTypeOf(Ember.typeOf(new Error('teamocil'))).toBeString();
  expectTypeOf(Ember.typeOf(new Date() as RegExp | Date)).toBeString();
  expectTypeOf(Ember.typeOf({ randomObject: true })).toBeString();
})();
