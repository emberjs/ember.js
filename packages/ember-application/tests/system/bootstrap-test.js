import { Router } from 'ember-routing';
import { assign } from 'ember-utils';
import { jQuery } from 'ember-views';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { setTemplates } from 'ember-glimmer';
import DefaultResolver from '../../system/resolver';

moduleFor('Ember.Application with default resolver and autoboot', class extends ApplicationTestCase {
  constructor() {
    jQuery('#qunit-fixture').html(`
      <div id="app"></div>

      <script type="text/x-handlebars">Hello {{outlet}}</script>
      <script type="text/x-handlebars" id="index">World!</script>
    `);
    super();
  }

  teardown() {
    setTemplates({});
  }

  get applicationOptions() {
    return assign(super.applicationOptions, {
      autoboot: true,
      rootElement: '#app',
      Resolver: DefaultResolver,
      Router: Router.extend({
        location: 'none'
      })
    });
  }

  ['@test templates in script tags are extracted at application creation'](assert) {
    assert.equal(jQuery('#app').text(), 'Hello World!');
  }
});
