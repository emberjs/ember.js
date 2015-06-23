import Ember from 'ember-metal/core';
import run from 'ember-metal/run_loop';
import EmberObject from 'ember-runtime/system/object';
import ArrayController, { arrayControllerDeprecation } from 'ember-runtime/controllers/array_controller';
import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import Test from 'ember-testing/test';
import EmberRoute from 'ember-routing/system/route';
import EmberApplication from 'ember-application/system/application';
import compile from 'ember-template-compiler/system/compile';

import 'ember-application';

var App, find, visit;
var originalAdapter = Test.adapter;

QUnit.module('ember-testing Integration', {
  setup() {
    jQuery('<div id="ember-testing-container"><div id="ember-testing"></div></div>').appendTo('body');
    run(function() {
      App = EmberApplication.create({
        rootElement: '#ember-testing'
      });

      App.Router.map(function() {
        this.route('people', { path: '/' });
      });

      App.PeopleRoute = EmberRoute.extend({
        model() {
          return App.Person.find();
        }
      });

      App.PeopleView = EmberView.extend({
        defaultTemplate: compile('{{#each model as |person|}}<div class="name">{{person.firstName}}</div>{{/each}}')
      });

      App.PeopleController = ArrayController.extend({});

      App.Person = EmberObject.extend({
        firstName: ''
      });

      App.Person.reopenClass({
        find() {
          return Ember.A();
        }
      });

      App.ApplicationView = EmberView.extend({
        defaultTemplate: compile('{{outlet}}')
      });

      App.setupForTesting();
    });

    run(function() {
      App.reset();
    });

    App.injectTestHelpers();

    find = window.find;
    visit = window.visit;
  },

  teardown() {
    App.removeTestHelpers();
    jQuery('#ember-testing-container, #ember-testing').remove();
    run(App, App.destroy);
    App = null;
    Test.adapter = originalAdapter;
  }
});

QUnit.test('template is bound to empty array of people', function() {
  App.Person.find = function() {
    return Ember.A();
  };
  run(App, 'advanceReadiness');
  visit('/').then(function() {
    var rows = find('.name').length;
    equal(rows, 0, 'successfully stubbed an empty array of people');
  });
});

QUnit.test('template is bound to array of 2 people', function() {
  expectDeprecation(arrayControllerDeprecation);
  App.Person.find = function() {
    var people = Ember.A();
    var first = App.Person.create({ firstName: 'x' });
    var last = App.Person.create({ firstName: 'y' });
    run(people, people.pushObject, first);
    run(people, people.pushObject, last);
    return people;
  };
  run(App, 'advanceReadiness');
  visit('/').then(function() {
    var rows = find('.name').length;
    equal(rows, 2, 'successfully stubbed a non empty array of people');
  });
});

QUnit.test('template is again bound to empty array of people', function() {
  App.Person.find = function() {
    return Ember.A();
  };
  run(App, 'advanceReadiness');
  visit('/').then(function() {
    var rows = find('.name').length;
    equal(rows, 0, 'successfully stubbed another empty array of people');
  });
});

QUnit.test('`visit` can be called without advancedReadiness.', function() {
  App.Person.find = function() {
    return Ember.A();
  };

  visit('/').then(function() {
    var rows = find('.name').length;
    equal(rows, 0, 'stubbed an empty array of people without calling advancedReadiness.');
  });
});
