import { moduleFor, ApplicationTestCase, RenderingTestCase, runTask } from 'internal-test-helpers';

import Controller from '@ember/controller';
import { set } from '@ember/object';
import { DEBUG } from '@glimmer/env';

moduleFor(
  '{{link-to}} component (rendering tests)',
  class extends ApplicationTestCase {
    async [`@test it throws a useful error if you invoke it wrong`](assert) {
      this.addTemplate('application', `{{#link-to}}Index{{/link-to}}`);

      if (DEBUG) {
        await assert.rejects(
          this.visit('/'),
          /You must provide at least one of the `@route`, `@model`, `@models` or `@query` arguments to `<LinkTo>`./
        );
      } else {
        assert.expect(0);
      }
    }

    async [`@test it throws a useful error if you pass the href argument`](assert) {
      this.addTemplate('application', `{{#link-to href="nope" route="index"}}Index{{/link-to}}`);

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
      this.addTemplate('application', `{{#link-to route='index'}}Go to Index{{/link-to}}`);

      await this.visit('/');

      this.assertText('Go to Index');
    }

    async ['@test it re-renders when title changes']() {
      let controller;

      this.addTemplate('application', `{{#link-to route='index'}}{{this.title}}{{/link-to}}`);

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

      this.addTemplate('application', '{{#link-to route=this.routeName}}foo{{/link-to}}');

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
  }
);

moduleFor(
  '{{link-to}} component (rendering tests, without router)',
  class extends RenderingTestCase {
    ['@test it should be able to be inserted in DOM when the router is not present - block']() {
      this.render(`{{#link-to route='index'}}Go to Index{{/link-to}}`);

      this.assertText('Go to Index');
    }
  }
);
