import Ember from 'ember-metal/core';
import run from 'ember-metal/run_loop';
import Component from 'ember-views/components/component';
import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import { runDestroy } from 'ember-runtime/tests/utils';
import bootstrap from 'ember-htmlbars/system/bootstrap';
import Application from 'ember-application/system/application';

var trim = jQuery.trim;

var originalLookup = Ember.lookup;
var lookup, App, view;

QUnit.module('ember-htmlbars: bootstrap', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };
  },
  teardown() {
    Ember.TEMPLATES = {};
    Ember.lookup = originalLookup;
    runDestroy(App);
    runDestroy(view);
  }
});

function checkTemplate(templateName) {
  run(function() {
    bootstrap(jQuery('#qunit-fixture'));
  });
  var template = Ember.TEMPLATES[templateName];
  ok(template, 'template is available on Ember.TEMPLATES');
  equal(jQuery('#qunit-fixture script').length, 0, 'script removed');
  var view = EmberView.create({
    template: template,
    context: {
      firstName: 'Tobias',
      drug: 'teamocil'
    }
  });
  run(function() {
    view.createElement();
  });
  equal(trim(view.$().text()), 'Tobias takes teamocil', 'template works');
  runDestroy(view);
}

QUnit.test('template with data-template-name should add a new template to Ember.TEMPLATES', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" data-template-name="funkyTemplate">{{firstName}} takes {{drug}}</script>');

  checkTemplate('funkyTemplate');
});

QUnit.test('template with id instead of data-template-name should add a new template to Ember.TEMPLATES', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" id="funkyTemplate" >{{firstName}} takes {{drug}}</script>');

  checkTemplate('funkyTemplate');
});

QUnit.test('template without data-template-name or id should default to application', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">{{firstName}} takes {{drug}}</script>');

  checkTemplate('application');
});

if (typeof Handlebars === 'object') {
  QUnit.test('template with type text/x-raw-handlebars should be parsed', function() {
    jQuery('#qunit-fixture').html('<script type="text/x-raw-handlebars" data-template-name="funkyTemplate">{{name}}</script>');

    run(function() {
      bootstrap(jQuery('#qunit-fixture'));
    });

    ok(Ember.TEMPLATES['funkyTemplate'], 'template with name funkyTemplate available');

    // This won't even work with Ember templates
    equal(trim(Ember.TEMPLATES['funkyTemplate']({ name: 'Tobias' })), 'Tobias');
  });
}

QUnit.test('duplicated default application templates should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars">second</script>');

  throws(function () {
    bootstrap(jQuery('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  'duplicate templates should not be allowed');
});

QUnit.test('default application template and id application template present should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" id="application">second</script>');

  throws(function () {
    bootstrap(jQuery('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  'duplicate templates should not be allowed');
});

QUnit.test('default application template and data-template-name application template present should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" data-template-name="application">second</script>');

  throws(function () {
    bootstrap(jQuery('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  'duplicate templates should not be allowed');
});

QUnit.test('duplicated template id should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" id="funkyTemplate">first</script><script type="text/x-handlebars" id="funkyTemplate">second</script>');

  throws(function () {
    bootstrap(jQuery('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  'duplicate templates should not be allowed');
});

QUnit.test('duplicated template data-template-name should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" data-template-name="funkyTemplate">first</script><script type="text/x-handlebars" data-template-name="funkyTemplate">second</script>');

  throws(function () {
    bootstrap(jQuery('#qunit-fixture'));
  },
  /Template named "[^"]+" already exists\./,
  'duplicate templates should not be allowed');
});

if (Ember.component) {
  QUnit.test('registerComponents initializer', function() {
    Ember.TEMPLATES['components/x-apple'] = 'asdf';

    App = run(Application, 'create');

    ok(Ember.Handlebars.helpers['x-apple'], 'x-apple helper is present');
    ok(App.__container__.has('component:x-apple'), 'the container is aware of x-apple');
  });

  QUnit.test('registerComponents and generated components', function() {
    Ember.TEMPLATES['components/x-apple'] = 'asdf';

    App = run(Application, 'create');
    view = App.__container__.lookup('component:x-apple');
    equal(view.get('layoutName'), 'components/x-apple', 'has correct layout name');
  });

  QUnit.test('registerComponents and non-generated components', function() {
    Ember.TEMPLATES['components/x-apple'] = 'asdf';

    run(function() {
      App = Application.create();

      // currently Component code must be loaded before initializers
      // this is mostly due to how they are bootstrapped. We will hopefully
      // sort this out soon.
      App.XAppleComponent = Component.extend({
        isCorrect: true
      });
    });

    view = App.__container__.lookup('component:x-apple');
    equal(view.get('layoutName'), 'components/x-apple', 'has correct layout name');
    ok(view.get('isCorrect'), 'ensure a non-generated component');
  });
}
