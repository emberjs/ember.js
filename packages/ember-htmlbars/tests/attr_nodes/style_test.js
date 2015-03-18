import EmberView from "ember-views/views/view";
import compile from "ember-template-compiler/system/compile";
import { SafeString } from "ember-htmlbars/utils/string";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view;

QUnit.module("ember-htmlbars: style attribute", {
  teardown() {
    runDestroy(view);
  }
});

if (Ember.FEATURES.isEnabled('ember-htmlbars-attribute-syntax')) {
// jscs:disable validateIndentation

QUnit.test('specifying `<div style="width: {{userValue}}></div>` is [DEPRECATED]', function() {
  view = EmberView.create({
    userValue: '42',
    template: compile('<div style="width: {{view.userValue}}"></div>')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, /Dynamic content in the `style` attribute is not escaped and may pose a security risk. Please preform a security audit and once verified change from `<div style="foo: {{property}}">` to `<div style="foo: {{{property}}}">/);
});

QUnit.test('specifying `<div style="width: {{{userValue}}}></div>` works properly', function() {
  view = EmberView.create({
    userValue: '42',
    template: compile('<div style="width: {{view.userValue}}"></div>')
  });

  expectNoDeprecation(function() {
    runAppend(view);
  });
});

QUnit.test('specifying `<div style="width: {{userValue}}></div>` works properly with a SafeString', function() {
  view = EmberView.create({
    userValue: new SafeString('42'),
    template: compile('<div style="width: {{view.userValue}}"></div>')
  });

  expectNoDeprecation(function() {
    runAppend(view);
  });
});

// jscs:enable validateIndentation
}
