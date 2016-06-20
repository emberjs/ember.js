import TransformOldBindingSyntax from 'ember-template-compiler/plugins/transform-old-binding-syntax';
import TransformItemClass from 'ember-template-compiler/plugins/transform-item-class';
import TransformAngleBracketComponents from 'ember-template-compiler/plugins/transform-angle-bracket-components';
import TransformInputOnToOnEvent from 'ember-template-compiler/plugins/transform-input-on-to-onEvent';
import TransformTopLevelComponents from 'ember-template-compiler/plugins/transform-top-level-components';
import DeprecateRenderModel from 'ember-template-compiler/plugins/deprecate-render-model';
import TransformInlineLinkTo from 'ember-template-compiler/plugins/transform-inline-link-to';
import TransformOldClassBindingSyntax from 'ember-template-compiler/plugins/transform-old-class-binding-syntax';

export default Object.freeze([
  TransformOldBindingSyntax,
  TransformItemClass,
  TransformAngleBracketComponents,
  TransformInputOnToOnEvent,
  TransformTopLevelComponents,
  DeprecateRenderModel,
  TransformInlineLinkTo,
  TransformOldClassBindingSyntax
]);
