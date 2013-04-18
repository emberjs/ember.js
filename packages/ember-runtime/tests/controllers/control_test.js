var container,
  TargetController,
  AbstractControlView,
  CarController,
  CarView,
  DefaultView,
  lamborghini;

function destroyControl(controller) {
  controller.get('view').destroy();
  controller.destroy();
}

module("Ember.control", {
  setup: function() {
    container = new Ember.Container();
    container.options('template', {instantiate: false});
    container.options('view', {singleton: false});
    TargetController = Ember.Controller.extend();
    container.register('controller:target', TargetController);
    DefaultView = Ember.View.extend();
    container.register('view:default', DefaultView);
    CarController = Ember.ObjectController.extend();
    container.register('controller:car', CarController);
    AbstractControlView = Ember.View.extend({
      init: function() {
        this._super();
        this.appendTo('#qunit-fixtures');
      }
    });
    CarView = AbstractControlView.extend({
      template: Ember.Handlebars.compile('{{name}} ({{#if isFast}}fast{{else}}slow{{/if}})')
    });
    container.register('view:car', CarView);
    lamborghini = Ember.Object.create({
      name: 'Lamborghini',
      isFast: true
    });
  },
  teardown: function() {
    Ember.run(function() {
      lamborghini.destroy();
      container.destroy();
    });
  }

});

test("With model", function() {
  var controller;
  var targetController = container.lookup('controller:target');

  Ember.run(function() {
    controller = Ember.control(targetController, 'car', lamborghini, {
      isCheap: false
    });
  });

  ok(controller instanceof CarController, "Correct controller instance was returned");
  equal(controller.get('target'), targetController, "Property `target` was set on controller");
  equal(controller.get('model'), lamborghini, "Property `model` was set on controller");
  equal(controller.get('isCheap'), false, "Custom property was set on controller");
  var view = controller.get('view');
  ok(view instanceof CarView, "Correct view class was instantiated");
  equal(view.get('controller'), controller, "Property `controller` was set on view");

  equal(view.$().text(), 'Lamborghini (fast)', "View rendered correct content");

  Ember.run(function() {
    targetController.destroy();
    destroyControl(controller);
  });
});

test("Without model", function() {
  var controller1,
    controller2;
  CarController = Ember.Controller.extend(); //This test needs the CarController not to be an ObjectController
  container.register('controller:car', CarController);
  var targetController = container.lookup('controller:target');

  Ember.run(function() {
    controller1 = Ember.control(targetController, 'car', null, {
      name: 'Ford T',
      isFast: false
    });
  });

  ok(controller1 instanceof CarController, "Correct controller instance was returned");
  equal(controller1.get('target'), targetController, "Property `target` was set on controller");
  equal(controller1.get('model'), null, "Property `model` was set to null on controller");
  equal(controller1.get('name'), 'Ford T', "Custom property was set on controller");
  equal(controller1.get('isFast'), false, "Custom property was set on controller");
  var view1 = controller1.get('view');
  ok(view1 instanceof CarView, "Correct view class was instantiated");
  equal(view1.get('controller'), controller1, "Controller property was set on view");

  equal(view1.$().text(), 'Ford T (slow)', "View rendered correct content");

  Ember.run(function() {
    controller2 = Ember.control(targetController, 'car', null, {
      name: 'Ford T',
      isFast: false
    });
  });

  notEqual(controller1, controller2, "Two non-identical controller instances was created");
  notEqual(controller2.get('view'), view1, "Two non-identical view instances was created");

  Ember.run(function() {
    targetController.destroy();
    destroyControl(controller1);
    destroyControl(controller2);
  });
});

test("Unknown controller raises an error", function() {
  var controller;
  var JokerView = AbstractControlView.extend();
  container.register('view:joker', JokerView);
  var targetController = container.lookup('controller:target');

  throws(function() {
    Ember.run(function() {
      controller = Ember.control(targetController, 'joker');
    });
  }, /No controller for `joker` found/);
});

test("Unknown view should use default view and a named template", function() {
  var controller;
  var JokerController = Ember.Controller.extend();
  container.register('controller:joker', JokerController);
  container.register('template:joker', Ember.Handlebars.compile('What is an Eskimo cow called? An eskimoo'));
  var targetController = container.lookup('controller:target');

  Ember.run(function() {
    controller = Ember.control(targetController, 'joker');
  });

  var view = controller.get('view');
  ok(view instanceof DefaultView, "View was created");
  equal(view.get('controller'), controller, "Controller property was set on view");

  Ember.run(function() {
    view.appendTo('#qunit-fixtures');
  });
  
  equal(view.$().text(), 'What is an Eskimo cow called? An eskimoo');

  Ember.run(function() {
    targetController.destroy();
    destroyControl(controller);
  });
});

test("Unknown view and template raises an error", function() {
  var controller;
  var JokerController = Ember.Controller.extend();
  container.register('controller:joker', JokerController);
  var targetController = container.lookup('controller:target');

  throws(function() {
    Ember.run(function() {
      controller = Ember.control(targetController, 'joker');
    });
  }, /No view or template found for `joker`/);

  Ember.run(function() {
    targetController.destroy();
  });
});

test("Known view with a defined template should not use named template", function() {
  var controller;
  var JokerController = Ember.Controller.extend();
  container.register('controller:joker', JokerController);
  var JokerView = AbstractControlView.extend({
    template: Ember.Handlebars.compile('Which bees produce milk? Boo-bees.')
  });
  container.register('view:joker', JokerView);
  container.register('template:joker', Ember.Handlebars.compile('What is an Eskimo cow called? An eskimoo'));
  var targetController = container.lookup('controller:target');

  Ember.run(function() {
    controller = Ember.control(targetController, 'joker');
  });

  var view = controller.get('view');
  ok(view instanceof JokerView, "View was created");
  equal(view.get('controller'), controller, "Controller property was set on view");

  equal(view.$().text(), 'Which bees produce milk? Boo-bees.');

  Ember.run(function() {
    targetController.destroy();
    destroyControl(controller);
  });
});

test("Using an object", function() {
  var controller;
  var targetController = container.lookup('controller:target');

  Ember.run(function() {
    controller = Ember.control(targetController, {controllerClass: CarController, viewClass: CarView}, lamborghini, {
      isCheap: false
    });
  });

  ok(controller instanceof CarController, "Correct controller instance was returned");
  equal(controller.get('target'), targetController, "Property `target` was set on controller");
  equal(controller.get('model'), lamborghini, "Property `model` was set on controller");
  equal(controller.get('isCheap'), false, "Custom property was set on controller");
  var view = controller.get('view');
  ok(view instanceof CarView, "Correct view class was instantiated");
  equal(view.get('controller'), controller, "Property `controller` was set on view");

  equal(view.$().text(), 'Lamborghini (fast)', "View rendered correct content");

  Ember.run(function() {
    targetController.destroy();
    destroyControl(controller);
  });
});

test("Using an object without a viewClass should use default view and a named template", function() {
  var controller;
  var JokerController = Ember.Controller.extend();
  container.register('controller:joker', JokerController);
  container.register('template:joker', Ember.Handlebars.compile('Why does a TV have buttons? Because it would look weird with a zipper'));
  var targetController = container.lookup('controller:target');

  Ember.run(function() {
    controller = Ember.control(targetController, {controllerClass: JokerController, templateName: 'joker'});
  });

  var view = controller.get('view');
  ok(view instanceof DefaultView, "View was created");
  equal(view.get('controller'), controller, "Controller property was set on view");

  Ember.run(function() {
    view.appendTo('#qunit-fixtures');
  });
  
  equal(view.$().text(), 'Why does a TV have buttons? Because it would look weird with a zipper');

  Ember.run(function() {
    targetController.destroy();
    destroyControl(controller);
  });
});

test("Using an object without specifying `controllerClass` should raise an error", function() {
  var controller;
  var targetController = container.lookup('controller:target');

  throws(function() {
    Ember.run(function() {
      controller = Ember.control(targetController, {viewClass: CarView}, lamborghini);
    });
  }, /No `controllerClass` supplied to Ember.control/);

  Ember.run(function() {
    targetController.destroy();
  });
});


test("Using an object without specifying `viewClass` or `template` should raise an error", function() {
  var controller;
  var targetController = container.lookup('controller:target');

  throws(function() {
    Ember.run(function() {
      controller = Ember.control(targetController, {controllerClass: CarController}, lamborghini);
    });
  }, /No `viewClass`, `template` or `templateName` supplied to Ember.control/);

  Ember.run(function() {
    targetController.destroy();
  });
});

test("Call through a controller", function() {
  var controller;
  var TargetController = Ember.Controller.extend({
    createCarControl: function() {
      return this.control('car', lamborghini, {
        isCheap: false
      });
    }
  });
  container.register('controller:target', TargetController);
  var targetController = container.lookup('controller:target');

  Ember.run(function() {
    controller = targetController.createCarControl();
  });

  ok(controller instanceof CarController, "Correct controller instance was returned");
  equal(controller.get('target'), targetController, "Property `target` was set on controller");
  equal(controller.get('model'), lamborghini, "Property `model` was set on controller");
  equal(controller.get('isCheap'), false, "Custom property was set on controller");
  var view = controller.get('view');
  ok(view instanceof CarView, "Correct view class was instantiated");
  equal(view.get('controller'), controller, "Property `controller` was set on view");

  equal(view.$().text(), 'Lamborghini (fast)', "View rendered correct content");

  Ember.run(function() {
    targetController.destroy();
    destroyControl(controller);
  });
});

test("Call through a route", function() {
  var controller;
  var TargetRoute = Ember.Route.extend({
    createCarControl: function() {
      return this.control('car', lamborghini, {
        isCheap: false
      });
    }
  });
  container.register('route:target', TargetRoute);
  var targetRoute = container.lookup('route:target');

  Ember.run(function() {
    controller = targetRoute.createCarControl();
  });

  ok(controller instanceof CarController, "Correct controller instance was returned");
  equal(controller.get('target'), targetRoute, "Property `target` was set on controller");
  equal(controller.get('model'), lamborghini, "Property `model` was set on controller");
  equal(controller.get('isCheap'), false, "Custom property was set on controller");
  var view = controller.get('view');
  ok(view instanceof CarView, "Correct view class was instantiated");
  equal(view.get('controller'), controller, "Property `controller` was set on view");

  equal(view.$().text(), 'Lamborghini (fast)', "View rendered correct content");

  Ember.run(function() {
    targetRoute.destroy();
    destroyControl(controller);
  });
});