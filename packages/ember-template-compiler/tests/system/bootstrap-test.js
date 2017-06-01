import { run } from 'ember-metal';
import { jQuery } from 'ember-views';
import { Component } from 'ember-glimmer';
import bootstrap from '../../system/bootstrap';
import {
  runAppend,
  runDestroy,
  buildOwner
} from 'internal-test-helpers';

const { trim } = jQuery;

let component, fixture, application;

function checkTemplate(templateName) {
  run(() => bootstrap({ context: fixture, application }));

  let { class: template } = application.factoryFor(`template:${templateName}`);

  ok(template, 'template is available via factoryFor');
  equal(jQuery('#qunit-fixture script').length, 0, 'script removed');

  application.register('template:-top-level', template);
  application.register('component:-top-level', Component.extend({
    layoutName: '-top-level',
    firstName: 'Tobias',
    drug: 'teamocil'
  }));

  component = application.lookup('component:-top-level');
  runAppend(component);

  equal(jQuery('#qunit-fixture').text().trim(), 'Tobias takes teamocil', 'template works');
  runDestroy(component);
}

QUnit.module('ember-templates: bootstrap', {
  setup() {
    application = buildOwner();
    fixture = document.getElementById('qunit-fixture');
  },
  teardown() {
    runDestroy(component);
  }
});

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

QUnit.test('duplicated default application templates should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars">second</script>');

  throws(() => bootstrap({ context: fixture, application }),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('default application template and id application template present should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" id="application">second</script>');

  throws(() => bootstrap({ context: fixture, application }),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('default application template and data-template-name application template present should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" data-template-name="application">second</script>');

  throws(() => bootstrap({ context: fixture, application }),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('duplicated template id should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" id="funkyTemplate">first</script><script type="text/x-handlebars" id="funkyTemplate">second</script>');

  throws(() => bootstrap({ context: fixture, application }),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('duplicated template data-template-name should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" data-template-name="funkyTemplate">first</script><script type="text/x-handlebars" data-template-name="funkyTemplate">second</script>');

  throws(() => bootstrap({ context: fixture, application }),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});
