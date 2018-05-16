// STATE within a module is frowned upon, this exists
// to support Ember.STRINGS but shield ember internals from this legacy global
// API.
let STRINGS: { [key: string]: string } = {};

export function setStrings(strings: { [key: string]: string }) {
  STRINGS = strings;
}

export function getStrings(): { [key: string]: string } {
  return STRINGS;
}

export function getString(name: string): string | undefined {
  return STRINGS[name];
}
