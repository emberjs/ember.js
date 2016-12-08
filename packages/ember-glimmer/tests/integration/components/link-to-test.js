import { moduleFor, ApplicationTest } from '../../utils/test-case';
import { Controller } from 'ember-runtime';
import { set } from 'ember-metal';
import { LinkComponent } from '../../utils/helpers';
import { classes as classMatcher } from '../../utils/test-helpers';

moduleFor('Link-to component', class extends ApplicationTest {
  visitWithDeprecation(path, deprecation) {
    let p;

    expectDeprecation(() => {
      p = this.visit(path);
    }, deprecation);

    return p;
  }

  ['@test accessing `currentWhen` triggers a deprecation'](assert) {
    let component;
    this.registerComponent('link-to', {
      ComponentClass: LinkComponent.extend({
        init() {
          this._super(...arguments);
          component = this;
        }
      })
    });

    this.registerTemplate('application', `{{link-to 'Index' 'index'}}`);

    return this.visit('/').then(() => {
      expectDeprecation(() => {
        component.get('currentWhen');
      }, /Usage of `currentWhen` is deprecated, use `current-when` instead/);
    });
  }

  ['@test should be able to be inserted in DOM when the router is not present']() {
    this.registerTemplate('application', `{{#link-to 'index'}}Go to Index{{/link-to}}`);

    return this.visit('/').then(() => {
      this.assertText('Go to Index');
    });
  }

  ['@test re-renders when title changes']() {
    let controller;

    this.registerTemplate('application', '{{link-to title routeName}}');
    this.registerController('application', Controller.extend({
      init() {
        this._super(...arguments);
        controller = this;
      },
      title: 'foo',
      routeName: 'index'
    }));

    return this.visit('/').then(() => {
      this.assertText('foo');
      this.runTask(() => set(controller, 'title', 'bar'));
      this.assertText('bar');
    });
  }

  ['@test escaped inline form (double curlies) escapes link title']() {
    this.registerTemplate('application', `{{link-to title 'index'}}`);
    this.registerController('application', Controller.extend({
      title: '<b>blah</b>'
    }));

    return this.visit('/').then(() => {
      this.assertText('<b>blah</b>');
    });
  }

  ['@test escaped inline form with (-html-safe) does not escape link title'](assert) {
    this.registerTemplate('application', `{{link-to (-html-safe title) 'index'}}`);
    this.registerController('application', Controller.extend({
      title: '<b>blah</b>'
    }));

    return this.visit('/').then(() => {
      this.assertText('blah');
      assert.equal(this.$('b').length, 1);
    });
  }

  ['@test unescaped inline form (triple curlies) does not escape link title'](assert) {
    this.registerTemplate('application', `{{{link-to title 'index'}}}`);
    this.registerController('application', Controller.extend({
      title: '<b>blah</b>'
    }));

    return this.visit('/').then(() => {
      this.assertText('blah');
      assert.equal(this.$('b').length, 1);
    });
  }

  ['@test unwraps controllers']() {
    this.router.map(function() {
      this.route('profile', { path: '/profile/:id' });
    });
    this.registerTemplate('application', `{{#link-to 'profile' otherController}}Text{{/link-to}}`);
    this.registerController('application', Controller.extend({
      otherController: Controller.create({
        model: 'foo'
      })
    }));

    let deprecation = /Providing `{{link-to}}` with a param that is wrapped in a controller is deprecated./;

    return this.visitWithDeprecation('/', deprecation).then(() => {
      this.assertText('Text');
    });
  }

  ['@test able to safely extend the built-in component and use the normal path']() {
    this.registerComponent('custom-link-to', { ComponentClass: LinkComponent.extend() });
    this.registerTemplate('application', `{{#custom-link-to 'index'}}{{title}}{{/custom-link-to}}`);
    this.registerController('application', Controller.extend({
      title: 'Hello'
    }));

    return this.visit('/').then(() => {
      this.assertText('Hello');
    });
  }

  ['@test [GH#13432] able to safely extend the built-in component and invoke it inline']() {
    this.registerComponent('custom-link-to', { ComponentClass: LinkComponent.extend() });
    this.registerTemplate('application', `{{custom-link-to title 'index'}}`);
    this.registerController('application', Controller.extend({
      title: 'Hello'
    }));

    return this.visit('/').then(() => {
      this.assertText('Hello');
    });
  }
});

moduleFor('Link-to component with query-params', class extends ApplicationTest {
  constructor() {
    super(...arguments);

    this.registerController('index', Controller.extend({
      queryParams: ['foo'],
      foo: '123',
      bar: 'yes'
    }));
  }

  ['@test populates href with fully supplied query param values'](assert) {
    this.registerTemplate('index', `{{#link-to 'index' (query-params foo='456' bar='NAW')}}Index{{/link-to}}`);

    return this.visit('/').then(() => {
      this.assertComponentElement(this.firstChild.firstElementChild, {
        tagName: 'a',
        attrs: { href: '/?bar=NAW&foo=456' },
        content: 'Index'
      });
    });
  }

  ['@test populates href with partially supplied query param values, but omits if value is default value']() {
    this.registerTemplate('index', `{{#link-to 'index' (query-params foo='123')}}Index{{/link-to}}`);

    return this.visit('/').then(() => {
      this.assertComponentElement(this.firstChild.firstElementChild, {
        tagName: 'a',
        attrs: { href: '/', class: classMatcher('ember-view active') },
        content: 'Index'
      });
    });
  }
});
