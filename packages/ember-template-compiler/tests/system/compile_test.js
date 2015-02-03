import compile from "ember-template-compiler/system/compile";
import {
  compile as htmlbarsCompile
} from "htmlbars-compiler/compiler";

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
// jscs:disable validateIndentation

QUnit.module('ember-htmlbars: compile');

QUnit.test('compiles the provided template with htmlbars', function() {
  var templateString = "{{foo}} -- {{some-bar blah='foo'}}";

  var actual = compile(templateString);
  var expected = htmlbarsCompile(templateString);

  equal(actual.toString(), expected.toString(), 'compile function matches content with htmlbars compile');
});

QUnit.test('calls template on the compiled function', function() {
  var templateString = "{{foo}} -- {{some-bar blah='foo'}}";

  var actual = compile(templateString);

  ok(actual.isTop, 'sets isTop via template function');
  ok(actual.isMethod === false, 'sets isMethod via template function');
});

// jscs:enable validateIndentation
}
