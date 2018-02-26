import {
  Controller,
  Service
} from 'ember-runtime';
import Ember from 'ember';
import { run } from 'ember-metal';
import { jQuery } from 'ember-views';
import { QueryParamTestCase, moduleFor } from 'internal-test-helpers';

moduleFor('Query Params - shared service state', class extends QueryParamTestCase {

  boot() {
    this.setupApplication();
    return this.visitApplication();
  }

  setupApplication() {
    this.router.map(function() {
      this.route('home', { path: '/' });
      this.route('dashboard');
    });

    this.add('service:filters', Service.extend({
      shared: true
    }));

    this.add('controller:home', Controller.extend({
      filters: Ember.inject.service()
    }));

    this.add('controller:dashboard', Controller.extend({
      filters: Ember.inject.service(),
      queryParams: [
        { 'filters.shared': 'shared' }
      ]
    }));

    this.addTemplate('application', `{{link-to 'Home' 'home' }} <div> {{outlet}} </div>`);
    this.addTemplate('home', `{{link-to 'Dashboard' 'dashboard' }}{{input type="checkbox" id='filters-checkbox' checked=(mut filters.shared) }}`);
    this.addTemplate('dashboard', `{{link-to 'Home' 'home' }}`);
  }
  visitApplication() {
    return this.visit('/');
  }

  ['@test can modify shared state before transition'](assert) {
    assert.expect(1);

    return this.boot().then(() => {
      this.$input = jQuery('#filters-checkbox');

      // click the checkbox once to set filters.shared to false
      run(this.$input, 'click');

      return this.visit('/dashboard').then(() => {
        assert.ok(true, 'expecting navigating to dashboard to succeed');
      });
    });
  }

  ['@test can modify shared state back to the default value before transition'](assert) {
    assert.expect(1);

    return this.boot().then(() => {
      this.$input = jQuery('#filters-checkbox');

      // click the checkbox twice to set filters.shared to false and back to true
      run(this.$input, 'click');
      run(this.$input, 'click');

      return this.visit('/dashboard').then(() => {
        assert.ok(true, 'expecting navigating to dashboard to succeed');
      });
    });
  }
});
