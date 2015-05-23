/**
@module ember
@submodule ember-application
*/

let VALIDATED_TYPES = {
  route:     ['isRouteFactory',     'Ember.Route'],
  component: ['isComponentFactory', 'Ember.Component'],
  view:      ['isViewFactory',      'Ember.View'],
  service:   ['isServiceFactory',   'Ember.Service']
};

export default function validateType(resolvedType, parsedName) {
  let validationAttributes = VALIDATED_TYPES[parsedName.type];

  if (!validationAttributes) {
    return;
  }

  let [factoryFlag, expectedType] = validationAttributes;

  Ember.assert(`Expected ${parsedName.fullName} to resolve to an ${expectedType} but instead it was ${resolvedType}.`, function() {
    return resolvedType[factoryFlag];
  });
}
