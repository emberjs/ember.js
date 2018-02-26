/*globals EmberDev */

import {
  moduleFor,
  ApplicationTestCase
} from 'internal-test-helpers';

import Logger from 'ember-console';
import { Controller } from 'ember-runtime';
import { Route } from 'ember-routing';
import { assign } from 'ember-utils';


class LoggingApplicationTestCase extends ApplicationTestCase {
  constructor() {
    super();

    this.logs = {};

    this._originalLogger = Logger.info;

    Logger.info = (_, {fullName}) => {
      if (!this.logs.hasOwnProperty(fullName)) {
        this.logs[fullName] = 0;
      }
      this.logs[fullName]++;
    };

    this.router.map(function() {
      this.route('posts', { resetNamespace: true });
    });
  }

  teardown() {
    Logger.info = this._originalLogger;
    super.teardown();
  }
}

moduleFor('Ember.Application with LOG_ACTIVE_GENERATION=true', class extends LoggingApplicationTestCase {

  get applicationOptions() {
    return assign(super.applicationOptions, {
      LOG_ACTIVE_GENERATION: true
    });
  }

  ['@test log class generation if logging enabled'](assert) {
    if (EmberDev && EmberDev.runningProdBuild) {
      assert.ok(true, 'Logging does not occur in production builds');
      return;
    }

    this.visit('/posts');
    assert.equal(Object.keys(this.logs).length, 4, 'expected logs');
  }

  ['@test actively generated classes get logged'](assert) {
    if (EmberDev && EmberDev.runningProdBuild) {
      assert.ok(true, 'Logging does not occur in production builds');
      return;
    }

    this.visit('/posts');
    assert.equal(this.logs['controller:application'], 1, 'expected: ApplicationController was generated');
    assert.equal(this.logs['controller:posts'], 1, 'expected: PostsController was generated');

    assert.equal(this.logs['route:application'], 1, 'expected: ApplicationRoute was generated');
    assert.equal(this.logs['route:posts'], 1, 'expected: PostsRoute was generated');
  }

  ['@test predefined classes do not get logged'](assert) {
    this.add('controller:application', Controller.extend());
    this.add('controller:posts', Controller.extend());
    this.add('route:application', Route.extend());
    this.add('route:posts', Route.extend());

    this.visit('/posts');

    assert.ok(!this.logs['controller:application'], 'did not expect: ApplicationController was generated');
    assert.ok(!this.logs['controller:posts'], 'did not expect: PostsController was generated');

    assert.ok(!this.logs['route:application'], 'did not expect: ApplicationRoute was generated');
    assert.ok(!this.logs['route:posts'], 'did not expect: PostsRoute was generated');
  }

});

moduleFor('Ember.Application when LOG_ACTIVE_GENERATION=false', class extends LoggingApplicationTestCase {

  get applicationOptions() {
    return assign(super.applicationOptions, {
      LOG_ACTIVE_GENERATION: false
    });
  }

  [`@test do NOT log class generation if logging disabled`](assert) {
    this.visit('/posts');
    assert.equal(Object.keys(this.logs).length, 0, 'expected logs');
  }

});

moduleFor('Ember.Application with LOG_VIEW_LOOKUPS=true', class extends LoggingApplicationTestCase {

  get applicationOptions() {
    return assign(super.applicationOptions, {
      LOG_VIEW_LOOKUPS: true
    });
  }

  [`@test log when template and view are missing when flag is active`](assert) {
    if (EmberDev && EmberDev.runningProdBuild) {
      assert.ok(true, 'Logging does not occur in production builds');
      return;
    }

    this.addTemplate('application', '{{outlet}}');

    this.visit('/');
    this.visit('/posts');

    assert.equal(this.logs['template:application'], undefined, 'expected: Should not log template:application since it exists.');
    assert.equal(this.logs['template:index'], 1, 'expected: Could not find "index" template or view.');
    assert.equal(this.logs['template:posts'], 1, 'expected: Could not find "posts" template or view.');
  }

});

moduleFor('Ember.Application with LOG_VIEW_LOOKUPS=false', class extends LoggingApplicationTestCase {

  get applicationOptions() {
    return assign(super.applicationOptions, {
      LOG_VIEW_LOOKUPS: false
    });
  }

  [`@test do not log when template and view are missing when flag is not true`](assert) {
    this.visit('/posts');
    assert.equal(Object.keys(this.logs).length, 0, 'expected no logs');
  }

  [`@test do not log which views are used with templates when flag is not true`](assert) {
    this.visit('/posts');
    assert.equal(Object.keys(this.logs).length, 0, 'expected no logs');
  }
});
