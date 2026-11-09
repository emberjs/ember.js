import Application from '@ember/application';
import Controller from '@ember/controller';
import { Component } from '@ember/-internals/glimmer';
import { precompileTemplate } from '@ember/template-compilation';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor(
  'Application Lifecycle - Component Registration (classic component)',
  class extends ApplicationTestCase {
    // This is necessary for this.application.instanceInitializer to not leak between tests
    createApplication(options) {
      return super.createApplication(options, class extends Application {});
    }

    ['@test Late-registered components can be rendered with custom `layout` property'](assert) {
      this.add(
        'template:application',
        precompileTemplate(`<div id='wrapper'>there goes {{my-hero}}</div>`)
      );

      this.application.instanceInitializer({
        name: 'my-hero-component',
        initialize(applicationInstance) {
          applicationInstance.register(
            'component:my-hero',
            class extends Component {
              classNames = ['testing123'];
              layout = precompileTemplate('watch him as he GOES');
            }
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

    ['@test Assigning layoutName to a component should setup the template as a layout'](assert) {
      assert.expect(1);

      this.add(
        'template:application',
        precompileTemplate(
          `<div id='wrapper'>{{#my-component}}{{this.text}}{{/my-component}}</div>`
        )
      );
      this.add('template:foo-bar-baz', precompileTemplate('{{this.text}}-{{yield}}'));

      this.application.instanceInitializer({
        name: 'application-controller',
        initialize(applicationInstance) {
          applicationInstance.register(
            'controller:application',
            class extends Controller {
              text = 'outer';
            }
          );
        },
      });
      this.application.instanceInitializer({
        name: 'my-component-component',
        initialize(applicationInstance) {
          applicationInstance.register(
            'component:my-component',
            class extends Component {
              text = 'inner';
              layoutName = 'foo-bar-baz';
            }
          );
        },
      });

      return this.visit('/').then(() => {
        let text = this.$('#wrapper').text().trim();
        assert.equal(text, 'inner-outer', 'The component is composed correctly');
      });
    }

    ['@test Assigning layoutName and layout to a component should use the `layout` value'](assert) {
      assert.expect(1);

      this.add(
        'template:application',
        precompileTemplate(
          `<div id='wrapper'>{{#my-component}}{{this.text}}{{/my-component}}</div>`
        )
      );
      this.add('template:foo-bar-baz', precompileTemplate('No way!'));

      this.application.instanceInitializer({
        name: 'application-controller-layout',
        initialize(applicationInstance) {
          applicationInstance.register(
            'controller:application',
            class extends Controller {
              text = 'outer';
            }
          );
        },
      });
      this.application.instanceInitializer({
        name: 'my-component-component-layout',
        initialize(applicationInstance) {
          applicationInstance.register(
            'component:my-component',
            class extends Component {
              text = 'inner';
              layoutName = 'foo-bar-baz';
              layout = precompileTemplate('{{this.text}}-{{yield}}');
            }
          );
        },
      });

      return this.visit('/').then(() => {
        let text = this.$('#wrapper').text().trim();
        assert.equal(text, 'inner-outer', 'The component is composed correctly');
      });
    }
  }
);
