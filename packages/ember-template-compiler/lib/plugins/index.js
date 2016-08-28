import TransformOldBindingSyntax from './transform-old-binding-syntax';
import TransformItemClass from './transform-item-class';
import TransformAngleBracketComponents from './transform-angle-bracket-components';
import TransformInputOnToOnEvent from './transform-input-on-to-onEvent';
import TransformTopLevelComponents from './transform-top-level-components';
import TransformInlineLinkTo from './transform-inline-link-to';
import TransformOldClassBindingSyntax from './transform-old-class-binding-syntax';
import DeprecateRenderModel from './deprecate-render-model';
import AssertReservedNamedArguments from './assert-reserved-named-arguments';

export default Object.freeze([
  TransformOldBindingSyntax,
  TransformItemClass,
  TransformAngleBracketComponents,
  TransformInputOnToOnEvent,
  TransformTopLevelComponents,
  TransformInlineLinkTo,
  TransformOldClassBindingSyntax,
  DeprecateRenderModel,
  AssertReservedNamedArguments
]);
