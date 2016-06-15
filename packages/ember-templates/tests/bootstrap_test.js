import { context } from 'ember-environment';
import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import Component from 'ember-templates/component';
import { runDestroy } from 'ember-runtime/tests/utils';
import bootstrap from 'ember-templates/bootstrap';
import { setTemplates, get as getTemplate } from 'ember-templates/template_registry';

const { trim } = jQuery;

const originalLookup = context.lookup;
let lookup, App, component;

function checkTemplate(templateName) {
  run(() => bootstrap(jQuery('#qunit-fixture')));

  let template = getTemplate(templateName);

  ok(template, 'template is available on Ember.TEMPLATES');
  equal(jQuery('#qunit-fixture script').length, 0, 'script removed');

  let component = Component.create({
    layout: template,
    firstName: 'Tobias',
    drug: 'teamocil'
  });

  run(() => component.createElement());
  equal(trim(component.$().text()), 'Tobias takes teamocil', 'template works');
  runDestroy(component);
}

import { test } from 'internal-test-helpers/tests/skip-if-glimmer';

QUnit.module('ember-htmlbars: bootstrap', {
  setup() {
    context.lookup = lookup = {};
  },
  teardown() {
    setTemplates({});
    context.lookup = originalLookup;
    runDestroy(App);
    runDestroy(component);
  }
});

test('template with data-template-name should add a new template to Ember.TEMPLATES', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" data-template-name="funkyTemplate">{{firstName}} takes {{drug}}</script>');

  checkTemplate('funkyTemplate');
});

test('template with id instead of data-template-name should add a new template to Ember.TEMPLATES', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" id="funkyTemplate" >{{firstName}} takes {{drug}}</script>');

  checkTemplate('funkyTemplate');
});

test('template without data-template-name or id should default to application', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">{{firstName}} takes {{drug}}</script>');

  checkTemplate('application');
});

if (typeof Handlebars === 'object') {
  QUnit.test('template with type text/x-raw-handlebars should be parsed', function() {
    jQuery('#qunit-fixture').html('<script type="text/x-raw-handlebars" data-template-name="funkyTemplate">{{name}}</script>');

    run(() => bootstrap(jQuery('#qunit-fixture')));

    let template = getTemplate('funkyTemplate');

    ok(template, 'template with name funkyTemplate available');

    // This won't even work with Ember templates
    equal(trim(template({ name: 'Tobias' })), 'Tobias');
  });
}

QUnit.test('duplicated default application templates should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars">second</script>');

  throws(() => bootstrap(jQuery('#qunit-fixture')),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('default application template and id application template present should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" id="application">second</script>');

  throws(() => bootstrap(jQuery('#qunit-fixture')),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('default application template and data-template-name application template present should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" data-template-name="application">second</script>');

  throws(() => bootstrap(jQuery('#qunit-fixture')),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('duplicated template id should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" id="funkyTemplate">first</script><script type="text/x-handlebars" id="funkyTemplate">second</script>');

  throws(() => bootstrap(jQuery('#qunit-fixture')),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('duplicated template data-template-name should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" data-template-name="funkyTemplate">first</script><script type="text/x-handlebars" data-template-name="funkyTemplate">second</script>');

  throws(() => bootstrap(jQuery('#qunit-fixture')),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});
