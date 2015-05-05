import run from 'ember-metal/run_loop';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

import { set } from 'ember-metal/property_set';

var view;

QUnit.module('ember-htmlbars: {{#with}} and {{#view}} integration', {
  teardown() {
    runDestroy(view);
  }
});

QUnit.test('can properly re-render an if/else with attribute morphs', function() {
  view = EmberView.create({
    trueClass: 'truthy',
    falseClass: 'falsey',
    switch: true,

    template: compile('{{#if view.switch}}<div class={{view.trueClass}}>Truthy</div>{{else}}<div class={{view.falseClass}}>Falsey</div>{{/if}}')
  });

  runAppend(view);

  equal(view.$('.truthy').length, 1, 'template block rendered properly');

  run(function() {
    set(view, 'switch', false);
  });

  equal(view.$('.falsey').length, 1, 'inverse block rendered properly');
});
