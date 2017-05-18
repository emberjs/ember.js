import { guidFor } from 'ember-utils';
import { ENV, context } from 'ember-environment'; // lookup, etc
import { run } from 'ember-metal';
import Application from '../../../system/application';
import { Object as EmberObject } from 'ember-runtime';
import DefaultResolver from '../../../system/resolver';

let originalLookup, App;

QUnit.module('Ember.Application Dependency Injection – toString', {
  setup() {
    originalLookup = context.lookup;

    run(() => {
      App = Application.create();
      context.lookup = {
        App: App
      };
    });

    App.Post = EmberObject.extend();
  },

  teardown() {
    context.lookup = originalLookup;
    run(App, 'destroy');
  }
});

QUnit.test('factories', function() {
  let PostFactory;
  PostFactory = App.__container__.factoryFor('model:post').class;
  equal(PostFactory.toString(), 'App.Post', 'expecting the model to be post');
});

QUnit.test('instances', function() {
  let post = App.__container__.lookup('model:post');
  let guid = guidFor(post);

  equal(post.toString(), '<App.Post:' + guid + '>', 'expecting the model to be post');
});

QUnit.test('with a custom resolver', function() {
  run(App, 'destroy');

  run(() => {
    App = Application.create({
      Resolver: DefaultResolver.extend({
        makeToString(factory, fullName) {
          return fullName;
        }
      })
    });
  });

  App.register('model:peter', EmberObject.extend());

  let peter = App.__container__.lookup('model:peter');
  let guid = guidFor(peter);

  equal(peter.toString(), '<model:peter:' + guid + '>', 'expecting the supermodel to be peter');
});
