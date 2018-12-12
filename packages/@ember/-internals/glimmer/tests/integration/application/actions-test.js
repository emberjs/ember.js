import { moduleFor, ApplicationTestCase, RenderingTestCase } from 'internal-test-helpers';

import Controller from '@ember/controller';
import { getDebugFunction, setDebugFunction } from '@ember/debug';

import { Component } from '../../utils/helpers';

const originalDebug = getDebugFunction('debug');
const noop = function() {};

moduleFor(
  'Application test: actions',
  class extends ApplicationTestCase {
    constructor() {
      setDebugFunction('debug', noop);
      super(...arguments);
    }

    teardown() {
      setDebugFunction('debug', originalDebug);
    }

    ['@test actions in top level template application template target application controller'](
      assert
    ) {
      assert.expect(1);

      this.add(
        'controller:application',
        Controller.extend({
          actions: {
            handleIt() {
              assert.ok(true, 'controller received action properly');
            },
          },
        })
      );

      this.addTemplate(
        'application',
        '<button id="handle-it" {{action "handleIt"}}>Click!</button>'
      );

      return this.visit('/').then(() => {
        this.runTask(() => this.$('#handle-it').click());
      });
    }

    ['@test actions in nested outlet template target their controller'](assert) {
      assert.expect(1);

      this.add(
        'controller:application',
        Controller.extend({
          actions: {
            handleIt() {
              assert.ok(false, 'application controller should not have received action!');
            },
          },
        })
      );

      this.add(
        'controller:index',
        Controller.extend({
          actions: {
            handleIt() {
              assert.ok(true, 'controller received action properly');
            },
          },
        })
      );

      this.addTemplate('index', '<button id="handle-it" {{action "handleIt"}}>Click!</button>');

      return this.visit('/').then(() => {
        this.runTask(() => this.$('#handle-it').click());
      });
    }
  }
);

moduleFor(
  'Rendering test: non-interactive actions',
  class extends RenderingTestCase {
    getBootOptions() {
      return { isInteractive: false };
    }

    [`@test doesn't attatch actions`](assert) {
      this.registerComponent('foo-bar', {
        ComponentClass: Component.extend({
          actions: {
            fire() {
              assert.ok(false);
            },
          },
        }),
        template: `<button {{action 'fire'}}>Fire!</button>`,
      });

      this.render('{{foo-bar tagName=""}}');

      this.assertHTML('<button>Fire!</button>');

      this.$('button').click();
    }
  }
);
