import { moduleFor, ApplicationTestCase, RenderingTestCase, runTask } from 'internal-test-helpers';

import Controller from '@ember/controller';
import { set } from '@ember/-internals/metal';
import { LinkComponent } from '@ember/-internals/glimmer';
import { DEBUG } from '@glimmer/env';

moduleFor(
  '{{link-to}} component (rendering tests)',
  class extends ApplicationTestCase {
    [`@test it throws a useful error if you invoke it wrong`](assert) {
      assert.expect(1);

      expectAssertion(() => {
        this.addTemplate('application', `{{#link-to}}Index{{/link-to}}`);
      }, /You must provide one or more parameters to the `{{link-to}}` component\. \('my-app\/templates\/application\.hbs' @ L1:C0\)/);
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

    async ['@test [DEPRECATED] escaped inline form (double curlies) escapes link title']() {
      expectDeprecation(() => {
        this.addTemplate('application', `{{link-to this.title 'index'}}`);
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      this.add(
        'controller:application',
        class extends Controller {
          title = '<b>blah</b>';
        }
      );

      await this.visit('/');

      this.assertText('<b>blah</b>');
    }

    async ['@test [DEPRECATED] unescaped inline form (triple curlies) does not escape link title'](
      assert
    ) {
      expectDeprecation(() => {
        this.addTemplate('application', `{{{link-to this.title 'index'}}}`);
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      this.add(
        'controller:application',
        class extends Controller {
          title = '<b>blah</b>';
        }
      );

      await this.visit('/');

      this.assertText('blah');
      assert.equal(this.$('b').length, 1);
    }

    async ['@test able to safely extend the built-in component and use the normal path']() {
      this.addComponent('custom-link-to', {
        ComponentClass: class extends LinkComponent {},
      });

      this.addTemplate(
        'application',
        `{{#custom-link-to route='index'}}{{this.title}}{{/custom-link-to}}`
      );

      this.add(
        'controller:application',
        class extends Controller {
          title = 'Hello';
        }
      );

      await this.visit('/');

      this.assertText('Hello');
    }

    async ['@test [DEPRECATED] [GH#13432] able to safely extend the built-in component and invoke it inline']() {
      this.addComponent('custom-link-to', {
        ComponentClass: class extends LinkComponent {},
      });

      this.addTemplate('application', `{{custom-link-to this.title 'index'}}`);

      this.add(
        'controller:application',
        class extends Controller {
          title = 'Hello';
        }
      );

      await expectDeprecationAsync(
        () => this.visit('/'),
        /Invoking the `<LinkTo>` component with positional arguments is deprecated/
      );

      this.assertText('Hello');
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

    ['@test [DEPRECATED] it should be able to be inserted in DOM when the router is not present - inline']() {
      expectDeprecation(() => {
        this.render(`{{link-to 'Go to Index' 'index'}}`);
      }, /Invoking the `<LinkTo>` component with positional arguments is deprecated/);

      this.assertText('Go to Index');
    }
  }
);
