import Ember from 'ember-metal/core'; // lookup
import EmberView from 'ember-views/views/view';
import run from 'ember-metal/run_loop';
import EmberObject from 'ember-runtime/system/object';
import { set } from 'ember-metal/property_set';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

var view, lookup;
var originalLookup = Ember.lookup;

function testWithAs(moduleName, templateString, deprecated) {
  QUnit.module(moduleName, {
    setup() {
      Ember.lookup = lookup = { Ember: Ember };

      var template;
      if (deprecated) {
        expectDeprecation(function() {
          template = compile(templateString);
        }, 'Using {{with}} without block syntax (L1:C0) is deprecated. Please use standard block form (`{{#with foo as |bar|}}`) instead.');
      } else {
        template = compile(templateString);
      }


      view = EmberView.create({
        template: template,
        context: {
          title: 'Señor Engineer',
          person: { name: 'Tom Dale' }
        }
      });

      runAppend(view);
    },

    teardown() {
      runDestroy(view);
      Ember.lookup = originalLookup;
    }
  });

  QUnit.test('it should support #with-as syntax', function() {
    equal(view.$().text(), 'Señor Engineer: Tom Dale', 'should be properly scoped');
  });

  QUnit.test('updating the context should update the alias', function() {
    run(function() {
      view.set('context.person', {
        name: 'Yehuda Katz'
      });
    });

    equal(view.$().text(), 'Señor Engineer: Yehuda Katz', 'should be properly scoped after updating');
  });

  QUnit.test('updating a property on the context should update the HTML', function() {
    equal(view.$().text(), 'Señor Engineer: Tom Dale', 'precond - should be properly scoped after updating');

    run(function() {
      set(view, 'context.person.name', 'Yehuda Katz');
    });

    equal(view.$().text(), 'Señor Engineer: Yehuda Katz', 'should be properly scoped after updating');
  });

  QUnit.test('updating a property on the view should update the HTML', function() {
    run(function() {
      view.set('context.title', 'Señorette Engineer');
    });

    equal(view.$().text(), 'Señorette Engineer: Tom Dale', 'should be properly scoped after updating');
  });
}

QUnit.module('Multiple Handlebars {{with foo as |bar|}} helpers', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };
  },

  teardown() {
    runDestroy(view);

    Ember.lookup = originalLookup;
  }
});

QUnit.test('re-using the same variable with different #with blocks does not override each other', function() {
  view = EmberView.create({
    template: compile('Admin: {{#with admin as |person|}}{{person.name}}{{/with}} User: {{#with user as |person|}}{{person.name}}{{/with}}'),
    context: {
      admin: { name: 'Tom Dale' },
      user: { name: 'Yehuda Katz' }
    }
  });

  runAppend(view);
  equal(view.$().text(), 'Admin: Tom Dale User: Yehuda Katz', 'should be properly scoped');
});

QUnit.test('the scoped variable is not available outside the {{with}} block.', function() {
  view = EmberView.create({
    template: compile('{{name}}-{{#with other as |name|}}{{name}}{{/with}}-{{name}}'),
    context: {
      name: 'Stef',
      other: 'Yehuda'
    }
  });

  runAppend(view);
  equal(view.$().text(), 'Stef-Yehuda-Stef', 'should be properly scoped after updating');
});

QUnit.test('nested {{with}} blocks shadow the outer scoped variable properly.', function() {
  view = EmberView.create({
    template: compile('{{#with first as |ring|}}{{ring}}-{{#with fifth as |ring|}}{{ring}}-{{#with ninth as |ring|}}{{ring}}-{{/with}}{{ring}}-{{/with}}{{ring}}{{/with}}'),
    context: {
      first: 'Limbo',
      fifth: 'Wrath',
      ninth: 'Treachery'
    }
  });

  runAppend(view);
  equal(view.$().text(), 'Limbo-Wrath-Treachery-Wrath-Limbo', 'should be properly scoped after updating');
});

QUnit.module('Handlebars {{#with keyword as |foo|}}');

QUnit.test('it should support #with view as |foo|', function() {
  var view = EmberView.create({
    template: compile('{{#with view as |myView|}}{{myView.name}}{{/with}}'),
    name: 'Sonics'
  });

  runAppend(view);
  equal(view.$().text(), 'Sonics', 'should be properly scoped');

  run(function() {
    set(view, 'name', 'Thunder');
  });

  equal(view.$().text(), 'Thunder', 'should update');

  runDestroy(view);
});

QUnit.test('it should support #with name as |foo|, then #with foo as |bar|', function() {
  var view = EmberView.create({
    template: compile('{{#with name as |foo|}}{{#with foo as |bar|}}{{bar}}{{/with}}{{/with}}'),
    context: { name: 'caterpillar' }
  });

  runAppend(view);
  equal(view.$().text(), 'caterpillar', 'should be properly scoped');

  run(function() {
    set(view, 'context.name', 'butterfly');
  });

  equal(view.$().text(), 'butterfly', 'should update');

  runDestroy(view);
});

QUnit.module('Handlebars {{#with this as |foo|}}');

QUnit.test('it should support #with this as |qux|', function() {
  var view = EmberView.create({
    template: compile('{{#with this as |person|}}{{person.name}}{{/with}}'),
    controller: EmberObject.create({ name: 'Los Pivots' })
  });

  runAppend(view);
  equal(view.$().text(), 'Los Pivots', 'should be properly scoped');

  run(function() {
    set(view, 'controller.name', 'l\'Pivots');
  });

  equal(view.$().text(), 'l\'Pivots', 'should update');

  runDestroy(view);
});

QUnit.module('{{#with}} helper binding to view keyword', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };

    view = EmberView.create({
      template: compile('We have: {{#with view.thing as |fromView|}}{{fromView.name}} and {{fromContext.name}}{{/with}}'),
      thing: { name: 'this is from the view' },
      context: {
        fromContext: { name: 'this is from the context' }
      }
    });

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    Ember.lookup = originalLookup;
  }
});

QUnit.test('{{with}} helper can bind to keywords with \'as\'', function() {
  equal(view.$().text(), 'We have: this is from the view and this is from the context', 'should render');
});

testWithAs('ember-htmlbars: {{#with x as |y|}}', '{{#with person as |tom|}}{{title}}: {{tom.name}}{{/with}}');

QUnit.module('Multiple Handlebars {{with foo as |bar|}} helpers', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };
  },

  teardown() {
    runDestroy(view);
    Ember.lookup = originalLookup;
  }
});

QUnit.test('re-using the same variable with different #with blocks does not override each other', function() {
  view = EmberView.create({
    template: compile('Admin: {{#with admin as |person|}}{{person.name}}{{/with}} User: {{#with user as |person|}}{{person.name}}{{/with}}'),
    context: {
      admin: { name: 'Tom Dale' },
      user: { name: 'Yehuda Katz' }
    }
  });

  runAppend(view);
  equal(view.$().text(), 'Admin: Tom Dale User: Yehuda Katz', 'should be properly scoped');
});

QUnit.test('the scoped variable is not available outside the {{with}} block.', function() {
  view = EmberView.create({
    template: compile('{{name}}-{{#with other as |name|}}{{name}}{{/with}}-{{name}}'),
    context: {
      name: 'Stef',
      other: 'Yehuda'
    }
  });

  runAppend(view);

  equal(view.$().text(), 'Stef-Yehuda-Stef', 'should be properly scoped after updating');
});

QUnit.test('nested {{with}} blocks shadow the outer scoped variable properly.', function() {
  view = EmberView.create({
    template: compile('{{#with first as |ring|}}{{ring}}-{{#with fifth as |ring|}}{{ring}}-{{#with ninth as |ring|}}{{ring}}-{{/with}}{{ring}}-{{/with}}{{ring}}{{/with}}'),
    context: {
      first: 'Limbo',
      fifth: 'Wrath',
      ninth: 'Treachery'
    }
  });

  runAppend(view);
  equal(view.$().text(), 'Limbo-Wrath-Treachery-Wrath-Limbo', 'should be properly scoped after updating');
});

QUnit.test('{{with}} block should not render if passed variable is falsey', function () {
  view = EmberView.create({
    template: compile('{{#with foo as |bar|}}Don\'t render me{{/with}}'),
    context: {
      foo: null
    }
  });
  runAppend(view);
  equal(view.$().text(), '', 'should not render the inner template');
});

QUnit.module('{{#with}} inverse template', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };

    view = EmberView.create({
      template: compile('{{#with view.falsyThing as |thing|}}Has Thing{{else}}No Thing{{/with}}'),
      falsyThing: null
    });

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    Ember.lookup = originalLookup;
  }
});

QUnit.test('inverse template is displayed', function() {
  equal(view.$().text(), 'No Thing', 'should render inverse template');
});

QUnit.test('changing the property to truthy causes standard template to be displayed', function() {
  run(function() {
    set(view, 'falsyThing', true);
  });
  equal(view.$().text(), 'Has Thing', 'should render standard template');
});

QUnit.module('{{#with}} inverse template preserves context', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };

    view = EmberView.create({
      template: compile('{{#with falsyThing as |thing|}}Has Thing{{else}}No Thing {{otherThing}}{{/with}}'),
      context: {
        falsyThing: null,
        otherThing: 'bar'
      }
    });

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    Ember.lookup = originalLookup;
  }
});

QUnit.test('inverse template is displayed with context', function() {
  equal(view.$().text(), 'No Thing bar', 'should render inverse template with context preserved');
});
