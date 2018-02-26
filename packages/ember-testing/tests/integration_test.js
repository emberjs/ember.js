import {
  moduleFor,
  AutobootApplicationTestCase
} from 'internal-test-helpers';
import Test from '../test';

import {
  Controller,
  A as emberA
} from 'ember-runtime';
import { Route } from 'ember-routing';

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
    this.runTask(() => this.application.advanceReadiness());
    window.visit('/').then(() => {
      let rows = window.find('.name').length;
      assert.equal(
        rows, 0,
        'successfully stubbed an empty array of people'
      );
    });
  }

  [`@test template is bound to array of 2 people`](assert) {
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
  }

  [`@test 'visit' can be called without advanceReadiness.`](assert) {
    window.visit('/').then(() => {
      let rows = window.find('.name').length;
      assert.equal(
        rows, 0,
        'stubbed an empty array of people without calling advanceReadiness.'
      );
    });
  }

});
