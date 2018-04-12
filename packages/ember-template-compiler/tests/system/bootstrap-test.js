import { run } from '@ember/runloop';
import { Component, getTemplate, setTemplates, hasTemplate, setTemplate } from 'ember-glimmer';
import bootstrap from '../../lib/system/bootstrap';
import {
  runAppend,
  runDestroy,
  buildOwner,
  moduleFor,
  AbstractTestCase,
} from 'internal-test-helpers';

let component, fixture;

function checkTemplate(templateName, assert) {
  run(() => bootstrap({ context: fixture, hasTemplate, setTemplate }));

  let template = getTemplate(templateName);
  let qunitFixture = document.querySelector('#qunit-fixture');

  assert.ok(template, 'template is available on Ember.TEMPLATES');
  assert.notOk(qunitFixture.querySelector('script'), 'script removed');

  let owner = buildOwner();
  owner.register('template:-top-level', template);
  owner.register(
    'component:-top-level',
    Component.extend({
      layoutName: '-top-level',
      firstName: 'Tobias',
      drug: 'teamocil',
    })
  );

  component = owner.lookup('component:-top-level');
  runAppend(component);

  assert.equal(qunitFixture.textContent.trim(), 'Tobias takes teamocil', 'template works');
  runDestroy(component);
}

moduleFor(
  'ember-templates: bootstrap',
  class extends AbstractTestCase {
    constructor() {
      super();

      fixture = document.getElementById('qunit-fixture');
    }

    teardown() {
      setTemplates({});
      runDestroy(component);
    }

    ['@test template with data-template-name should add a new template to Ember.TEMPLATES'](
      assert
    ) {
      fixture.innerHTML =
        '<script type="text/x-handlebars" data-template-name="funkyTemplate">{{firstName}} takes {{drug}}</script>';

      checkTemplate('funkyTemplate', assert);
    }

    ['@test template with id instead of data-template-name should add a new template to Ember.TEMPLATES'](
      assert
    ) {
      fixture.innerHTML =
        '<script type="text/x-handlebars" id="funkyTemplate" >{{firstName}} takes {{drug}}</script>';

      checkTemplate('funkyTemplate', assert);
    }

    ['@test template without data-template-name or id should default to application'](assert) {
      fixture.innerHTML = '<script type="text/x-handlebars">{{firstName}} takes {{drug}}</script>';

      checkTemplate('application', assert);
    }

    // Add this test case, only for typeof Handlebars === 'object';
    [`${
      typeof Handlebars === 'object' ? '@test' : '@skip'
    } template with type text/x-raw-handlebars should be parsed`](assert) {
      fixture.innerHTML =
        '<script type="text/x-raw-handlebars" data-template-name="funkyTemplate">{{name}}</script>';

      run(() => bootstrap({ context: fixture, hasTemplate, setTemplate }));

      let template = getTemplate('funkyTemplate');

      assert.ok(template, 'template with name funkyTemplate available');

      // This won't even work with Ember templates
      assert.equal(template({ name: 'Tobias' }).trim(), 'Tobias');
    }

    ['@test duplicated default application templates should throw exception'](assert) {
      fixture.innerHTML =
        '<script type="text/x-handlebars">first</script><script type="text/x-handlebars">second</script>';

      assert.throws(
        () => bootstrap({ context: fixture, hasTemplate, setTemplate }),
        /Template named "[^"]+" already exists\./,
        'duplicate templates should not be allowed'
      );
    }

    ['@test default default application template and id application template present should throw exception'](
      assert
    ) {
      fixture.innerHTML =
        '<script type="text/x-handlebars">first</script><script type="text/x-handlebars" id="application">second</script>';

      assert.throws(
        () => bootstrap({ context: fixture, hasTemplate, setTemplate }),
        /Template named "[^"]+" already exists\./,
        'duplicate templates should not be allowed'
      );
    }

    ['@test default application template and data-template-name application template present should throw exception'](
      assert
    ) {
      fixture.innerHTML =
        '<script type="text/x-handlebars">first</script><script type="text/x-handlebars" data-template-name="application">second</script>';

      assert.throws(
        () => bootstrap({ context: fixture, hasTemplate, setTemplate }),
        /Template named "[^"]+" already exists\./,
        'duplicate templates should not be allowed'
      );
    }

    ['@test duplicated template id should throw exception'](assert) {
      fixture.innerHTML =
        '<script type="text/x-handlebars" id="funkyTemplate">first</script><script type="text/x-handlebars" id="funkyTemplate">second</script>';

      assert.throws(
        () => bootstrap({ context: fixture, hasTemplate, setTemplate }),
        /Template named "[^"]+" already exists\./,
        'duplicate templates should not be allowed'
      );
    }

    ['@test duplicated template data-template-name should throw exception'](assert) {
      fixture.innerHTML =
        '<script type="text/x-handlebars" data-template-name="funkyTemplate">first</script><script type="text/x-handlebars" data-template-name="funkyTemplate">second</script>';

      assert.throws(
        () => bootstrap({ context: fixture, hasTemplate, setTemplate }),
        /Template named "[^"]+" already exists\./,
        'duplicate templates should not be allowed'
      );
    }
  }
);
