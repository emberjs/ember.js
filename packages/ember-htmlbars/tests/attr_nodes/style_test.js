/* globals EmberDev */

import Ember from "ember-metal/core";
import EmberView from "ember-views/views/view";
import compile from "ember-template-compiler/system/compile";
import { SafeString } from "ember-htmlbars/utils/string";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import { styleWarning } from "ember-views/attr_nodes/attr_node";

var view, originalWarn, warnings;

QUnit.module("ember-htmlbars: style attribute", {
  setup() {
    warnings = [];
    originalWarn = Ember.warn;
    Ember.warn = function(message, test) {
      if (!test) {
        warnings.push(message);
      }
    };
  },

  teardown() {
    runDestroy(view);
    Ember.warn = originalWarn;
  }
});

if (Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {
// jscs:disable validateIndentation

if (!EmberDev.runningProdBuild) {
  QUnit.test('specifying `<div style={{userValue}}></div>` generates a warning', function() {
    view = EmberView.create({
      userValue: 'width: 42px',
      template: compile('<div style={{view.userValue}}></div>')
    });

    runAppend(view);

    deepEqual(warnings, [styleWarning]);
  });

  QUnit.test('specifying `attributeBindings: ["style"]` generates a warning', function() {
    view = EmberView.create({
      userValue: 'width: 42px',
      template: compile('<div style={{view.userValue}}></div>')
    });

    runAppend(view);

    deepEqual(warnings, [styleWarning]);
  });
}

QUnit.test('specifying `<div style={{{userValue}}}></div>` works properly without a warning', function() {
  view = EmberView.create({
    userValue: 'width: 42px',
    template: compile('<div style={{{view.userValue}}}></div>')
  });

  runAppend(view);

  deepEqual(warnings, [ ]);
});

QUnit.test('specifying `<div style={{userValue}}></div>` works properly with a SafeString', function() {
  view = EmberView.create({
    userValue: new SafeString('width: 42px'),
    template: compile('<div style={{view.userValue}}></div>')
  });

  runAppend(view);

  deepEqual(warnings, [ ]);
});

// jscs:enable validateIndentation
}
