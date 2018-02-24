import {
  moduleFor,
  AutobootApplicationTestCase
} from 'internal-test-helpers';
import Test from '../test';

import {
  A as emberA
} from 'ember-runtime';
import { Route } from 'ember-routing';
import { jQueryDisabled } from 'ember-views';

moduleFor('ember-testing Integration tests of acceptance', class extends AutobootApplicationTestCase {

  constructor() {
    super();

    this.modelContent = [];
    this._originalAdapter = Test.adapter;

    this.runTask(() => {
      this.createApplication();

      this.addTemplate('people', `
        <div>
          {{#each model as |person|}}
            <div class="name">{{person.firstName}}</div>
          {{/each}}
        </div>
      `);

      this.router.map(function() {
        this.route('people', { path: '/' });
      });

      this.add('route:people', Route.extend({
        model: () => this.modelContent
      }));

      this.application.setupForTesting();
    });

    this.runTask(() => {
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
      this.runTask(() => this.application.advanceReadiness());
      window.visit('/').then(() => {
        let rows = window.find('.name').length;
        assert.equal(
          rows, 0,
          'successfully stubbed an empty array of people'
        );
      });
    } else {
      this.runTask(() => this.application.advanceReadiness());
      window.visit('/').then(() => {
        expectAssertion(() => window.find('.name'), 
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

      this.runTask(() => this.application.advanceReadiness());
      window.visit('/').then(() => {
        let rows = window.find('.name').length;
        assert.equal(
          rows, 2,
          'successfully stubbed a non empty array of people'
        );
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
          rows, 0,
          'stubbed an empty array of people without calling advanceReadiness.'
        );
      });
    } else {
      assert.expect(0);
    }
  }

});
