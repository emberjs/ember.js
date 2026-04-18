import Application from '@ember/application';
import { Component } from '@ember/-internals/glimmer';
import { setComponentTemplate } from '@glimmer/manager';
import { precompileTemplate } from '@ember/template-compilation';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { DEBUG } from '@glimmer/env';
import templateOnly from '@ember/component/template-only';

moduleFor(
  'Application Lifecycle - Component Registration',
  class extends ApplicationTestCase {
    // This is necessary for this.application.instanceInitializer to not leak between tests
    createApplication(options) {
      return super.createApplication(options, class extends Application {});
    }

    ['@test The helper becomes the body of the component']() {
      this.add(
        'component:expand-it',
        setComponentTemplate(precompileTemplate('<p>hello {{yield}}</p>'), templateOnly())
      );
      this.add(
        'template:application',
        precompileTemplate('Hello world {{#expand-it}}world{{/expand-it}}')
      );

      return this.visit('/').then(() => {
        this.assertInnerHTML('Hello world <p>hello world</p>');
      });
    }

    ['@test If a component is registered, it is used'](assert) {
      this.add(
        'template:application',
        precompileTemplate(`Hello world {{#expand-it}}world{{/expand-it}}`)
      );

      this.application.instanceInitializer({
        name: 'expand-it-component',
        initialize(applicationInstance) {
          applicationInstance.register(
            'component:expand-it',
            setComponentTemplate(
              precompileTemplate(`<p>hello {{yield}}</p>`),
              class extends Component {
                classNames = ['testing123'];
              }
            )
          );
        },
      });

      return this.visit('/').then(() => {
        let text = this.$('div.testing123').text().trim();
        assert.equal(text, 'hello world', 'The component is composed correctly');
      });
    }

    ['@test Late-registered components can be rendered with custom template'](assert) {
      this.add(
        'template:application',
        precompileTemplate(`<div id='wrapper'>there goes {{my-hero}}</div>`)
      );

      this.application.instanceInitializer({
        name: 'my-hero-component',
        initialize(applicationInstance) {
          applicationInstance.register(
            'component:my-hero',
            setComponentTemplate(
              precompileTemplate('watch him as he GOES'),
              class extends Component {
                classNames = ['testing123'];
              }
            )
          );
        },
      });

      return this.visit('/').then(() => {
        let text = this.$('#wrapper').text().trim();
        assert.equal(
          text,
          'there goes watch him as he GOES',
          'The component is composed correctly'
        );
      });
    }

    async ['@test Using name of component that does not exist'](assert) {
      this.add(
        'template:application',
        precompileTemplate(`<div id='wrapper'>{{#no-good}} {{/no-good}}</div>`)
      );

      if (DEBUG) {
        await assert.rejectsAssertion(this.visit('/'), /Attempted to resolve `no-good`/);
      } else {
        // Rejects with a worse error message in production
        await assert.rejects(this.visit('/'));
      }
    }
  }
);
