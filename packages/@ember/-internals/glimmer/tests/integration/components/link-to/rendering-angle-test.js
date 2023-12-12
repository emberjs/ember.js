import {
  moduleFor,
  ApplicationTestCase,
  RenderingTestCase,
  RouterNonApplicationTestCase,
  runTask,
} from 'internal-test-helpers';
import Router from '@ember/routing/router';
import Route from '@ember/routing/route';
import Controller from '@ember/controller';
import { set } from '@ember/object';
import { DEBUG } from '@glimmer/env';

moduleFor(
  '<LinkTo /> component (rendering tests)',
  class extends ApplicationTestCase {
    async [`@test it throws a useful error if you invoke it wrong`](assert) {
      this.addTemplate('application', `<LinkTo>Index</LinkTo>`);

      return assert.rejectsAssertion(
        this.visit('/'),
        /You must provide at least one of the `@route`, `@model`, `@models` or `@query` arguments to `<LinkTo>`/
      );
    }

    async [`@test it throws a useful error if you pass the href argument`](assert) {
      this.addTemplate('application', `<LinkTo @href="nope" @route="index">Index</LinkTo>`);

      if (DEBUG) {
        await assert.rejects(
          this.visit('/'),
          /Passing the `@href` argument to <LinkTo> is not supported\./
        );
      } else {
        assert.expect(0);
      }
    }

    async ['@test it should be able to be inserted in DOM when the router is not present']() {
      this.addTemplate('application', `<LinkTo @route='index'>Go to Index</LinkTo>`);

      await this.visit('/');

      this.assertText('Go to Index');
    }

    async ['@test it re-renders when title changes']() {
      let controller;

      this.addTemplate('application', `<LinkTo @route='index'>{{this.title}}</LinkTo>`);

      this.add(
        'controller:application',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          title = 'foo';
        }
      );

      await this.visit('/');

      this.assertText('foo');

      runTask(() => set(controller, 'title', 'bar'));

      this.assertText('bar');
    }

    async ['@test it re-computes active class when params change'](assert) {
      let controller;

      this.addTemplate('application', '<LinkTo @route={{this.routeName}}>foo</LinkTo>');

      this.add(
        'controller:application',
        class extends Controller {
          constructor(...args) {
            super(...args);
            controller = this;
          }

          routeName = 'index';
        }
      );

      this.router.map(function () {
        this.route('bar', { path: '/bar' });
      });

      await this.visit('/bar');

      assert.equal(this.firstChild.classList.contains('active'), false);

      runTask(() => set(controller, 'routeName', 'bar'));

      assert.equal(this.firstChild.classList.contains('active'), true);
    }

    async ['@test able to popolate innermost dynamic segment when immediate parent route is active']() {
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

      await this.visit('/parents/1');

      this.assertText('Link To Child');
    }
  }
);

moduleFor(
  '<LinkTo /> component (rendering tests, without router)',
  class extends RenderingTestCase {
    ['@test it should be able to be inserted in DOM when the router is not present - block']() {
      this.render(`<LinkTo @route='index'>Go to Index</LinkTo>`);

      this.assertComponentElement(this.element.firstChild, {
        tagName: 'a',
        attrs: { href: '#/' },
        content: 'Go to Index',
      });
    }
  }
);

moduleFor(
  '<LinkTo /> component (rendering tests, with router not started)',
  class extends RouterNonApplicationTestCase {
    constructor(...args) {
      super(...args);

      this.resolver.add('router:main', Router.extend(this.routerOptions));

      this.router.map(function () {
        this.route('dynamicWithChild', { path: '/dynamic-with-child/:dynamic_id' }, function () {
          this.route('child');
        });
      });
    }

    get routerOptions() {
      return {
        location: 'none',
      };
    }

    get router() {
      return this.owner.resolveRegistration('router:main');
    }

    ['@test it should be able to be inserted in DOM when initial transition not started']() {
      this.render(`<LinkTo @route="dynamicWithChild.child">Link</LinkTo>`);

      this.assertComponentElement(this.element.firstChild, {
        tagName: 'a',
        attrs: {
          href: null,
        },
        content: 'Link',
      });
    }

    ['@test it should be able to be inserted in DOM with valid href when complete models are passed even if initial transition is not started']() {
      this.render(`<LinkTo @route="dynamicWithChild.child" @model="1">Link</LinkTo>`);

      this.assertComponentElement(this.element.firstChild, {
        tagName: 'a',
        attrs: {
          href: '/dynamic-with-child/1/child',
        },
        content: 'Link',
      });
    }
  }
);
