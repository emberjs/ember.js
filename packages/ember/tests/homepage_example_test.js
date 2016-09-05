import { Route } from 'ember-routing';
import { run, computed } from 'ember-metal';
import { Application } from 'ember-application';
import { Object as EmberObject, A as emberA } from 'ember-runtime';
import { compile } from 'ember-template-compiler';
import { jQuery } from 'ember-views';
import { setTemplates, setTemplate } from 'ember-glimmer';

let App, $fixture;

function setupExample() {
  // setup templates
  setTemplate('application', compile('{{outlet}}'));
  setTemplate('index', compile('<h1>People</h1><ul>{{#each model as |person|}}<li>Hello, <b>{{person.fullName}}</b>!</li>{{/each}}</ul>'));

  App.Person = EmberObject.extend({
    firstName: null,
    lastName: null,

    fullName: computed('firstName', 'lastName', function() {
      return this.get('firstName') + ' ' + this.get('lastName');
    })
  });

  App.IndexRoute = Route.extend({
    model() {
      let people = emberA([
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
    run(() => {
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
    run(() => App.destroy());

    App = null;

    setTemplates({});
  }
});


QUnit.test('The example renders correctly', function() {
  run(App, 'advanceReadiness');

  equal($fixture.find('h1:contains(People)').length, 1);
  equal($fixture.find('li').length, 2);
  equal($fixture.find('li:nth-of-type(1)').text(), 'Hello, Tom Dale!');
  equal($fixture.find('li:nth-of-type(2)').text(), 'Hello, Yehuda Katz!');
});
