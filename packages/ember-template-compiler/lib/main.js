import compile from "ember-template-compiler/system/compile";
import template from "ember-template-compiler/system/template";
import { registerPlugin } from "ember-template-compiler/plugins";

import TransformEachInToHash from "ember-template-compiler/plugins/transform-each-in-to-hash";
import TransformWithAsToHash from "ember-template-compiler/plugins/transform-with-as-to-hash";

registerPlugin('ast', TransformWithAsToHash);
registerPlugin('ast', TransformEachInToHash);

export {
  compile,
  template,
  registerPlugin
};
