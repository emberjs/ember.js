import { compile } from '../utils/helpers';
import {
  compile as htmlbarsCompile
} from 'htmlbars-compiler/compiler';
import VERSION from 'ember/version';

import { test, testModule } from 'internal-test-helpers/tests/skip-if-glimmer';

testModule('ember-template-compiler: compile');

test('includes the current revision in the compiled template', function() {
  let templateString = '{{foo}} -- {{some-bar blah=\'foo\'}}';

  let actual = compile(templateString);

  equal(actual.meta.revision, 'Ember@' + VERSION, 'revision is included in generated template');
});

test('the template revision is different than the HTMLBars default revision', function() {
  let templateString = '{{foo}} -- {{some-bar blah=\'foo\'}}';

  let actual = compile(templateString);
  let expected = htmlbarsCompile(templateString);

  ok(actual.meta.revision !== expected.meta.revision, 'revision differs from default');
});
