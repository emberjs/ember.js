import { assert } from 'ember-debug';
import { assign } from 'ember-utils';

// because we're not yet compatible with latest Glimmer
// we lack typings in Ember.js.
// steal capabilities interface from http://bit.ly/2gMdhv5 for now
export interface ComponentCapabilities {
  dynamicLayout: boolean;
  dynamicTag: boolean;
  prepareArgs: boolean;
  createArgs: boolean;
  attributeHook: boolean;
  elementHook: boolean;
}

// default capabilities values stolen from http://bit.ly/2y9gCvc
export const DEFAULT_CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: true,
  elementHook: true
};

const SPECIFIER_HASH = {
  '2.16': DEFAULT_CAPABILITIES
};

function getCapabilities(specifier: string): ComponentCapabilities {
  assert(`No capabilities mask is defined for "${specifier}" specifier`, SPECIFIER_HASH[specifier] !== undefined);

  return DEFAULT_CAPABILITIES;
}

export default function capabilities(specifier: string, features: Object): ComponentCapabilities {
  assert('You must pass a specifier, e.g. `2.16`', specifier !== undefined);

  return assign({}, getCapabilities(specifier), features);
}
