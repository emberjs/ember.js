import { defineProperty } from '@ember/object';

const contact = {};

// ES5 compatible mode
defineProperty(contact, 'firstName', {
  writable: true,
  configurable: false,
  enumerable: true,
  value: 'Charles',
});

// define a simple property
defineProperty(contact, 'lastName', undefined, 'Jolley');
