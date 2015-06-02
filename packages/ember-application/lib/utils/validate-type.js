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

  // 2.0TODO: Remove this deprecation warning
  if (parsedName.type === 'service') {
    Ember.deprecate(
      "In Ember 2.0 service factories must have an `isServiceFactory` " +
      `property set to true. You registered ${resolvedType} as a service ` +
      "factory. Either add the `isServiceFactory` property to this factory or " +
      "extend from Ember.Service.",
      resolvedType.isServiceFactory
    );
    return;
  }

  let [factoryFlag, expectedType] = validationAttributes;

  Ember.assert(`Expected ${parsedName.fullName} to resolve to an ${expectedType} but instead it was ${resolvedType}.`, function() {
    return resolvedType[factoryFlag];
  });
}
