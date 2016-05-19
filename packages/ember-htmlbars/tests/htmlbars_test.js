import { compile } from './utils/helpers';
import defaultEnv from 'ember-htmlbars/env';
import { domHelper } from 'ember-htmlbars/env';
import { equalHTML } from 'htmlbars-test-helpers';
import assign from 'ember-metal/assign';

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('ember-htmlbars: main');

test('HTMLBars is present and can be executed', function() {
  var template = compile('ohai');

  var env = assign({ dom: domHelper }, defaultEnv);

  var output = template.render({}, env, { contextualElement: document.body }).fragment;
  equalHTML(output, 'ohai');
});

