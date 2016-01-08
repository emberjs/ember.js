import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, view;

QUnit.module('ember-htmlbars: component elementId', {
  setup() {
    owner = buildOwner();
    owner.registerOptionsForType('component', { singleton: false });
    owner.registerOptionsForType('view', { singleton: false });
    owner.registerOptionsForType('template', { instantiate: false });
    owner.register('component-lookup:main', ComponentLookup);
  },

  teardown() {
    runDestroy(owner);
    runDestroy(view);
    owner = view = null;
  }
});

QUnit.test('passing undefined elementId results in a default elementId', function() {
  owner.register('component:x-foo', Component.extend({
    tagName: 'h1'
  }));

  view = EmberView.create({
    [OWNER]: owner,
    template: compile('{{x-foo id=somethingUndefined}}')
  });

  runAppend(view);
  var foundId = view.$('h1').attr('id');
  ok(/^ember/.test(foundId), 'Has a reasonable id attribute (found id=' + foundId + ').');
});
