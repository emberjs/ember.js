import { setOnerror } from '@ember/-internals/error-handling';
import EmberObject, { computed, defineProperty } from '@ember/object';
import { isBlank, isEmpty, isNone, isPresent, typeOf } from '@ember/utils';
import { expectTypeOf } from 'expect-type';

function testTypeOf() {
  // @ts-expect-error
  typeOf();
  const str: string = typeOf({});
}

function testIsNoneType() {
  const maybeUndefined: string | undefined = 'not actually undefined';
  if (isNone(maybeUndefined)) {
    return;
  }

  const anotherString = maybeUndefined + 'another string';
  expectTypeOf(isNone(anotherString)).toBeBoolean();
}

function testIsBlank() {
  expectTypeOf(isBlank(undefined)).toBeBoolean();
  expectTypeOf(isBlank('')).toBeBoolean();
  // @ts-expect-error
  Ember.isBlank('', '');
}

function testIsEmpty() {
  expectTypeOf(isEmpty(undefined)).toBeBoolean();
  expectTypeOf(isEmpty('')).toBeBoolean();
  // @ts-expect-error
  Ember.isEmpty('', '');
}

function testIsPresent() {
  expectTypeOf(isPresent(undefined)).toBeBoolean();
  expectTypeOf(isPresent('')).toBeBoolean();
  // @ts-expect-error
  Ember.isPresent('', '');
}

function testIsNone() {
  expectTypeOf(isNone(undefined)).toBeBoolean();
  expectTypeOf(isNone('')).toBeBoolean();
  // @ts-expect-error
  Ember.isNone('', '');
}

function testOnError() {
  setOnerror(
   (error: any) => {
    fetch('/report-error', {
      method: 'POST',
      body: JSON.stringify({
        stack: error.stack,
        otherInformation: 'whatever app state you want to provide',
      }),
    });
  }
  );
}

function testDefineProperty() {
  type Contact = { firstName?: string; lastName?: string };
  const contact: Contact = {};

  // ES5 compatible mode
  defineProperty(contact, 'firstName', {
    writable: true,
    configurable: false,
    enumerable: true,
    value: 'Charles',
  });

  // define a simple property
  defineProperty(contact, 'lastName', undefined, 'Jolley');

  // define a computed property
  defineProperty(
    contact,
    'fullName',
    computed('firstName', 'lastName', function (this: Contact) {
      return `${this.firstName} ${this.lastName}`;
    })
  );
}

// For use in IIFE below.
declare const fileList: FileList;

(() => {
  /** typeOf */
  expectTypeOf(typeOf(null)).toBeString();
  expectTypeOf(typeOf(undefined)).toBeString();
  expectTypeOf(typeOf('michael')).toBeString();
  expectTypeOf(typeOf(new String('michael'))).toBeString();
  expectTypeOf(typeOf(101)).toBeString();
  expectTypeOf(typeOf(new Number(101))).toBeString();
  expectTypeOf(typeOf(true)).toBeString();
  expectTypeOf(typeOf(new Boolean(true))).toBeString();
  expectTypeOf(typeOf(() => 4)).toBeString();

  expectTypeOf(typeOf([1, 2, 90])).toBeString();
  expectTypeOf(typeOf(/abc/)).toBeString();
  expectTypeOf(typeOf(new Date())).toBeString();
  expectTypeOf(typeOf(fileList)).toBeString();
  expectTypeOf(typeOf(EmberObject.extend())).toBeString();
  expectTypeOf(typeOf(EmberObject.create())).toBeString();
  expectTypeOf(typeOf(new Error('teamocil'))).toBeString();
  expectTypeOf(typeOf(new Date() as RegExp | Date)).toBeString();
  expectTypeOf(typeOf({ randomObject: true })).toBeString();
})();
