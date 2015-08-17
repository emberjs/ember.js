import run from 'ember-metal/run_loop';
import Component from 'ember-views/components/component';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

import { set } from 'ember-metal/property_set';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var component, originalViewKeyword;

QUnit.module('ember-htmlbars: destroy-element-hook tests', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    runDestroy(component);
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('willDestroyElement is only called once when a component leaves scope', function(assert) {
  var innerChild, innerChildDestroyed;

  component = Component.create({
    switch: true,

    layout: compile(`
     {{~#if switch~}}
       {{~#view innerChild}}Truthy{{/view~}}
     {{~/if~}}
    `),

    innerChild: Component.extend({
      init() {
        this._super(...arguments);
        innerChild = this;
      },

      willDestroyElement() {
        if (innerChildDestroyed) {
          throw new Error('willDestroyElement has already been called!!');
        } else {
          innerChildDestroyed = true;
        }
      }
    })
  });

  runAppend(component);

  assert.equal(component.$().text(), 'Truthy', 'precond - truthy template is displayed');
  assert.equal(component.get('childViews.length'), 1);

  run(function() {
    set(component, 'switch', false);
  });

  run(function() {
    assert.equal(innerChild.get('isDestroyed'), true, 'the innerChild has been destroyed');
    assert.equal(component.$().text(), '', 'truthy template is removed');
  });
});
