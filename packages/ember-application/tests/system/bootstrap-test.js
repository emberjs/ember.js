import run from 'ember-metal/run_loop';
import Application from 'ember-application/system/application';
import Router from 'ember-routing/system/router';
import jQuery from 'ember-views/system/jquery';
import { setTemplates } from 'ember-templates/template_registry';

let app;

QUnit.module('Ember.Application', {
  teardown() {
    if (app) {
      run(app, 'destroy');
    }

    setTemplates({});
  }
});

QUnit.test('templates in script tags are extracted at application creation', function(assert) {
  jQuery('#qunit-fixture').html(`
    <div id="app"></div>

    <script type="text/x-handlebars">Hello {{outlet}}</script>
    <script type="text/x-handlebars" id="index">World!</script>
  `);

  let application = Application.extend();
  application.Router = Router.extend({
    location: 'none'
  });

  app = run(() => application.create({ rootElement: '#app' }));

  assert.equal(jQuery('#app').text(), 'Hello World!');
});
