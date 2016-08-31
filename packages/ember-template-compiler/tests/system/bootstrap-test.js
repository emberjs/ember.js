import run from 'ember-metal/run_loop';
import jQuery from 'ember-views/system/jquery';
import Component from 'ember-templates/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import bootstrap from 'ember-template-compiler/system/bootstrap';
import { setTemplates, get as getTemplate } from 'ember-templates/template_registry';
import { buildOwner } from 'ember-glimmer/tests/utils/helpers';

const { trim } = jQuery;

let component, fixture;

function checkTemplate(templateName) {
  run(() => bootstrap(fixture));

  let template = getTemplate(templateName);

  ok(template, 'template is available on Ember.TEMPLATES');
  equal(jQuery('#qunit-fixture script').length, 0, 'script removed');

  let owner = buildOwner();
  owner.register('template:-top-level', template);
  owner.register('component:-top-level', Component.extend({
    layoutName: '-top-level',
    firstName: 'Tobias',
    drug: 'teamocil'
  }));

  component = owner.lookup('component:-top-level');
  runAppend(component);

  equal(jQuery('#qunit-fixture').text().trim(), 'Tobias takes teamocil', 'template works');
  runDestroy(component);
}

QUnit.module('ember-templates: bootstrap', {
  setup() {
    fixture = document.getElementById('qunit-fixture');
  },
  teardown() {
    setTemplates({});
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

if (typeof Handlebars === 'object') {
  QUnit.test('template with type text/x-raw-handlebars should be parsed', function() {
    jQuery('#qunit-fixture').html('<script type="text/x-raw-handlebars" data-template-name="funkyTemplate">{{name}}</script>');

    run(() => bootstrap(fixture));

    let template = getTemplate('funkyTemplate');

    ok(template, 'template with name funkyTemplate available');

    // This won't even work with Ember templates
    equal(trim(template({ name: 'Tobias' })), 'Tobias');
  });
}

QUnit.test('duplicated default application templates should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars">second</script>');

  throws(() => bootstrap(fixture),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('default application template and id application template present should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" id="application">second</script>');

  throws(() => bootstrap(fixture),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('default application template and data-template-name application template present should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars">first</script><script type="text/x-handlebars" data-template-name="application">second</script>');

  throws(() => bootstrap(fixture),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('duplicated template id should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" id="funkyTemplate">first</script><script type="text/x-handlebars" id="funkyTemplate">second</script>');

  throws(() => bootstrap(fixture),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});

QUnit.test('duplicated template data-template-name should throw exception', function() {
  jQuery('#qunit-fixture').html('<script type="text/x-handlebars" data-template-name="funkyTemplate">first</script><script type="text/x-handlebars" data-template-name="funkyTemplate">second</script>');

  throws(() => bootstrap(fixture),
         /Template named "[^"]+" already exists\./,
         'duplicate templates should not be allowed');
});
