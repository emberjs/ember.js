import Application from '@ember/application';
import Controller from '@ember/controller';
import { Component } from '@ember/-internals/glimmer';
import { compile } from 'ember-template-compiler';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { ENV } from '@ember/-internals/environment';

moduleFor(
  'Application Lifecycle - Component Registration',
  class extends ApplicationTestCase {
    // This is necessary for this.application.instanceInitializer to not leak between tests
    createApplication(options) {
      return super.createApplication(options, Application.extend());
    }

    ['@test The helper becomes the body of the component']() {
      this.addTemplate('components/expand-it', '<p>hello {{yield}}</p>');
      this.addTemplate('application', 'Hello world {{#expand-it}}world{{/expand-it}}');

      return this.visit('/').then(() => {
        this.assertText('Hello world hello world');
        this.assertComponentElement(this.element.firstElementChild, {
          tagName: 'div',
          content: '<p>hello world</p>',
        });
      });
    }

    ['@test The helper becomes the body of the component (ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = true;)']() {
      ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = true;
      this.addTemplate('components/expand-it', '<p>hello {{yield}}</p>');
      this.addTemplate('application', 'Hello world {{#expand-it}}world{{/expand-it}}');

      return this.visit('/').then(() => {
        this.assertInnerHTML('Hello world <p>hello world</p>');
        ENV._TEMPLATE_ONLY_GLIMMER_COMPONENTS = false;
      });
    }

    ['@test If a component is registered, it is used'](assert) {
      this.addTemplate('components/expand-it', '<p>hello {{yield}}</p>');
      this.addTemplate('application', `Hello world {{#expand-it}}world{{/expand-it}}`);

      this.application.instanceInitializer({
        name: 'expand-it-component',
        initialize(applicationInstance) {
          applicationInstance.register(
            'component:expand-it',
            Component.extend({
              classNames: 'testing123',
            })
          );
        },
      });

      return this.visit('/').then(() => {
        let text = this.$('div.testing123')
          .text()
          .trim();
        assert.equal(text, 'hello world', 'The component is composed correctly');
      });
    }

    ['@test Late-registered components can be rendered with custom `layout` property'](assert) {
      this.addTemplate('application', `<div id='wrapper'>there goes {{my-hero}}</div>`);

      this.application.instanceInitializer({
        name: 'my-hero-component',
        initialize(applicationInstance) {
          applicationInstance.register(
            'component:my-hero',
            Component.extend({
              classNames: 'testing123',
              layout: compile('watch him as he GOES'),
            })
          );
        },
      });

      return this.visit('/').then(() => {
        let text = this.$('#wrapper')
          .text()
          .trim();
        assert.equal(
          text,
          'there goes watch him as he GOES',
          'The component is composed correctly'
        );
      });
    }

    ['@test Late-registered components can be rendered with template registered on the container'](
      assert
    ) {
      this.addTemplate(
        'application',
        `<div id='wrapper'>hello world {{sally-rutherford}}-{{#sally-rutherford}}!!!{{/sally-rutherford}}</div>`
      );

      this.application.instanceInitializer({
        name: 'sally-rutherford-component-template',
        initialize(applicationInstance) {
          applicationInstance.register(
            'template:components/sally-rutherford',
            compile('funkytowny{{yield}}')
          );
        },
      });
      this.application.instanceInitializer({
        name: 'sally-rutherford-component',
        initialize(applicationInstance) {
          applicationInstance.register('component:sally-rutherford', Component);
        },
      });

      return this.visit('/').then(() => {
        let text = this.$('#wrapper')
          .text()
          .trim();
        assert.equal(
          text,
          'hello world funkytowny-funkytowny!!!',
          'The component is composed correctly'
        );
      });
    }

    ['@test Late-registered components can be rendered with ONLY the template registered on the container'](
      assert
    ) {
      this.addTemplate(
        'application',
        `<div id='wrapper'>hello world {{borf-snorlax}}-{{#borf-snorlax}}!!!{{/borf-snorlax}}</div>`
      );

      this.application.instanceInitializer({
        name: 'borf-snorlax-component-template',
        initialize(applicationInstance) {
          applicationInstance.register(
            'template:components/borf-snorlax',
            compile('goodfreakingTIMES{{yield}}')
          );
        },
      });

      return this.visit('/').then(() => {
        let text = this.$('#wrapper')
          .text()
          .trim();
        assert.equal(
          text,
          'hello world goodfreakingTIMES-goodfreakingTIMES!!!',
          'The component is composed correctly'
        );
      });
    }

    ['@test Assigning layoutName to a component should setup the template as a layout'](assert) {
      assert.expect(1);

      this.addTemplate(
        'application',
        `<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>`
      );
      this.addTemplate('foo-bar-baz', '{{text}}-{{yield}}');

      this.application.instanceInitializer({
        name: 'application-controller',
        initialize(applicationInstance) {
          applicationInstance.register(
            'controller:application',
            Controller.extend({
              text: 'outer',
            })
          );
        },
      });
      this.application.instanceInitializer({
        name: 'my-component-component',
        initialize(applicationInstance) {
          applicationInstance.register(
            'component:my-component',
            Component.extend({
              text: 'inner',
              layoutName: 'foo-bar-baz',
            })
          );
        },
      });

      return this.visit('/').then(() => {
        let text = this.$('#wrapper')
          .text()
          .trim();
        assert.equal(text, 'inner-outer', 'The component is composed correctly');
      });
    }

    ['@test Assigning layoutName and layout to a component should use the `layout` value'](assert) {
      assert.expect(1);

      this.addTemplate(
        'application',
        `<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>`
      );
      this.addTemplate('foo-bar-baz', 'No way!');

      this.application.instanceInitializer({
        name: 'application-controller-layout',
        initialize(applicationInstance) {
          applicationInstance.register(
            'controller:application',
            Controller.extend({
              text: 'outer',
            })
          );
        },
      });
      this.application.instanceInitializer({
        name: 'my-component-component-layout',
        initialize(applicationInstance) {
          applicationInstance.register(
            'component:my-component',
            Component.extend({
              text: 'inner',
              layoutName: 'foo-bar-baz',
              layout: compile('{{text}}-{{yield}}'),
            })
          );
        },
      });

      return this.visit('/').then(() => {
        let text = this.$('#wrapper')
          .text()
          .trim();
        assert.equal(text, 'inner-outer', 'The component is composed correctly');
      });
    }

    ['@test Using name of component that does not exist']() {
      this.addTemplate('application', `<div id='wrapper'>{{#no-good}} {{/no-good}}</div>`);

      // TODO: Use the async form of expectAssertion here when it is available
      expectAssertion(() => {
        this.visit('/');
      }, /.* named "no-good" .*/);

      return this.runLoopSettled();
    }
  }
);
