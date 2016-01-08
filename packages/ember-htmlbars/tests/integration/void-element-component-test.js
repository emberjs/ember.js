import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

var owner, view;

QUnit.module('ember-htmlbars: components for void elements', {
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

QUnit.test('a void element does not have childNodes', function() {
  var component;
  owner.register('component:x-foo', Component.extend({
    tagName: 'input',

    init() {
      this._super(...arguments);
      component = this;
    }
  }));

  view = EmberView.create({
    [OWNER]: owner,
    template: compile('{{x-foo}}')
  });

  runAppend(view);

  deepEqual(component.element.childNodes.length, 0, 'no childNodes are added for `<input>`');
});
