/**
@module ember
@submodule ember-application
*/

import { assert, deprecate } from 'ember-debug';

const VALIDATED_TYPES = {
  route:     ['assert',    'isRouteFactory',     'Ember.Route'],
  component: ['deprecate', 'isComponentFactory', 'Ember.Component'],
  view:      ['deprecate', 'isViewFactory',      'Ember.View'],
  service:   ['deprecate', 'isServiceFactory',   'Ember.Service']
};

export default function validateType(resolvedType, parsedName) {
  let validationAttributes = VALIDATED_TYPES[parsedName.type];

  if (!validationAttributes) {
    return;
  }

  let [action, factoryFlag, expectedType] = validationAttributes;

  assert(
    `Expected ${parsedName.fullName} to resolve to an ${expectedType} but ` +
    `instead it was ${resolvedType}.`,
    !!resolvedType[factoryFlag]
  );
}
