import { Controller } from 'ember-runtime';
import { Component } from 'ember-glimmer';
import { moduleFor, AutobootApplicationTestCase } from 'internal-test-helpers';

moduleFor('Application Lifecycle - Component Registration', class extends AutobootApplicationTestCase {

  ['@test The helper becomes the body of the component'](assert) {
    this.runTask(() => {
      this.createApplication();

      this.addTemplate('components/expand-it', '<p>hello {{yield}}</p>');
      this.addTemplate('application', 'Hello world {{#expand-it}}world{{/expand-it}}');
    });

    let text = this.$('div.ember-view > div.ember-view').text().trim();
    assert.equal(text, 'hello world', 'The component is composed correctly');
  }

  ['@test If a component is registered, it is used'](assert) {
    this.runTask(() => {
      this.createApplication();

      this.addTemplate('components/expand-it', '<p>hello {{yield}}</p>');
      this.addTemplate('application', `Hello world {{#expand-it}}world{{/expand-it}}`);

      this.applicationInstance.register('component:expand-it', Component.extend({
        classNames: 'testing123'
      }));
    });

    let text = this.$('div.testing123').text().trim();
    assert.equal(text, 'hello world', 'The component is composed correctly');
  }

  ['@test Late-registered components can be rendered with custom `layout` property'](assert) {
    this.runTask(() => {
      this.createApplication();

      this.addTemplate('application', `<div id='wrapper'>there goes {{my-hero}}</div>`);

      this.applicationInstance.register('component:my-hero', Component.extend({
        classNames: 'testing123',
        layout: this.compile('watch him as he GOES')
      }));
    });

    let text = this.$('#wrapper').text().trim();
    assert.equal(text, 'there goes watch him as he GOES', 'The component is composed correctly');
  }

  ['@test Late-registered components can be rendered with template registered on the container'](assert) {
    this.runTask(() => {
      this.createApplication();

      this.addTemplate('application', `<div id='wrapper'>hello world {{sally-rutherford}}-{{#sally-rutherford}}!!!{{/sally-rutherford}}</div>`);

      this.applicationInstance.register('template:components/sally-rutherford', this.compile('funkytowny{{yield}}'));
      this.applicationInstance.register('component:sally-rutherford', Component);
    });

    let text = this.$('#wrapper').text().trim();
    assert.equal(text, 'hello world funkytowny-funkytowny!!!', 'The component is composed correctly');
  }

  ['@test Late-registered components can be rendered with ONLY the template registered on the container'](assert) {
    this.runTask(() => {
      this.createApplication();

      this.addTemplate('application', `<div id='wrapper'>hello world {{borf-snorlax}}-{{#borf-snorlax}}!!!{{/borf-snorlax}}</div>`);

      this.applicationInstance.register('template:components/borf-snorlax', this.compile('goodfreakingTIMES{{yield}}'));
    });

    let text = this.$('#wrapper').text().trim();
    assert.equal(text, 'hello world goodfreakingTIMES-goodfreakingTIMES!!!', 'The component is composed correctly');
  }

  ['@test Assigning layoutName to a component should setup the template as a layout'](assert) {
    assert.expect(1);

    this.runTask(() => {
      this.createApplication();

      this.addTemplate('application', `<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>`);
      this.addTemplate('foo-bar-baz', '{{text}}-{{yield}}');

      this.applicationInstance.register('controller:application', Controller.extend({
        text: 'outer'
      }));
      this.applicationInstance.register('component:my-component', Component.extend({
        text: 'inner',
        layoutName: 'foo-bar-baz'
      }));
    });

    let text = this.$('#wrapper').text().trim();
    assert.equal(text, 'inner-outer', 'The component is composed correctly');
  }

  ['@test Assigning layoutName and layout to a component should use the `layout` value'](assert) {
    assert.expect(1);

    this.runTask(() => {
      this.createApplication();

      this.addTemplate('application', `<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>`);
      this.addTemplate('foo-bar-baz', 'No way!');

      this.applicationInstance.register('controller:application', Controller.extend({
        text: 'outer'
      }));
      this.applicationInstance.register('component:my-component', Component.extend({
        text: 'inner',
        layoutName: 'foo-bar-baz',
        layout: this.compile('{{text}}-{{yield}}')
      }));
    });

    let text = this.$('#wrapper').text().trim();
    assert.equal(text, 'inner-outer', 'The component is composed correctly');
  }

  ['@test Assigning defaultLayout to a component should set it up as a layout if no layout was found [DEPRECATED]'](assert) {
    assert.expect(2);

    expectDeprecation(() => {
      this.runTask(() => {
        this.createApplication();

        this.addTemplate('application', `<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>`);

        this.applicationInstance.register('controller:application', Controller.extend({
          text: 'outer'
        }));
        this.applicationInstance.register('component:my-component', Component.extend({
          text: 'inner',
          defaultLayout: this.compile('{{text}}-{{yield}}')
        }));
      });
    });

    let text = this.$('#wrapper').text().trim();
    assert.equal(text, 'inner-outer', 'The component is composed correctly');
  }

  ['@test Assigning defaultLayout to a component should set it up as a layout if layout was found [DEPRECATED]'](assert) {
    assert.expect(2);

    expectDeprecation(() => {
      this.runTask(() => {
        this.createApplication();

        this.addTemplate('application', `<div id='wrapper'>{{#my-component}}{{text}}{{/my-component}}</div>`);
        this.addTemplate('components/my-component', '{{text}}-{{yield}}');

        this.applicationInstance.register('controller:application', Controller.extend({
          text: 'outer'
        }));
        this.applicationInstance.register('component:my-component', Component.extend({
          text: 'inner',
          defaultLayout: this.compile('should not see this!')
        }));
      });
    }, /Specifying `defaultLayout` to .+ is deprecated\./);

    let text = this.$('#wrapper').text().trim();
    assert.equal(text, 'inner-outer', 'The component is composed correctly');
  }

  /*
   * When an exception is thrown during the initial rendering phase, the
   * `visit` promise is not resolved or rejected. This means the `applicationInstance`
   * is never torn down and tests running after this one will fail.
   *
   * It is ugly, but since this test intentionally causes an initial render
   * error, it requires globals mode to access the `applicationInstance`
   * for teardown after test completion.
   *
   * Application "globals mode" is trigged by `autoboot: true`. It doesn't
   * have anything to do with the resolver.
   *
   * We should be able to fix this by having the application eagerly stash a
   * copy of each application instance it creates. When the application is
   * destroyed, it can also destroy the instances (this is how the globals
   * mode avoid the problem).
   *
   * See: https://github.com/emberjs/ember.js/issues/15327
   */
  ['@test Using name of component that does not exist']() {
    expectAssertion(() => {
      this.runTask(() => {
        this.createApplication();

        this.addTemplate('application', `<div id='wrapper'>{{#no-good}} {{/no-good}}</div>`);
      });
    }, /.* named "no-good" .*/);
  }
});