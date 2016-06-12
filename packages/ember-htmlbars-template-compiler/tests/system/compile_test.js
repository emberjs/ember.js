import { compile } from '../utils/helpers';

QUnit.module('ember-htmlbars: compile');

QUnit.test('calls template on the compiled function', function() {
  let templateString = '{{foo}} -- {{some-bar blah=\'foo\'}}';

  let actual = compile(templateString);

  ok(actual.isTop, 'sets isTop via template function');
  ok(actual.isMethod === false, 'sets isMethod via template function');
});

