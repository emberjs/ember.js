/**
@module ember
@submodule ember-application
*/

import Ember from 'ember-metal/core';

let VALIDATED_TYPES = {
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

  if (action === 'deprecate') {
    Ember.deprecate(
      `In Ember 2.0 ${parsedName.type} factories must have an \`${factoryFlag}\` ` +
      `property set to true. You registered ${resolvedType} as a ${parsedName.type} ` +
      `factory. Either add the \`${factoryFlag}\` property to this factory or ` +
      `extend from ${expectedType}.`,
      resolvedType[factoryFlag]
    );
  } else {
    Ember.assert(
      `Expected ${parsedName.fullName} to resolve to an ${expectedType} but ` +
      `instead it was ${resolvedType}.`,
      function() {
        return resolvedType[factoryFlag];
      }
    );
  }
}
