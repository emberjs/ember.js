/**
@module ember
@submodule ember-application
*/

var get = Ember.get, set = Ember.set;
var ControllersProxy = Ember.Object.extend({
  controller: null,

  unknownProperty: function(controllerName) {
    var controller = get(this, 'controller'),
      needs = get(controller, 'needs'),
      container = controller.get('container'),
      dependency;

    for (var i=0, l=needs.length; i<l; i++) {
      dependency = needs[i];
      if (dependency === controllerName) {
        return container.lookup('controller:' + controllerName);
      }
    }
  }
});

function verifyDependencies(controller) {
  var needs = get(controller, 'needs'),
      container = get(controller, 'container'),
      dependency, satisfied = true;

  needs = needs.concat(get(controller, 'decorates'));

  for (var i=0, l=needs.length; i<l; i++) {
    dependency = needs[i];
    if (dependency.indexOf(':') === -1) {
      dependency = "controller:" + dependency;
    }

    if (!container.has(dependency)) {
      satisfied = false;
      Ember.assert(controller + " needs " + dependency + " but it does not exist", false);
    }
  }

  return satisfied;
}

function decoratorProxy(controller, container) {
  return Ember.computed(function(key) {
    var decorator = container.lookup('controller:'+key),
        content = get(controller, 'content:'+key);

    set(decorator, 'content', content);

    return decorator;
  });
}

function setupDecorators(controller) {
  var decorates = get(controller, 'decorates'),
      container = get(controller, 'container'),
      decorator;

  for (var i=0, l=decorates.length; i<l; i++) {
    Ember.defineProperty(controller,
      decorates[i], decoratorProxy(controller, container));
  }
}

Ember.ControllerMixin.reopen({
  concatenatedProperties: ['needs', 'decorates'],
  needs: [],
  decorates: [],

  init: function() {
    this._super.apply(this, arguments);

    // Structure asserts to still do verification but not string concat in production
    if(!verifyDependencies(this)) {
      Ember.assert("Missing dependencies", false);
    }

    setupDecorators(this);
  },

  controllerFor: function(controllerName) {
    Ember.deprecate("Controller#controllerFor is deprecated, please use Controller#needs instead");
    var container = get(this, 'container');
    return container.lookup('controller:' + controllerName);
  },

  controllers: Ember.computed(function() {
    return ControllersProxy.create({ controller: this });
  })
});
