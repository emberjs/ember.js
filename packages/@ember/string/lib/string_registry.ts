import { deprecate } from '@ember/debug';

// STATE within a module is frowned upon, this exists
// to support Ember.STRINGS but shield ember internals from this legacy global
// API.
let STRINGS: { [key: string]: string } = {};

export function setStrings(strings: { [key: string]: string }) {
  deprecateEmberStrings();
  STRINGS = strings;
}

export function getStrings(): { [key: string]: string } {
  deprecateEmberStrings();
  return STRINGS;
}

function deprecateEmberStrings() {
  deprecate('Ember.STRINGS is deprecated. It is no longer used by Ember.', false, {
    id: 'ember-strings',
    for: 'ember-source',
    since: {
      available: '4.10',
      enabled: '4.10.',
    },
    until: '5.0.0',
  });
}
