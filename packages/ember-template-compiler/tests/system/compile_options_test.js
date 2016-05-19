import { defaultCompileOptions } from 'ember-template-compiler';
import TransformOldBindingSyntax from 'ember-template-compiler/plugins/transform-old-binding-syntax';
import TransformItemClass from 'ember-template-compiler/plugins/transform-item-class';
import TransformAngleBracketComponents from 'ember-template-compiler/plugins/transform-angle-bracket-components';
import TransformInputOnToOnEvent from 'ember-template-compiler/plugins/transform-input-on-to-onEvent';
import TransformTopLevelComponents from 'ember-template-compiler/plugins/transform-top-level-components';
import DeprecateRenderModel from 'ember-template-compiler/plugins/deprecate-render-model';
import PreventRenderBlock from 'ember-template-compiler/plugins/prevent-render-block';
import TransformInlineLinkTo from 'ember-template-compiler/plugins/transform-inline-link-to';
import AssertNoEachIn from 'ember-template-compiler/plugins/assert-no-each-in';

QUnit.module('ember-template-compiler: default compile options');

QUnit.test('default options are a new copy', function() {
  notEqual(defaultCompileOptions(), defaultCompileOptions());
});

QUnit.test('has default AST plugins', function() {
  let plugins = defaultCompileOptions().plugins.ast;

  deepEqual(plugins, [
    TransformOldBindingSyntax,
    TransformItemClass,
    TransformAngleBracketComponents,
    TransformInputOnToOnEvent,
    TransformTopLevelComponents,
    DeprecateRenderModel,
    PreventRenderBlock,
    AssertNoEachIn,
    TransformInlineLinkTo
  ]);
});
