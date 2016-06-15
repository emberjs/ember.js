import { compile } from './utils/helpers';
import defaultEnv from 'ember-htmlbars/env';
import { domHelper } from 'ember-htmlbars/env';
import { equalHTML } from 'htmlbars-test-helpers';
import assign from 'ember-metal/assign';

QUnit.module('ember-htmlbars: main');

QUnit.test('HTMLBars is present and can be executed', function() {
  let template = compile('ohai');

  let env = assign({ dom: domHelper }, defaultEnv);

  let output = template.render({}, env, { contextualElement: document.body }).fragment;
  equalHTML(output, 'ohai');
});

