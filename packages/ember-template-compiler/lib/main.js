import _Ember from 'ember-metal';
import precompile from 'ember-template-compiler/system/precompile';
import compile from 'ember-template-compiler/system/compile';
import template from 'ember-template-compiler/system/template';
import { registerPlugin } from 'ember-template-compiler/plugins';

import TransformOldBindingSyntax from 'ember-template-compiler/plugins/transform-old-binding-syntax';
import TransformOldClassBindingSyntax from 'ember-template-compiler/plugins/transform-old-class-binding-syntax';
import TransformItemClass from 'ember-template-compiler/plugins/transform-item-class';
import TransformComponentAttrsIntoMut from 'ember-template-compiler/plugins/transform-component-attrs-into-mut';
import TransformComponentCurlyToReadonly from 'ember-template-compiler/plugins/transform-component-curly-to-readonly';
import TransformAngleBracketComponents from 'ember-template-compiler/plugins/transform-angle-bracket-components';
import TransformInputOnToOnEvent from 'ember-template-compiler/plugins/transform-input-on-to-onEvent';
import TransformTopLevelComponents from 'ember-template-compiler/plugins/transform-top-level-components';
import TransformEachIntoCollection from 'ember-template-compiler/plugins/transform-each-into-collection';
import TransformUnescapedInlineLinkTo from 'ember-template-compiler/plugins/transform-unescaped-inline-link-to';
import AssertNoViewAndControllerPaths from 'ember-template-compiler/plugins/assert-no-view-and-controller-paths';
import AssertNoViewHelper from 'ember-template-compiler/plugins/assert-no-view-helper';

// used for adding Ember.Handlebars.compile for backwards compat
import 'ember-template-compiler/compat';

registerPlugin('ast', TransformOldBindingSyntax);
registerPlugin('ast', TransformOldClassBindingSyntax);
registerPlugin('ast', TransformItemClass);
registerPlugin('ast', TransformComponentAttrsIntoMut);
registerPlugin('ast', TransformComponentCurlyToReadonly);
registerPlugin('ast', TransformAngleBracketComponents);
registerPlugin('ast', TransformInputOnToOnEvent);
registerPlugin('ast', TransformTopLevelComponents);
registerPlugin('ast', TransformUnescapedInlineLinkTo);

if (_Ember.ENV._ENABLE_LEGACY_VIEW_SUPPORT) {
  registerPlugin('ast', TransformEachIntoCollection);
} else {
  registerPlugin('ast', AssertNoViewAndControllerPaths);
  registerPlugin('ast', AssertNoViewHelper);
}


export {
  _Ember,
  precompile,
  compile,
  template,
  registerPlugin
};
