import compile from "ember-htmlbars/system/compile";
import {
  compile as htmlbarsCompile
} from "htmlbars-compiler/compiler";

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {

QUnit.module('ember-htmlbars: compile');

test('compiles the provided template with htmlbars', function() {
  var templateString = "{{foo}} -- {{some-bar blah='foo'}}";

  var actual = compile(templateString);
  var expected = htmlbarsCompile(templateString);

  equal(actual.toString(), expected.toString(), 'compile function matches content with htmlbars compile');
});

test('calls template on the compiled function', function() {
  var templateString = "{{foo}} -- {{some-bar blah='foo'}}";

  var actual = compile(templateString);

  ok(actual.isTop, 'sets isTop via template function');
  ok(actual.isMethod === false, 'sets isMethod via template function');
});

}
