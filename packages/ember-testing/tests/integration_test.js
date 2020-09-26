import { moduleFor, AutobootApplicationTestCase, runTask } from 'internal-test-helpers';
import Test from '../lib/test';

import { EMBER_ROUTING_MODEL_ARG } from '@ember/canary-features';
import { A as emberA } from '@ember/-internals/runtime';
import { Route } from '@ember/-internals/routing';
import { jQueryDisabled } from '@ember/-internals/views';

moduleFor(
  'ember-testing Integration tests of acceptance',
  class extends AutobootApplicationTestCase {
    constructor() {
      super();

      this.modelContent = [];
      this._originalAdapter = Test.adapter;

      runTask(() => {
        this.createApplication();

        if (EMBER_ROUTING_MODEL_ARG) {
          this.addTemplate(
            'people',
            `
            <div>
              {{#each @model as |person|}}
                <div class="name">{{person.firstName}}</div>
              {{/each}}
            </div>
            `
          );
        } else {
          this.addTemplate(
            'people',
            `
            <div>
              {{#each this.model as |person|}}
                <div class="name">{{person.firstName}}</div>
              {{/each}}
            </div>
            `
          );
        }

        this.router.map(function () {
          this.route('people', { path: '/' });
        });

        this.add(
          'route:people',
          Route.extend({
            model: () => this.modelContent,
          })
        );

        this.application.setupForTesting();
      });

      runTask(() => {
        this.application.reset();
      });

      this.application.injectTestHelpers();
    }

    teardown() {
      super.teardown();
      Test.adapter = this._originalAdapter;
    }

    [`@test template is bound to empty array of people`](assert) {
      if (!jQueryDisabled) {
        runTask(() => this.application.advanceReadiness());
        window.visit('/').then(() => {
          let rows = window.find('.name').length;
          assert.equal(rows, 0, 'successfully stubbed an empty array of people');
        });
      } else {
        runTask(() => this.application.advanceReadiness());
        window.visit('/').then(() => {
          expectAssertion(
            () => window.find('.name'),
            'If jQuery is disabled, please import and use helpers from @ember/test-helpers [https://github.com/emberjs/ember-test-helpers]. Note: `find` is not an available helper.'
          );
        });
      }
    }

    [`@test template is bound to array of 2 people`](assert) {
      if (!jQueryDisabled) {
        this.modelContent = emberA([]);
        this.modelContent.pushObject({ firstName: 'x' });
        this.modelContent.pushObject({ firstName: 'y' });

        runTask(() => this.application.advanceReadiness());
        window.visit('/').then(() => {
          let rows = window.find('.name').length;
          assert.equal(rows, 2, 'successfully stubbed a non empty array of people');
        });
      } else {
        assert.expect(0);
      }
    }

    [`@test 'visit' can be called without advanceReadiness.`](assert) {
      if (!jQueryDisabled) {
        window.visit('/').then(() => {
          let rows = window.find('.name').length;
          assert.equal(
            rows,
            0,
            'stubbed an empty array of people without calling advanceReadiness.'
          );
        });
      } else {
        assert.expect(0);
      }
    }
  }
);
