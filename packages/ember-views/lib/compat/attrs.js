import {symbol } from 'ember-metal';

export let MUTABLE_CELL = symbol('MUTABLE_CELL');

function isCell(val) {
  return val && val[MUTABLE_CELL];
}

export function getAttrFor(attrs, key) {
  let val = attrs[key];
  return isCell(val) ? val.value : val;
}
