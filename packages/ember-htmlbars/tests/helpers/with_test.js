import Ember from 'ember-metal/core';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

var view, lookup;
var originalLookup = Ember.lookup;

QUnit.module('Handlebars {{#with this as |foo|}}');

QUnit.module('{{#with}} helper binding to view keyword', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };

    view = EmberView.create({
      template: compile('We have: {{#with view.thing as |fromView|}}{{fromView.name}} and {{fromContext.name}}{{/with}}'),
      thing: { name: 'this is from the view' },
      context: {
        fromContext: { name: 'this is from the context' }
      }
    });

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    Ember.lookup = originalLookup;
  }
});

QUnit.test('{{with}} helper can bind to keywords with \'as\'', function() {
  equal(view.$().text(), 'We have: this is from the view and this is from the context', 'should render');
});
