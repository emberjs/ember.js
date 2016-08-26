import packageName from '../../utils/package-name';
import { moduleFor, ApplicationTest } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { compile } from '../../utils/helpers';
import Controller from 'ember-runtime/controllers/controller';
import Engine from 'ember-application/system/engine';
import isEnabled from 'ember-metal/features';

// only run these tests for ember-glimmer when the feature is enabled, or for
// ember-htmlbars when the feature is not enabled
const shouldRun = isEnabled('ember-application-engines') && (
  (
    (isEnabled('ember-glimmer') && packageName === 'glimmer') ||
    (!isEnabled('ember-glimmer') && packageName === 'htmlbars')
  )
);

if (shouldRun) {
  moduleFor('Application test: engine rendering', class extends ApplicationTest {
    ['@test sharing a template between engine and application has separate refinements']() {
      this.assert.expect(1);

      let sharedTemplate = compile(strip`
        <h1>{{contextType}}</h1>
        {{ambiguous-curlies}}

        {{outlet}}
      `);

      this.application.register('template:application', sharedTemplate);
      this.registerController('application', Controller.extend({
        contextType: 'Application',
        'ambiguous-curlies': 'Controller Data!'
      }));

      this.router.map(function() {
        this.mount('blog');
      });
      this.application.register('route-map:blog', function() { });

      this.registerEngine('blog', Engine.extend({
        init() {
          this._super(...arguments);

          this.register('controller:application', Controller.extend({
            contextType: 'Engine'
          }));
          this.register('template:application', sharedTemplate);
          this.register('template:components/ambiguous-curlies', compile(strip`
          <p>Component!</p>
        `));
        }
      }));

      return this.visit('/blog').then(() => {
        this.assertText('ApplicationController Data!EngineComponent!');
      });
    }
  });
}
