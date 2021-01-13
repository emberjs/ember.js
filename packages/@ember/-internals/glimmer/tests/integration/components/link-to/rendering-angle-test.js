import {
  moduleFor,
  ApplicationTestCase,
  RenderingTestCase,
  RouterNonApplicationTestCase,
  runTask,
} from 'internal-test-helpers';
import { Router, Route } from '@ember/-internals/routing';
import Controller from '@ember/controller';
import { set } from '@ember/-internals/metal';
import { LinkComponent } from '@ember/-internals/glimmer';

moduleFor(
  '<LinkTo /> component (rendering tests)',
  class extends ApplicationTestCase {
    async [`@test throws a useful error if you invoke it wrong`](assert) {
      this.addTemplate('application', `<LinkTo id='the-link'>Index</LinkTo>`);

      return assert.rejectsAssertion(
        this.visit('/'),
        /You must provide at least one of the `@route`, `@model`, `@models` or `@query` argument to `<LinkTo>`/
      );
    }

    ['@test should be able to be inserted in DOM when the router is not present']() {
      this.addTemplate('application', `<LinkTo @route='index'>Go to Index</LinkTo>`);

      return this.visit('/').then(() => {
        this.assertText('Go to Index');
      });
    }

    ['@test re-renders when title changes']() {
      let controller;

      this.addTemplate('application', `<LinkTo @route='index'>{{title}}</LinkTo>`);

      this.add(
        'controller:application',
        Controller.extend({
          init() {
            this._super(...arguments);
            controller = this;
          },
          title: 'foo',
        })
      );

      return this.visit('/').then(() => {
        this.assertText('foo');
        runTask(() => set(controller, 'title', 'bar'));
        this.assertText('bar');
      });
    }

    ['@test re-computes active class when params change'](assert) {
      let controller;

      this.addTemplate('application', '<LinkTo @route={{routeName}}>foo</LinkTo>');

      this.add(
        'controller:application',
        Controller.extend({
          init() {
            this._super(...arguments);
            controller = this;
          },
          routeName: 'index',
        })
      );

      this.router.map(function () {
        this.route('bar', { path: '/bar' });
      });

      return this.visit('/bar').then(() => {
        assert.equal(this.firstChild.classList.contains('active'), false);
        runTask(() => set(controller, 'routeName', 'bar'));
        assert.equal(this.firstChild.classList.contains('active'), true);
      });
    }

    ['@test able to safely extend the built-in component and use the normal path']() {
      this.addComponent('custom-link-to', {
        ComponentClass: LinkComponent.extend(),
      });

      this.addTemplate('application', `<CustomLinkTo @route='index'>{{title}}</CustomLinkTo>`);

      this.add(
        'controller:application',
        Controller.extend({
          title: 'Hello',
        })
      );

      return this.visit('/').then(() => {
        this.assertText('Hello');
      });
    }

    ['@test able to pupolate innermost dynamic segment when immediate parent route is active']() {
      this.addTemplate('application', '{{outlet}}');
      this.addTemplate('parents', '{{outlet}}');
      this.addTemplate(
        'parents.parent',
        '<LinkTo @route="parents.parent.child" @model=1>Link To Child</LinkTo>'
      );
      this.addTemplate(
        'parents.parent.child',
        '<LinkTo @route="parents.parent">Link To Parent</LinkTo>'
      );
      this.add(
        'route:parents.parent',
        class extends Route {
          async model({ id }) {
            return { value: id };
          }
        }
      );
      this.router.map(function () {
        this.route('parents', function () {
          this.route('parent', { path: '/:parent_id' }, function () {
            this.route('children');
            this.route('child', { path: '/child/:child_id' });
          });
        });
      });
      return this.visit('/parents/1').then(() => {
        this.assertText('Link To Child');
      });
    }
  }
);

moduleFor(
  '<LinkTo /> component (rendering tests, without router)',
  class extends RenderingTestCase {
    ['@test should be able to be inserted in DOM when the router is not present - block']() {
      this.render(`<LinkTo @route='index'>Go to Index</LinkTo>`);

      this.assertComponentElement(this.element.firstChild, {
        tagName: 'a',
        attrs: { href: '#/' },
        content: 'Go to Index',
      });
    }
  }
);
