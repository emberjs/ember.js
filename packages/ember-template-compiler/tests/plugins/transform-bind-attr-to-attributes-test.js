import { compile } from "ember-template-compiler";

QUnit.module('ember-template-compiler: transform-bind-attr-to-attributes');

QUnit.test("Using the `bind-attr` helper throws a deprecation", function() {
  expect(1);

  expectDeprecation(function() {
    compile('<div {{bind-attr class=view.foo}}></div>', {
      moduleName: 'foo/bar/baz'
    });
  }, "The `bind-attr` helper ('foo/bar/baz' @ L1:C7) is deprecated in favor of HTMLBars-style bound attributes.");
});

QUnit.test("Using the `bindAttr` helper throws a deprecation", function() {
  expect(1);

  expectDeprecation(function() {
    compile('<div {{bindAttr class=view.foo}}></div>');
  }, "The `bindAttr` helper (L1:C7) is deprecated in favor of HTMLBars-style bound attributes.");
});

QUnit.test("asserts for <div class='foo' {{bind-attr class='bar'}}></div>", function() {
  expect(1);

  expectAssertion(function() {
    ignoreDeprecation(function() {
      compile('<div class="foo" {{bind-attr class=view.foo}}></div>');
    });
  }, /You cannot set `class` manually and via `{{bind-attr}}` helper on the same element/);
});

QUnit.test("asserts for <div data-bar='foo' {{bind-attr data-bar='blah'}}></div>", function() {
  expect(1);

  expectAssertion(function() {
    ignoreDeprecation(function() {
      compile('<div data-bar="foo" {{bind-attr data-bar=view.blah}}></div>');
    });
  }, /You cannot set `data-bar` manually and via `{{bind-attr}}` helper on the same element/);
});
