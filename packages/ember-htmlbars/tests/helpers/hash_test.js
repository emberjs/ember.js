import EmberView from 'ember-views/views/view';
import isEnabled from 'ember-metal/features';
import run from 'ember-metal/run_loop';
import { set } from 'ember-metal/property_set';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

var view;

if (isEnabled('ember-contextual-components')) {
  QUnit.module('hash helper', {
    setup() {
    },

    teardown() {
      runDestroy(view);
    }
  });

  QUnit.test('returns a hash with the right key-value', function() {
    view = EmberView.create({
      template: compile('{{#with (hash name="Sergio") as |person|}}{{person.name}}{{/with}}')
    });

    runAppend(view);

    equal(view.$().text(), 'Sergio', 'shows literal value');
  });

  QUnit.test('can have more than one key-value', function() {
    view = EmberView.create({
      template: compile('{{#with (hash name="Sergio" lastName="Arbeo") as |person|}}{{person.name}} {{person.lastName}}{{/with}}')
    });

    runAppend(view);

    equal(view.$().text(), 'Sergio Arbeo', 'shows both literal values');
  });

  QUnit.test('binds values when variables are used', function() {
    view = EmberView.create({
      template: compile('{{#with (hash name=firstName lastName="Arbeo") as |person|}}{{person.name}} {{person.lastName}}{{/with}}'),

      context: {
        firstName: 'Marisa'
      }
    });

    runAppend(view);

    // Hello, mom
    equal(view.$().text(), 'Marisa Arbeo', 'shows original variable value');

    run(function() {
      set(view, 'context.firstName', 'Sergio');
    });

    equal(view.$().text(), 'Sergio Arbeo', 'shows new variable value');
  });

  QUnit.test('hash helpers can be nested', function() {
    view = EmberView.create({
      template: compile('{{#with (hash person=(hash name=firstName)) as |ctx|}}{{ctx.person.name}}{{/with}}'),
      context: {
        firstName: 'Balint'
      }
    });

    runAppend(view);

    equal(view.$().text(), 'Balint', 'it gets the value from a nested hash');
  });
}
