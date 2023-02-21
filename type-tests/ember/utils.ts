import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

function testTypeOf() {
  expectTypeOf(Ember.typeOf()).toEqualTypeOf<'undefined'>();
  const str: string = Ember.typeOf({});
}

function testIsNoneType() {
  const maybeUndefined: string | undefined = 'not actually undefined';
  if (Ember.isNone(maybeUndefined)) {
    return;
  }

  const anotherString = maybeUndefined + 'another string';
  expectTypeOf(Ember.isNone()).toBeBoolean();
}

function testIsBlank() {
  expectTypeOf(Ember.isBlank()).toBeBoolean();
  expectTypeOf(Ember.isBlank('')).toBeBoolean();
  // @ts-expect-error
  Ember.isBlank('', '');
}

function testIsEmpty() {
  expectTypeOf(Ember.isEmpty()).toBeBoolean();
  expectTypeOf(Ember.isEmpty('')).toBeBoolean();
  // @ts-expect-error
  Ember.isEmpty('', '');
}

function testIsPresent() {
  expectTypeOf(Ember.isPresent()).toBeBoolean();
  expectTypeOf(Ember.isPresent('')).toBeBoolean();
  // @ts-expect-error
  Ember.isPresent('', '');
}

function testIsNone() {
  expectTypeOf(Ember.isNone()).toBeBoolean();
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
  expectTypeOf(Ember.typeOf()).toEqualTypeOf<'undefined'>();
  expectTypeOf(Ember.typeOf(null)).toEqualTypeOf<'null'>();
  expectTypeOf(Ember.typeOf(undefined)).toEqualTypeOf<'undefined'>();
  expectTypeOf(Ember.typeOf('michael')).toEqualTypeOf<'string'>();
  expectTypeOf(Ember.typeOf(new String('michael'))).toEqualTypeOf<'string'>();
  expectTypeOf(Ember.typeOf(101)).toEqualTypeOf<'number'>();
  expectTypeOf(Ember.typeOf(new Number(101))).toEqualTypeOf<'number'>();
  expectTypeOf(Ember.typeOf(true)).toEqualTypeOf<'boolean'>();
  expectTypeOf(Ember.typeOf(new Boolean(true))).toEqualTypeOf<'boolean'>();
  expectTypeOf(Ember.typeOf(() => 4)).toEqualTypeOf<'function'>();
  // @ts-ignore -- this *should* work but the namespace version is not carrying
  // it through correctly. However, people can *and should* simply use the
  // module import instead!
  expectTypeOf(Ember.typeOf([1, 2, 90])).toEqualTypeOf<'array'>();
  expectTypeOf(Ember.typeOf(/abc/)).toEqualTypeOf<'regexp'>();
  expectTypeOf(Ember.typeOf(new Date())).toEqualTypeOf<'date'>();
  expectTypeOf(Ember.typeOf(fileList)).toEqualTypeOf<'filelist'>();
  expectTypeOf(Ember.typeOf(Ember.Object.extend())).toEqualTypeOf<'class'>();
  // @ts-ignore -- this *should* work but the namespace version is not carrying
  // it through correctly. However, people can *and should* simply use the
  // module import instead!
  expectTypeOf(Ember.typeOf(Ember.Object.create())).toEqualTypeOf<'instance'>();
  expectTypeOf(Ember.typeOf(new Error('teamocil'))).toEqualTypeOf<'error'>();
  expectTypeOf(Ember.typeOf(new Date() as RegExp | Date)).toEqualTypeOf<'regexp' | 'date'>();
  expectTypeOf(Ember.typeOf({ randomObject: true })).toEqualTypeOf<'object'>();
})();
