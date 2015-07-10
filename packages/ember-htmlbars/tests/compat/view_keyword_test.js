import EmberComponent from 'ember-views/components/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import compile from 'ember-template-compiler/system/compile';

import { registerAstPlugin, removeAstPlugin } from 'ember-htmlbars/tests/utils';
import DeprecateViewAndControllerPaths from 'ember-template-compiler/plugins/deprecate-view-and-controller-paths';

let component;

QUnit.module('ember-htmlbars: compat - view keyword (use as a path)', {
  setup() {
    registerAstPlugin(DeprecateViewAndControllerPaths);
    component = null;
  },
  teardown() {
    runDestroy(component);
    removeAstPlugin(DeprecateViewAndControllerPaths);
  }
});

QUnit.test('reading the view keyword is deprecated [DEPRECATED]', function() {
  var text = 'a-prop';
  expectDeprecation(function() {
    component = EmberComponent.extend({
      prop: text,
      layout: compile('{{view.prop}}')
    }).create();

    runAppend(component);
  }, /Using `{{view}}` or any path based on it .* has been deprecated./);

  equal(component.$().text(), text, 'view keyword is read');
});

