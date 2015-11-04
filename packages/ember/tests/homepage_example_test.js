import Ember from 'ember-metal/core'; // TEMPLATES
import Route from 'ember-routing/system/route';
import run from 'ember-metal/run_loop';
import Application from 'ember-application/system/application';
import EmberObject from 'ember-runtime/system/object';
import { computed } from 'ember-metal/computed';
import { compile } from 'ember-template-compiler';
import jQuery from 'ember-views/system/jquery';
import { A as emberA } from 'ember-runtime/system/native_array';

var App, $fixture;

function setupExample() {
  // setup templates
  Ember.TEMPLATES.application = compile('{{outlet}}');
  Ember.TEMPLATES.index = compile('<h1>People</h1><ul>{{#each model as |person|}}<li>Hello, <b>{{person.fullName}}</b>!</li>{{/each}}</ul>');


  App.Person = EmberObject.extend({
    firstName: null,
    lastName: null,

    fullName: computed('firstName', 'lastName', function() {
      return this.get('firstName') + ' ' + this.get('lastName');
    })
  });

  App.IndexRoute = Route.extend({
    model() {
      var people = emberA([
        App.Person.create({
          firstName: 'Tom',
          lastName: 'Dale'
        }),
        App.Person.create({
          firstName: 'Yehuda',
          lastName: 'Katz'
        })
      ]);
      return people;
    }
  });
}

QUnit.module('Homepage Example', {
  setup() {
    run(function() {
      App = Application.create({
        name: 'App',
        rootElement: '#qunit-fixture'
      });
      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      App.LoadingRoute = Route.extend();
    });

    $fixture = jQuery('#qunit-fixture');
    setupExample();
  },

  teardown() {
    run(function() {
      App.destroy();
    });

    App = null;

    Ember.TEMPLATES = {};
  }
});


QUnit.test('The example renders correctly', function() {
  run(App, 'advanceReadiness');

  equal($fixture.find('h1:contains(People)').length, 1);
  equal($fixture.find('li').length, 2);
  equal($fixture.find('li:nth-of-type(1)').text(), 'Hello, Tom Dale!');
  equal($fixture.find('li:nth-of-type(2)').text(), 'Hello, Yehuda Katz!');
});
