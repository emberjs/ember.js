import { symbol } from 'ember-metal/utils';

export const OWNER = symbol('OWNER');

export function getOwner(object) {
  return object[OWNER];
}

export function setOwner(object, owner) {
  object[OWNER] = owner;
}
