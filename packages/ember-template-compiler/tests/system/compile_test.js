import { compile } from '../utils/helpers';
import {
  compile as htmlbarsCompile
} from 'htmlbars-compiler/compiler';
import VERSION from 'ember/version';

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('ember-template-compiler: compile');

test('compiles the provided template with htmlbars', function() {
  var templateString = '{{foo}} -- {{some-bar blah=\'foo\'}}';

  var actual = compile(templateString);
  var expected = htmlbarsCompile(templateString);

  equal(actual.toString(), expected.toString(), 'compile function matches content with htmlbars compile');
});

test('includes the current revision in the compiled template', function() {
  var templateString = '{{foo}} -- {{some-bar blah=\'foo\'}}';

  var actual = compile(templateString);

  equal(actual.meta.revision, 'Ember@' + VERSION, 'revision is included in generated template');
});

test('the template revision is different than the HTMLBars default revision', function() {
  var templateString = '{{foo}} -- {{some-bar blah=\'foo\'}}';

  var actual = compile(templateString);
  var expected = htmlbarsCompile(templateString);

  ok(actual.meta.revision !== expected.meta.revision, 'revision differs from default');
});

