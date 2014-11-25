import EmberView from "ember-views/views/view";
import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";
import _MetamorphView from 'ember-views/views/metamorph_view';
import EmberHandlebars from "ember-handlebars";
import htmlbarsCompile from "ember-htmlbars/system/compile";
import Container from "ember-runtime/system/container";
import ObjectController from "ember-runtime/controllers/object_controller";

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";

function appendView(view) {
  run(view, 'appendTo', '#qunit-fixture');
}

var view, container;

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

QUnit.module("ember-htmlbars: {{bind}} helper", {
  setup: function() {
    container = new Container();
    container.optionsForType('template', { instantiate: false });
    container.register('view:default', _MetamorphView);
    container.register('view:toplevel', EmberView.extend());
  },
  teardown: function() {
    run(function() {
      if (container) {
        container.destroy();
      }
      if (view) {
        view.destroy();
      }

      container = view = null;
    });
  }
});

test("it should render the current value of a property on the context", function() {
  view = EmberView.create({
    template: compile('{{bind foo}}'),
    context: EmberObject.create({
      foo: "BORK"
    })
  });

  appendView(view);

  equal(view.$().text(), "BORK", "initial value is rendered");

  run(view, view.set, 'context.foo', 'MWEEER');

  equal(view.$().text(), "MWEEER", "value can be updated");
});

test("it should render the current value of a path on the context", function() {
  view = EmberView.create({
    template: compile('{{bind foo.bar}}'),
    context: EmberObject.create({
      foo: {
        bar: "BORK"
      }
    })
  });

  appendView(view);

  equal(view.$().text(), "BORK", "initial value is rendered");

  run(view, view.set, 'context.foo.bar', 'MWEEER');

  equal(view.$().text(), "MWEEER", "value can be updated");
});

test("it should render the current value of a string path on the context", function() {
  view = EmberView.create({
    template: compile('{{bind "foo.bar"}}'),
    context: EmberObject.create({
      foo: {
        bar: "BORK"
      }
    })
  });

  appendView(view);

  equal(view.$().text(), "BORK", "initial value is rendered");

  run(view, view.set, 'context.foo.bar', 'MWEEER');

  equal(view.$().text(), "MWEEER", "value can be updated");
});

QUnit.module("ember-htmlbars: {{bind}} with a container, block forms", {
  setup: function() {
    container = new Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    Ember.run(function(){
      if (container) {
        container.destroy();
      }
      if (view) {
        view.destroy();
      }
    });
    container = view = null;
  }
});

test("should not update when a property is removed from the view", function() {
  if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
    expectDeprecation(/block form of bind.*has been deprecated/);
  }
  var template = compile(
    '<h1 id="first">{{#bind view.content}}{{#bind foo}}{{bind baz}}{{/bind}}{{/bind}}</h1>' );
  container.register('template:foo', template);

  view = EmberView.create({
    container: container,
    templateName: 'foo',

    content: EmberObject.create({
      foo: EmberObject.create({
        baz: "unicorns"
      })
    })
  });

  appendView(view);

  equal(view.$('#first').text(), "unicorns", "precond - renders the bound value");

  var oldContent = get(view, 'content');

  run(function() {
    set(view, 'content', EmberObject.create({
      foo: EmberObject.create({
        baz: "ninjas"
      })
    }));
  });

  equal(view.$('#first').text(), 'ninjas', "updates to new content value");

  run(function() {
    set(oldContent, 'foo.baz', 'rockstars');
  });

  run(function() {
    set(oldContent, 'foo.baz', 'ewoks');
  });

  equal(view.$('#first').text(), "ninjas", "does not update removed object");
});

test("Handlebars templates update properties if a content object changes", function() {
  if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
    expectDeprecation(/block form of bind.*has been deprecated/);
  }
  var template = compile(
    '<h1>Today\'s Menu</h1>{{#bind view.coffee}}<h2>{{color}} coffee</h2><span id="price">{{bind price}}</span>{{/bind}}');
  container.register('template:menu', template);

  run(function() {
    view = EmberView.create({
      container: container,
      templateName: 'menu',

      coffee: EmberObject.create({
        color: 'brown',
        price: '$4'
      })
    });
  });

  appendView(view);

  equal(view.$('h2').text(), "brown coffee", "precond - renders color correctly");
  equal(view.$('#price').text(), '$4', "precond - renders price correctly");

  run(function() {
    set(view, 'coffee', EmberObject.create({
      color: "mauve",
      price: "$4.50"
    }));
  });

  equal(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equal(view.$('#price').text(), "$4.50", "should update price field when content changes");

  run(function() {
    set(view, 'coffee', EmberObject.create({
      color: "mauve",
      price: "$5.50"
    }));
  });

  equal(view.$('h2').text(), "mauve coffee", "should update name field when content changes");
  equal(view.$('#price').text(), "$5.50", "should update price field when content changes");

  run(function() {
    set(view, 'coffee.price', "$5");
  });

  equal(view.$('#price').text(), "$5", "should update price field when price property is changed");

  run(function() {
    view.destroy();
  });
});

test("Template updates correctly if a path is passed to the bind helper", function() {
  var template = compile('<h1>{{bind view.coffee.price}}</h1>');
  container.register('template:menu', template);

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    coffee: EmberObject.create({
      price: '$4'
    })
  });

  appendView(view);

  equal(view.$('h1').text(), "$4", "precond - renders price");

  run(function() {
    set(view, 'coffee.price', "$5");
  });

  equal(view.$('h1').text(), "$5", "updates when property changes");

  run(function() {
    set(view, 'coffee', { price: "$6" });
  });

  equal(view.$('h1').text(), "$6", "updates when parent property changes");
});

test("Template updates correctly if a path is passed to the bind helper and the context object is an ObjectController", function() {
  var template = compile('<h1>{{bind view.coffee.price}}</h1>');
  container.register('template:menu', template);

  var controller = ObjectController.create();

  var realObject = EmberObject.create({
    price: "$4"
  });

  set(controller, 'model', realObject);

  view = EmberView.create({
    container: container,
    templateName: 'menu',

    coffee: controller
  });

  appendView(view);

  equal(view.$('h1').text(), "$4", "precond - renders price");

  run(function() {
    set(realObject, 'price', "$5");
  });

  equal(view.$('h1').text(), "$5", "updates when property is set on real object");

  run(function() {
    set(controller, 'price', "$6" );
  });

  equal(view.$('h1').text(), "$6", "updates when property is set on object controller");
});

test('View should update when a property changes and the bind helper is used', function() {
  container.register('template:foo', compile('<h1 id="first">{{#with view.content as thing}}{{bind "thing.wham"}}{{/with}}</h1>'));

  view = EmberView.create({
    container: container,
    templateName: 'foo',

    content: EmberObject.create({
      wham: 'bam',
      thankYou: "ma'am"
    })
  });

  appendView(view);

  equal(view.$('#first').text(), 'bam', 'precond - view renders Handlebars template');

  run(function() {
    set(get(view, 'content'), 'wham', 'bazam');
  });

  equal(view.$('#first').text(), 'bazam', 'view updates when a bound property changes');
});
