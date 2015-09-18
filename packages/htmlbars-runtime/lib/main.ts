import hooks from './htmlbars-runtime/hooks';
import render from './htmlbars-runtime/render';
import { manualElement } from './htmlbars-runtime/render';
import { validateChildMorphs, visitChildren } from "../htmlbars-util/morph-utils";
import {
  hostBlock,
  continueBlock,
  hostYieldWithShadowTemplate
} from 'htmlbars-runtime/hooks';

var internal = {
  manualElement: manualElement,
  hostBlock: hostBlock,
  continueBlock: continueBlock,
  hostYieldWithShadowTemplate: hostYieldWithShadowTemplate,
  visitChildren: visitChildren,
  validateChildMorphs: validateChildMorphs
};

export {
  hooks,
  render,
  internal
};

export { default as Template } from './htmlbars-runtime/template';
