import run from 'ember-metal/run_loop';
import EmberObject from 'ember-runtime/system/object';
import jQuery from 'ember-views/system/jquery';
import EmberView from 'ember-views/views/view';
import Test from 'ember-testing/test';
import EmberRoute from 'ember-routing/system/route';
import EmberApplication from 'ember-application/system/application';
import { compile } from 'ember-htmlbars-template-compiler';
import Controller from 'ember-runtime/controllers/controller';
import { A as emberA } from 'ember-runtime/system/native_array';

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

      App.PeopleController = Controller.extend({});

      App.Person = EmberObject.extend({
        firstName: ''
      });

      App.Person.reopenClass({
        find() {
          return emberA();
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
    return emberA();
  };
  run(App, 'advanceReadiness');
  visit('/').then(function() {
    var rows = find('.name').length;
    equal(rows, 0, 'successfully stubbed an empty array of people');
  });
});

import { test } from 'ember-glimmer/tests/utils/skip-if-glimmer';

test('template is bound to array of 2 people', function() {
  App.Person.find = function() {
    var people = emberA();
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
    return emberA();
  };
  run(App, 'advanceReadiness');
  visit('/').then(function() {
    var rows = find('.name').length;
    equal(rows, 0, 'successfully stubbed another empty array of people');
  });
});

QUnit.test('`visit` can be called without advancedReadiness.', function() {
  App.Person.find = function() {
    return emberA();
  };

  visit('/').then(function() {
    var rows = find('.name').length;
    equal(rows, 0, 'stubbed an empty array of people without calling advancedReadiness.');
  });
});
