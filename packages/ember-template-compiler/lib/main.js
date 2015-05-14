import _Ember from "ember-metal/core";
import precompile from "ember-template-compiler/system/precompile";
import compile from "ember-template-compiler/system/compile";
import template from "ember-template-compiler/system/template";
import { registerPlugin } from "ember-template-compiler/plugins";

import TransformEachInToBlockParams from "ember-template-compiler/plugins/transform-each-in-to-block-params";
import TransformWithAsToHash from "ember-template-compiler/plugins/transform-with-as-to-hash";
import TransformBindAttrToAttributes from "ember-template-compiler/plugins/transform-bind-attr-to-attributes";
import TransformEachIntoCollection from "ember-template-compiler/plugins/transform-each-into-collection";
import TransformSingleArgEach from "ember-template-compiler/plugins/transform-single-arg-each";
import TransformOldBindingSyntax from "ember-template-compiler/plugins/transform-old-binding-syntax";
import TransformOldClassBindingSyntax from "ember-template-compiler/plugins/transform-old-class-binding-syntax";
import TransformItemClass from "ember-template-compiler/plugins/transform-item-class";
import TransformComponentAttrsIntoMut from "ember-template-compiler/plugins/transform-component-attrs-into-mut";
import TransformComponentCurlyToReadonly from "ember-template-compiler/plugins/transform-component-curly-to-readonly";
import TransformAngleBracketComponents from "ember-template-compiler/plugins/transform-angle-bracket-components";

// used for adding Ember.Handlebars.compile for backwards compat
import "ember-template-compiler/compat";

registerPlugin('ast', TransformWithAsToHash);
registerPlugin('ast', TransformEachInToBlockParams);
registerPlugin('ast', TransformBindAttrToAttributes);
registerPlugin('ast', TransformSingleArgEach);
registerPlugin('ast', TransformEachIntoCollection);
registerPlugin('ast', TransformOldBindingSyntax);
registerPlugin('ast', TransformOldClassBindingSyntax);
registerPlugin('ast', TransformItemClass);
registerPlugin('ast', TransformComponentAttrsIntoMut);
registerPlugin('ast', TransformComponentCurlyToReadonly);
registerPlugin('ast', TransformAngleBracketComponents);

export {
  _Ember,
  precompile,
  compile,
  template,
  registerPlugin
};
