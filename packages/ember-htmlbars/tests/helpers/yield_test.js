import EmberView from 'ember-views/views/view';
import Component from 'ember-htmlbars/component';
import ComponentLookup from 'ember-views/component_lookup';

import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';
import buildOwner from 'container/tests/test-helpers/build-owner';


var view, owner, originalViewKeyword;

function commonSetup() {
  owner = buildOwner();
  owner.registerOptionsForType('template', { instantiate: false });
  owner.register('component-lookup:main', ComponentLookup);
}

function commonTeardown() {
  runDestroy(owner);
  owner = view = null;
}

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('ember-htmlbars: Support for {{yield}} helper', {
  setup() {
    commonSetup();
    originalViewKeyword = registerKeyword('view',  viewKeyword);
  },
  teardown() {
    runDestroy(view);
    commonTeardown();
    resetKeyword('view', originalViewKeyword);
  }
});

test('view keyword works inside component yield', function () {
  var component = Component.extend({
    layout: compile('<p>{{yield}}</p>')
  });

  view = EmberView.create({
    dummyText: 'hello',
    component: component,
    template: compile('{{#view view.component}}{{view.dummyText}}{{/view}}')
  });

  runAppend(view);

  equal(view.$('div > p').text(), 'hello', 'view keyword inside component yield block should refer to the correct view');
});
