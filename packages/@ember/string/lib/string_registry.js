// STATE within a module is frowned upon, this exists
// to support Ember.STRINGS but shield ember internals from this legacy global
// API.
let STRINGS = {};

export function setStrings(strings) {
  STRINGS = strings;
}

export function getStrings() {
  return STRINGS;
}

export function getString(name) {
  return STRINGS[name];
}
